"""External MCP Server Bridge allowing Antigravity / Claude / Codex to orchestrate DeepTrace.

Frontier AI models can connect via stdio MCP (`python -m backend.mcp_servers.deeptrace_bridge_mcp`)
or via FastAPI HTTP endpoints to inspect N-hop call graphs, check API key readiness, and
delegate focused RE subtasks to DeepTrace's configured worker model + RE toolset.
"""

import os
from typing import Any

from backend.core.agent_loop import slice_call_graph
from backend.core.config import DEFAULT_LLM_ROUTES

DEFAULT_SAMPLE_ADJACENCY: dict[str, list[str]] = {
    "CryptoManager.a": ["SignInterceptor.signRequest"],
    "SignInterceptor.signRequest": ["SignInterceptor.nativeSign"],
    "SignInterceptor.nativeSign": ["Java_com_target_security_SignInterceptor_nativeSign"],
    "Java_com_target_security_SignInterceptor_nativeSign": ["FUN_00014a80"],
    "FUN_00014a80": ["EVP_MAC_CTX_new", "sub_14CE0"],
}


def check_mcp_bridge_readiness(route_id: str) -> dict[str, Any]:
    """Verify a default MCP worker model and API key (if cloud) are configured."""
    clean_id = (route_id or "").strip()
    if not clean_id or clean_id not in DEFAULT_LLM_ROUTES:
        return {
            "ready": False,
            "error_code": "MCP_MODEL_OR_API_KEY_MISSING",
            "route_id": clean_id,
            "message_th": (
                "ยังไม่ได้ตั้งค่า API Key หรือเลือกโมเดลเริ่มต้นสำหรับ External MCP Bridge "
                "กรุณาไปที่หน้า 'โมเดล & API' ในโปรแกรม DeepTrace เพื่อใส่ API Key "
                "และเลือกโมเดลเริ่มต้นก่อนให้ Antigravity / Claude / Codex สั่งงาน"
            ),
        }

    profile = DEFAULT_LLM_ROUTES[clean_id]
    if not profile.local_only:
        api_key = os.getenv(profile.api_key_env, "").strip()
        if not api_key:
            return {
                "ready": False,
                "error_code": "MCP_MODEL_OR_API_KEY_MISSING",
                "route_id": clean_id,
                "missing_env": profile.api_key_env,
                "message_th": (
                    "ยังไม่ได้ตั้งค่า API Key หรือเลือกโมเดลเริ่มต้นสำหรับ External MCP Bridge "
                    f"({profile.name} ต้องใช้ {profile.api_key_env}) กรุณาไปที่หน้า 'โมเดล & API' "
                    "ในโปรแกรม DeepTrace เพื่อใส่ API Key และเลือกโมเดลเริ่มต้นก่อนให้ Antigravity / Claude / Codex สั่งงาน"
                ),
            }

    return {
        "ready": True,
        "route_id": profile.id,
        "model": profile.model_name,
        "base_url": profile.base_url,
        "local_only": profile.local_only,
    }


def deeptrace_delegate_re_subtask(
    instruction: str,
    entry_symbol: str = "Java_com_target_security_SignInterceptor_nativeSign",
    max_hops: int = 3,
    route_id: str = "cloud-openai",
) -> dict[str, Any]:
    """Run preflight readiness check, then slice context and stage delegated RE task."""
    readiness = check_mcp_bridge_readiness(route_id)
    if not readiness["ready"]:
        return readiness

    sliced = slice_call_graph(
        entry_symbol=entry_symbol,
        adjacency=DEFAULT_SAMPLE_ADJACENCY,
        max_hops=max_hops,
    )
    return {
        "ready": True,
        "delegated_route": readiness["route_id"],
        "worker_model": readiness["model"],
        "instruction": instruction,
        "slice": {
            "entry": sliced.entry_symbol,
            "hops": sliced.max_hops,
            "symbols": sliced.visited_symbols,
            "edges": sliced.edges,
        },
        "available_tools": ["GhidraMCP", "jadx-ai-mcp", "re-local-mcp"],
    }


def get_external_mcp_client_Registration() -> dict[str, Any]:
    """Return copyable mcpServers config for Antigravity, Claude Code, or Codex."""
    return {
        "mcpServers": {
            "deeptrace-re-bridge": {
                "command": "python",
                "args": ["-m", "backend.mcp_servers.deeptrace_bridge_mcp"],
            }
        }
    }


if __name__ == "__main__":
    try:
        from mcp.server.fastmcp import FastMCP  # type: ignore

        mcp = FastMCP("deeptrace-re-bridge")
        mcp.tool()(check_mcp_bridge_readiness)
        mcp.tool()(deeptrace_delegate_re_subtask)
        mcp.run()
    except ImportError:
        import json

        print(json.dumps(get_external_mcp_client_Registration(), indent=2))
