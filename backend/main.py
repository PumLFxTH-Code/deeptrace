"""FastAPI Agent & MCP Host entrypoint for DeepTrace (Phases 2 & 3)."""

from dataclasses import asdict
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.core.agent_loop import stream_agent_turn
from backend.core.config import (
    DEFAULT_LLM_ROUTES,
    DEFAULT_RESOURCE_GUARD,
    RE_SYSTEM_PROMPT,
)
from backend.core.mcp_host import McpHostRegistry
from backend.mcp_servers.deeptrace_bridge_mcp import (
    check_mcp_bridge_readiness,
    deeptrace_delegate_re_subtask,
    get_external_mcp_client_Registration,
)

app = FastAPI(
    title="DeepTrace RE Agent & MCP Host",
    version="0.1.0-beta.1",
    description="OpenAI-compatible LLM Router + MCP Host for Reverse Engineering",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:1420", "tauri://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

mcp_registry = McpHostRegistry()


class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    route_id: str = "ollama-local"
    system_prompt: str = RE_SYSTEM_PROMPT
    context_snippets: list[str] = Field(default_factory=list)
    neutral_framing: bool = True
    auto_failover: bool = False
    fallback_route_id: str = "ollama-local"


class BridgeDelegateRequest(BaseModel):
    instruction: str = Field(..., min_length=1)
    entry_symbol: str = "Java_com_target_security_SignInterceptor_nativeSign"
    max_hops: int = 3
    route_id: str = "cloud-openai"


@app.get("/api/health")
async def health() -> dict[str, str]:
    """Health check probed by the Tauri shell."""
    return {"status": "ok", "service": "deeptrace-backend"}


@app.get("/api/config/models")
async def list_models() -> dict[str, list[dict[str, Any]]]:
    """Return configured Cloud, Ollama, and LM Studio LLM routing profiles."""
    return {
        "routes": [asdict(profile) for profile in DEFAULT_LLM_ROUTES.values()],
    }


@app.get("/api/config/resources")
async def get_resource_guard() -> dict[str, Any]:
    """Return active CPU, RAM, and subprocess priority limits."""
    return {"resource_guard": asdict(DEFAULT_RESOURCE_GUARD)}


@app.get("/api/mcp/status")
async def get_mcp_status() -> dict[str, list[dict[str, Any]]]:
    """Return MCP Host server statuses (GhidraMCP, jadx-ai-mcp, re-local-mcp)."""
    return {"servers": mcp_registry.list_status()}


@app.get("/api/mcp/bridge/preflight")
async def mcp_bridge_preflight(route_id: str = "cloud-openai") -> dict[str, Any]:
    """Check if the external MCP bridge has a valid default model & API key configured."""
    return {
        **check_mcp_bridge_readiness(route_id),
        "client_config": get_external_mcp_client_Registration(),
    }


@app.post("/api/mcp/bridge/delegate")
async def mcp_bridge_delegate(req: BridgeDelegateRequest) -> dict[str, Any]:
    """Accept an external orchestrator (Antigravity/Claude/Codex) RE subtask."""
    return deeptrace_delegate_re_subtask(
        instruction=req.instruction,
        entry_symbol=req.entry_symbol,
        max_hops=req.max_hops,
        route_id=req.route_id,
    )


@app.post("/api/chat")
async def chat(req: ChatRequest) -> dict[str, Any]:
    """Single-turn JSON chat response wrapping the Phase 2 stream generator."""
    chunks: list[dict[str, str]] = []
    async for item in stream_agent_turn(
        prompt=req.prompt,
        route_id=req.route_id,
        system_prompt=req.system_prompt,
        context_snippets=req.context_snippets,
        neutral_framing=req.neutral_framing,
        auto_failover=req.auto_failover,
        fallback_route_id=req.fallback_route_id,
    ):
        chunks.append(item)
    return {"events": chunks}
