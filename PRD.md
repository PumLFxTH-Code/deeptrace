# Project Brief: Custom AI Desktop App for Reverse Engineering (RE)

## 1. Objective
Build a lightweight, standalone Windows Desktop AI Agent application (similar in workflow to Antigravity / Cursor) specifically tailored for Reverse Engineering (Android APK, Smali, Native `.so` libraries, and dynamic instrumentation). The app must act as an MCP (Model Context Protocol) Host and support flexible LLM routing (both cloud OpenAI-compatible APIs and local LLMs via Ollama/LM Studio).

## 2. Core Tech Stack
- **Desktop Framework:** Tauri v2 (Rust backend + React/TypeScript frontend) for minimal RAM/VRAM overhead, OR Electron + React/TypeScript (referencing `dyad-sh/dyad` architecture).
- **UI & Code Viewer:** Tailwind CSS + Monaco Editor (configured with custom syntax highlighting for Smali, C pseudocode, ARM64/x86 Assembly, and JavaScript).
- **Agent & Backend Core:** Node.js/TypeScript or Python (FastAPI) implementing an Agentic Tool-Calling Loop + MCP Client (`@modelcontextprotocol/sdk` or Python `mcp`).
- **LLM Integration:** OpenAI-compatible API client supporting dynamic model switching (e.g., routing general static analysis to cloud APIs and sensitive/low-level binary analysis to local `http://localhost:11434/v1` Ollama or LM Studio).

## 3. UI Layout (4-Pane Workspace)
1. **Left Pane (Artifact & Project Explorer):** Tree view for decompiled project workspaces (Smali/Java sources, extracted `.so` libraries, exported functions, and saved Frida scripts).
2. **Center Pane (Multi-Tab Code & Diff Viewer):** Monaco Editor supporting side-by-side Diff view when the AI proposes script edits, patches, or code annotations.
3. **Right Pane (AI Agent Chat & Execution Trace):** Streaming chat interface displaying the Agent's reasoning steps, MCP tool invocations, token/context usage, and model selector.
4. **Bottom Pane (Integrated Console / Log Viewer):** Embedded terminal for running CLI tools (`adb`, `frida`, build scripts) with stdout/stderr capture so runtime logs can be fed back to the AI context.

## 4. Key Architecture & Workflow Features
- **MCP Host Integration:** Connect seamlessly to external RE MCP servers:
  - `GhidraMCP` (for decompiling `.so` functions, inspecting Xrefs, and renaming functions/variables).
  - `jadx-ai-mcp` (for searching classes, methods, strings, and reading decompiled Java on demand).
  - Custom local Python MCP server for workspace file operations, ADB device status, and Frida script runner/log capture.
- **Iterative Script Debugging Loop:** Allow the user to run generated Frida/diagnostic scripts in the integrated console and automatically pass runtime errors or crash logs back to the Agent to refine hooks/offsets iteratively.
- **Smart Context Slicing:** Backend utility to extract specific call graphs or targeted function blocks (3–5 levels deep) rather than dumping entire decompiled files into the prompt, preventing context overflow.
- **Bidirectional Symbol Sync:** Ability to push AI-inferred function names and comments directly back to Ghidra/JADX via MCP tools.

## 5. Initial Development Phases (For Antigravity)
- **Phase 1:** Scaffold the Tauri + React + Tailwind + Monaco Editor 4-pane desktop shell on Windows.
- **Phase 2:** Implement the OpenAI-compatible streaming chat backend with configurable base URLs (Cloud API + Local Ollama/LM Studio) and customizable System Prompts.
- **Phase 3:** Integrate the MCP Client SDK to connect local filesystem tools first, then wire up `GhidraMCP`, `jadx-ai-mcp`, and a custom Python ADB/Frida MCP server.
