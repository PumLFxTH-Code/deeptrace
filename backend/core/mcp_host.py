"""MCP Host registry skeleton for Phase 3 (GhidraMCP, jadx-ai-mcp, re-local-mcp)."""

from dataclasses import dataclass, field
from typing import Any

from .config import DEFAULT_MCP_SERVERS, McpServerConfig


@dataclass
class McpConnectionState:
    """Tracks live session status and discovered tools for an MCP server."""

    config: McpServerConfig
    connected: bool = False
    tools: list[dict[str, Any]] = field(default_factory=list)
    last_error: str | None = None


class McpHostRegistry:
    """Coordinates multiple external and local RE MCP servers."""

    def __init__(self, servers: list[McpServerConfig] | None = None) -> None:
        configs = servers if servers is not None else DEFAULT_MCP_SERVERS
        self._connections: dict[str, McpConnectionState] = {
            cfg.id: McpConnectionState(config=cfg) for cfg in configs
        }

    def list_status(self) -> list[dict[str, Any]]:
        """Return serializable server statuses for the DeepTrace desktop UI."""
        return [
            {
                "id": state.config.id,
                "name": state.config.name,
                "transport": state.config.transport,
                "endpoint": state.config.command_or_url,
                "description": state.config.description,
                "status": "connected" if state.connected else "disconnected",
                "toolsCount": len(state.tools),
                "lastError": state.last_error,
            }
            for state in self._connections.values()
        ]

    async def connect_all(self) -> None:
        """Phase 3 hook: initialize stdio/SSE sessions via `mcp.ClientSession`."""
        for state in self._connections.values():
            state.connected = False
            state.last_error = "Phase 3 MCP client wiring pending live server launch"

    async def call_tool(
        self, server_id: str, tool_name: str, arguments: dict[str, Any]
    ) -> dict[str, Any]:
        """Forward a tool invocation to the target MCP session."""
        if server_id not in self._connections:
            raise KeyError(f"Unknown MCP server: {server_id}")
        return {
            "server": server_id,
            "tool": tool_name,
            "arguments": arguments,
            "status": "scaffold",
        }
