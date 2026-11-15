"""Custom local Python MCP server for RE workspace, ADB, Frida & call-graph slicing.

Designed for Phase 3 integration with `mcp.server.fastmcp.FastMCP`.
Can also be imported directly by FastAPI helpers without starting stdio transport.
"""

from pathlib import Path
import subprocess
import sys
from typing import Any

from backend.core.agent_loop import slice_call_graph
from backend.core.config import DEFAULT_RESOURCE_GUARD


def _subprocess_creation_flags() -> int:
    """Run external tools at below-normal priority on Windows to keep UI responsive."""
    if sys.platform == "win32" and DEFAULT_RESOURCE_GUARD.below_normal_priority:
        return int(getattr(subprocess, "BELOW_NORMAL_PRIORITY_CLASS", 0x00004000))
    return 0


def _truncate_output(text: str) -> str:
    """Cap captured subprocess output so oversized logs cannot spike host RAM."""
    limit = DEFAULT_RESOURCE_GUARD.max_output_chars
    if len(text) <= limit:
        return text
    return f"{text[:limit]}\n... [truncated after {limit} chars to protect RAM]"


def get_adb_devices() -> dict[str, Any]:
    """Run `adb devices -l` safely without invoking a shell."""
    try:
        proc = subprocess.run(
            ["adb", "devices", "-l"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
            creationflags=_subprocess_creation_flags(),
        )
        return {
            "exit_code": proc.returncode,
            "stdout": _truncate_output(proc.stdout.strip()),
            "stderr": _truncate_output(proc.stderr.strip()),
        }
    except FileNotFoundError:
        return {"exit_code": -1, "stdout": "", "stderr": "adb executable not found in PATH"}


def list_workspace_files(root_dir: str, limit: int = 200) -> list[str]:
    """List workspace source/script artifacts under root_dir."""
    base = Path(root_dir).resolve()
    if not base.exists():
        return []
    results: list[str] = []
    for path in base.rglob("*"):
        if path.is_file():
            results.append(str(path.relative_to(base)))
            if len(results) >= limit:
                break
    return results


def build_call_graph_slice(
    entry_symbol: str,
    adjacency: dict[str, list[str]],
    max_hops: int = 3,
) -> dict[str, Any]:
    """Expose Smart Context Slicing as a structured MCP tool payload."""
    sliced = slice_call_graph(entry_symbol=entry_symbol, adjacency=adjacency, max_hops=max_hops)
    return {
        "entry": sliced.entry_symbol,
        "hops": sliced.max_hops,
        "symbols": sliced.visited_symbols,
        "edges": sliced.edges,
    }


def run_frida_diagnostic(
    package_name: str,
    script_path: str,
    timeout_sec: int = DEFAULT_RESOURCE_GUARD.subprocess_timeout_sec,
) -> dict[str, Any]:
    """Execute a short non-interactive Frida run with CPU priority and output caps."""
    resolved = Path(script_path).resolve()
    if not resolved.is_file():
        return {"exit_code": -1, "stdout": "", "stderr": f"Script not found: {resolved}"}

    clamped_timeout = max(1, min(timeout_sec, DEFAULT_RESOURCE_GUARD.subprocess_timeout_sec))
    try:
        proc = subprocess.run(
            ["frida", "-U", "-f", package_name, "-l", str(resolved), "--no-pause"],
            capture_output=True,
            text=True,
            timeout=clamped_timeout,
            check=False,
            creationflags=_subprocess_creation_flags(),
        )
        return {
            "exit_code": proc.returncode,
            "stdout": _truncate_output(proc.stdout),
            "stderr": _truncate_output(proc.stderr),
        }
    except FileNotFoundError:
        return {"exit_code": -1, "stdout": "", "stderr": "frida CLI not found in PATH"}
    except subprocess.TimeoutExpired as exc:
        out_raw = (
            (exc.stdout or b"").decode("utf-8", errors="replace")
            if isinstance(exc.stdout, bytes)
            else (exc.stdout or "")
        )
        err_raw = (
            (exc.stderr or b"").decode("utf-8", errors="replace")
            if isinstance(exc.stderr, bytes)
            else (exc.stderr or "")
        )
        return {
            "exit_code": 0,
            "stdout": _truncate_output(out_raw),
            "stderr": _truncate_output(err_raw),
        }
