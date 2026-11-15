# DeepTrace — Custom AI Desktop App for Reverse Engineering

DeepTrace is a standalone Windows Desktop AI Reverse Engineering workbench built on **Tauri v2** (Rust + React/TypeScript), **Tailwind CSS**, **Monaco Editor**, and a **Python FastAPI + MCP Host** backend.

## Architecture Overview

```text
deeptrace/
├── src/                        # React + TypeScript + Tailwind + Monaco 4-Pane UI
│   ├── components/
│   │   ├── TopTitleBar.tsx         # Target binary, MCP status pills, context slice & router bar
│   │   ├── LeftExplorerPane.tsx    # Pane 1: Java/Smali, Native .so, Frida tree & Symbol/Xref inspector
│   │   ├── CenterEditorPane.tsx    # Pane 2: Multi-tab Monaco Editor & Side-by-Side Diff Viewer
│   │   ├── RightAgentPane.tsx      # Pane 3: AI Agent Chat, Reasoning Trace, MCP Tool Calls, LLM Router
│   │   └── BottomConsolePane.tsx   # Pane 4: Frida / ADB / MCP Console with "Send Logs to AI" loop
│   ├── lib/
│   │   ├── monacoSetup.ts          # Custom Monarch tokenizers (Smali, ARM64) & deeptrace-dark theme
│   │   └── sampleWorkspace.ts      # Sample RE artifacts, MCP traces, and Frida hook diff
│   └── types/
│       └── workspace.ts            # Shared TypeScript interfaces
├── src-tauri/                  # Tauri v2 Rust Shell (workspace inspection, CLI runner, health probe)
├── backend/                    # Python FastAPI Agent Loop & MCP Host (Phase 2 & 3 foundation)
│   ├── core/
│   │   ├── config.py               # Cloud / Ollama / LM Studio routing + MCP server definitions
│   │   ├── agent_loop.py           # Smart N-hop context slicing & OpenAI-compatible loop skeleton
│   │   └── mcp_host.py             # MCP Client registry skeleton
│   ├── mcp_servers/
│   │   └── re_local_mcp.py         # Local Python MCP server (ADB, Frida runner, call-graph slicer)
│   ├── main.py                     # FastAPI server entrypoint
│   └── requirements.txt
├── PRD.md                      # Full Project Specification
└── package.json
```

## Quick Start

### 1. Install Frontend Dependencies & Run Web Dev Preview
```powershell
npm install
npm run dev
```

### 2. Run Tauri v2 Desktop App (Windows)
```powershell
npm run tauri dev
```

### 3. Run Python FastAPI Agent & MCP Host Backend (Phase 2/3)
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
uvicorn backend.main:app --port 8765 --reload
```

## Development Phases
- **Phase 1 (Implemented):** 4-pane Tauri v2 + React + Tailwind + Monaco shell with Smali, ARM64, C pseudocode, and Frida JS syntax highlighting, side-by-side AI Diff Viewer, interactive Frida/ADB console, and console-to-AI debugging loop.
- **Phase 2 (Scaffolded in `backend/`):** OpenAI-compatible streaming chat backend with dynamic Cloud / Ollama (`http://localhost:11434/v1`) / LM Studio (`http://localhost:1234/v1`) routing and custom RE system prompts.
- **Phase 3 (Scaffolded in `backend/`):** MCP Host client integration for `GhidraMCP`, `jadx-ai-mcp`, and `re-local-mcp` with bidirectional symbol sync.

## External MCP Bridge (`v0.1.0-beta.1`)
DeepTrace can also act as an **MCP Server (`deeptrace-re-bridge`)** so frontier AI orchestrators (**Antigravity**, **Claude Code**, **Codex**) can inspect 3-Hop Call Graphs and delegate RE subtasks to DeepTrace's configured sub-model & RE toolset:

```json
{
  "mcpServers": {
    "deeptrace-re-bridge": {
      "command": "python",
      "args": ["-m", "backend.mcp_servers.deeptrace_bridge_mcp"]
    }
  }
}
```

- **Preflight Check (`GET /api/mcp/bridge/preflight`)**: Verifies that a default MCP model and API key (if cloud) are configured before external orchestration starts.
- **Resource Governor (4–8GB GPU Friendly)**: Caps subprocess CPU priority (`BELOW_NORMAL_PRIORITY_CLASS` on Windows), concurrency queues, Monaco Editor highlights, and Console Ring Buffer limits so host machines stay responsive.

## What's New in `v0.1.0-beta.2`
- **Native Windows Desktop Build & Custom Logo**: Dedicated DeepTrace icon (`public/logo.png`, `src-tauri/icons/icon.ico`) bundled via Tauri v2.
- **2-Button RE Toolchain Bootstrapper (`GET /api/toolchain/scan`)**:
  1. **เช็คเครื่องมือ & ติดตั้ง (Auto-Setup)**: Automatically detects and installs missing RE essentials (`adb`, `jadx`, `apktool`, `ghidra`, `frida`) into `C:\DeepTraceTools` and updates `TOOL_INDEX.md`.
  2. **เช็คเครื่องมือ (Scan Only)**: Reports installed vs. missing tools, lets users pick a custom folder, or install selectively.
- **Thai / Non-ASCII Path Guard**: Automatically warns when a chosen install path or project folder contains Thai or non-ASCII characters and offers 1-click switching to pure ASCII `C:\DeepTraceTools` or `D:\DeepTraceTools`.
- **`reverse-skill` Master Router (`GET /api/skills/route`) & Field Journal**: Routes prompts across `apk-reverse`, `ghidra-native-reverse`, `js-vmp-reverse`, `protocol-protobuf-reverse`, `unity-il2cpp-dotnet`, and `go-rust-binary-reverse`, capturing `Evidence -> Finding -> Path` lessons in `FIELD_JOURNAL.md`.
- **SmartScreen / Antivirus Clean Separation**: Keeps `deeptrace.exe` free of packed RE binaries/UPX and provides a copyable `Add-MpPreference -ExclusionPath` command for external tools in `C:\DeepTraceTools`.
