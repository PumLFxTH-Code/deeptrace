"""Custom local Python MCP server for RE workspace, ADB, Frida & call-graph slicing.

Designed for Phase 3 integration with `mcp.server.fastmcp.FastMCP`.
Can also be imported directly by FastAPI helpers without starting stdio transport.
"""

import os
from pathlib import Path
import shutil
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


def has_non_ascii_or_thai_path(path_str: str) -> bool:
    """Detect Thai script or any non-ASCII character that breaks native RE CLI tools."""
    return any((0x0E00 <= ord(ch) <= 0x0E7F) or ord(ch) > 127 for ch in path_str)


_TOOLCHAIN_SPECS: list[dict[str, Any]] = [
    {
        "id": "adb",
        "name": "Android Platform-Tools (ADB)",
        "commands": ["adb"],
        "rel_paths": ["platform-tools/adb.exe", "adb/adb.exe"],
        "recommended": True,
        "size_mb": 14,
    },
    {
        "id": "jadx",
        "name": "jadx-cli / jadx-gui",
        "commands": ["jadx", "jadx-gui"],
        "rel_paths": ["jadx/bin/jadx.bat", "jadx/bin/jadx"],
        "recommended": True,
        "size_mb": 38,
    },
    {
        "id": "apktool",
        "name": "Apktool",
        "commands": ["apktool"],
        "rel_paths": ["apktool/apktool.bat", "apktool/apktool.jar"],
        "recommended": True,
        "size_mb": 22,
    },
    {
        "id": "ghidra",
        "name": "Ghidra Headless + GhidraMCP",
        "commands": ["analyzeHeadless", "analyzeHeadless.bat"],
        "rel_paths": ["ghidra/support/analyzeHeadless.bat"],
        "recommended": True,
        "size_mb": 395,
    },
    {
        "id": "frida",
        "name": "Frida + frida-tools",
        "commands": ["frida", "frida-ps"],
        "rel_paths": ["frida/frida.exe", "venv/Scripts/frida.exe"],
        "recommended": True,
        "size_mb": 29,
    },
    {
        "id": "radare2",
        "name": "Radare2 / Rizin",
        "commands": ["r2", "radare2", "rizin"],
        "rel_paths": ["radare2/bin/radare2.exe"],
        "recommended": False,
        "size_mb": 42,
    },
    {
        "id": "il2cppdumper",
        "name": "Il2CppDumper",
        "commands": ["Il2CppDumper", "il2cppdumper"],
        "rel_paths": ["il2cppdumper/Il2CppDumper.exe"],
        "recommended": False,
        "size_mb": 18,
    },
]


def scan_re_toolchain(install_root: str = r"C:\DeepTraceTools") -> dict[str, Any]:
    """Scan PATH and install_root for RE CLI tools plus ASCII-only path safety."""
    root_path = Path(install_root)
    cwd = os.getcwd()
    root_non_ascii = has_non_ascii_or_thai_path(install_root)
    cwd_non_ascii = has_non_ascii_or_thai_path(cwd)

    tools: list[dict[str, Any]] = []
    for spec in _TOOLCHAIN_SPECS:
        detected = ""
        for cmd in spec["commands"]:
            found = shutil.which(cmd)
            if found:
                detected = found
                break
        if not detected:
            for rel in spec["rel_paths"]:
                candidate = root_path / rel
                if candidate.exists():
                    detected = str(candidate)
                    break

        tools.append(
            {
                "id": spec["id"],
                "name": spec["name"],
                "installed": bool(detected),
                "recommended": spec["recommended"],
                "size_mb": spec["size_mb"],
                "detected_path": detected or None,
            }
        )

    installed_count = sum(1 for item in tools if item["installed"])
    return {
        "install_root": install_root,
        "cwd": cwd,
        "install_root_non_ascii": root_non_ascii,
        "cwd_non_ascii": cwd_non_ascii,
        "path_warning": (
            "Non-ASCII or Thai characters detected in path. Native RE tools "
            "(Ghidra, jadx, apktool, Frida) often fail when paths contain non-ASCII text; "
            "use C:\\DeepTraceTools or D:\\DeepTraceTools instead."
            if (root_non_ascii or cwd_non_ascii)
            else ""
        ),
        "recommended_roots": [r"C:\DeepTraceTools", r"D:\DeepTraceTools"],
        "installed_count": installed_count,
        "missing_count": len(tools) - installed_count,
        "tools": tools,
    }
