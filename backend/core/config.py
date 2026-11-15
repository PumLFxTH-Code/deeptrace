"""Configuration profiles for LLM routing and MCP server connections."""

from dataclasses import dataclass, field
from typing import Literal


@dataclass(frozen=True)
class LlmRouteProfile:
    """OpenAI-compatible endpoint profile for cloud or local LLM inference."""

    id: str
    name: str
    provider: Literal["cloud", "ollama", "lmstudio"]
    base_url: str
    model_name: str
    api_key_env: str
    local_only: bool


@dataclass(frozen=True)
class McpServerConfig:
    """External or local MCP server connection descriptor."""

    id: str
    name: str
    transport: Literal["stdio", "sse"]
    command_or_url: str
    args: list[str] = field(default_factory=list)
    description: str = ""


@dataclass(frozen=True)
class ResourceGuardConfig:
    """Conservative CPU/RAM/VRAM limits so host systems (4-8GB VRAM) never freeze."""

    mode: Literal["eco-low-vram", "balanced", "performance"] = "eco-low-vram"
    max_concurrent_mcp_jobs: int = 1
    subprocess_timeout_sec: int = 12
    max_output_chars: int = 32768
    ollama_num_thread: int = 4
    ollama_num_ctx: int = 4096
    below_normal_priority: bool = True


DEFAULT_RESOURCE_GUARD = ResourceGuardConfig()


DEFAULT_LLM_ROUTES: dict[str, LlmRouteProfile] = {
    "ollama-local": LlmRouteProfile(
        id="ollama-local",
        name="Ollama Local (Sensitive Binary)",
        provider="ollama",
        base_url="http://localhost:11434/v1",
        model_name="qwen2.5-coder:32b",
        api_key_env="OLLAMA_API_KEY",
        local_only=True,
    ),
    "lmstudio-local": LlmRouteProfile(
        id="lmstudio-local",
        name="LM Studio Local (Reasoning)",
        provider="lmstudio",
        base_url="http://localhost:1234/v1",
        model_name="deepseek-r1-distill-qwen-32b",
        api_key_env="LMSTUDIO_API_KEY",
        local_only=True,
    ),
    "cloud-openai": LlmRouteProfile(
        id="cloud-openai",
        name="Cloud OpenAI-Compatible",
        provider="cloud",
        base_url="https://api.openai.com/v1",
        model_name="gpt-4.1",
        api_key_env="OPENAI_API_KEY",
        local_only=False,
    ),
}


DEFAULT_MCP_SERVERS: list[McpServerConfig] = [
    McpServerConfig(
        id="ghidra-mcp",
        name="GhidraMCP",
        transport="sse",
        command_or_url="http://127.0.0.1:8080/sse",
        description="Native .so decompilation, Xrefs, and bidirectional symbol rename.",
    ),
    McpServerConfig(
        id="jadx-ai-mcp",
        name="jadx-ai-mcp",
        transport="stdio",
        command_or_url="jadx-mcp-server",
        description="APK Java/Smali search, class inspection, and method source retrieval.",
    ),
    McpServerConfig(
        id="re-local-mcp",
        name="re-local-mcp",
        transport="stdio",
        command_or_url="python",
        args=["-m", "backend.mcp_servers.re_local_mcp"],
        description="Workspace file operations, ADB device check, Frida runner, call graph slicer.",
    ),
]

RE_SYSTEM_PROMPT = """You are DeepTrace, an AI Reverse Engineering Specialist.
Use MCP tools (GhidraMCP, jadx-ai-mcp, re-local-mcp) to inspect only the minimal N-hop call graph required.
Always propose minimal diffs for Frida scripts or symbol renames, and correlate runtime stderr with static offsets."""
