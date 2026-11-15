import React, { useMemo, useRef, useState } from "react";
import Editor, { DiffEditor, type Monaco } from "@monaco-editor/react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Code2,
  CornerDownLeft,
  Cpu,
  FileCode2,
  FolderOpen,
  GitBranch,
  GitCompare,
  Play,
  RefreshCw,
  Search,
  Terminal as TerminalIcon,
  Trash2,
  X,
} from "lucide-react";
import { configureDeepTraceMonaco } from "../lib/monacoSetup";
import {
  ConsoleLogEntry,
  ConsoleTab,
  WorkbenchTabId,
  WorkspaceFile,
} from "../types/workspace";

interface RightWorkbenchProps {
  activeTab: WorkbenchTabId;
  onSelectTab: (tab: WorkbenchTabId) => void;
  files: WorkspaceFile[];
  activeFile: WorkspaceFile;
  onSelectFile: (fileId: string) => void;
  onUpdateFileContent: (fileId: string, content: string) => void;
  onAcceptPatch: (fileId: string) => void;
  onRejectPatch: (fileId: string) => void;
  onRunFridaScript: (file: WorkspaceFile) => void;
  onSyncSymbols: (file: WorkspaceFile) => void;
  logs: ConsoleLogEntry[];
  onExecuteCommand: (cmd: string, channel: ConsoleTab) => void;
  onClearLogs: () => void;
  onSendLogsToAi: (logsText: string) => void;
  sliceHops: number;
}

export const RightWorkbench: React.FC<RightWorkbenchProps> = ({
  activeTab,
  onSelectTab,
  files,
  activeFile,
  onSelectFile,
  onUpdateFileContent,
  onAcceptPatch,
  onRejectPatch,
  onRunFridaScript,
  onSyncSymbols,
  logs,
  onExecuteCommand,
  onClearLogs,
  onSendLogsToAi,
  sliceHops,
}) => {
  const [fileQuery, setFileQuery] = useState("");
  const [consoleChannel, setConsoleChannel] = useState<ConsoleTab>("frida");
  const [command, setCommand] = useState("");
  const logsEndRef = useRef<HTMLDivElement>(null);

  const pendingDiffFiles = useMemo(
    () => files.filter((f) => Boolean(f.modifiedContent)),
    [files]
  );
  const errorLogs = useMemo(
    () => logs.filter((l) => l.level === "error"),
    [logs]
  );

  const filteredFiles = useMemo(() => {
    const q = fileQuery.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.path.toLowerCase().includes(q) ||
        f.symbols.some((s) => s.name.toLowerCase().includes(q))
    );
  }, [files, fileQuery]);

  const visibleLogs = useMemo(() => {
    if (consoleChannel === "terminal") return logs;
    return logs.filter((l) => l.source === consoleChannel || l.level === "error");
  }, [logs, consoleChannel]);

  const handleBeforeMount = (monaco: Monaco) => {
    configureDeepTraceMonaco(monaco);
  };

  const tabs: {
    id: WorkbenchTabId;
    label: string;
    icon: React.ReactNode;
    dot?: "warn" | "danger";
  }[] = [
    { id: "editor", label: "Code", icon: <Code2 className="w-3.5 h-3.5" /> },
    {
      id: "diff",
      label: `Review${pendingDiffFiles.length > 0 ? ` (${pendingDiffFiles.length})` : ""}`,
      icon: <GitCompare className="w-3.5 h-3.5" />,
      dot: pendingDiffFiles.length > 0 ? "warn" : undefined,
    },
    { id: "symbols", label: "Symbols", icon: <GitBranch className="w-3.5 h-3.5" /> },
    { id: "files", label: "Files", icon: <FolderOpen className="w-3.5 h-3.5" /> },
    {
      id: "terminal",
      label: "Terminal",
      icon: <TerminalIcon className="w-3.5 h-3.5" />,
      dot: errorLogs.length > 0 ? "danger" : undefined,
    },
  ];

  const handleRunCmd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    onExecuteCommand(trimmed, consoleChannel);
    setCommand("");
    window.setTimeout(() => {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 30);
  };

  const handleSendErrors = () => {
    const snippet = (errorLogs.length > 0 ? errorLogs : visibleLogs.slice(-5))
      .map((l) => `[${l.timestamp}] ${l.text}`)
      .join("\n");
    if (snippet) {
      onSendLogsToAi(snippet);
    }
  };

  const diffTarget = activeFile.modifiedContent
    ? activeFile
    : pendingDiffFiles[0] ?? activeFile;

  return (
    <aside className="right-workbench h-full bg-[#16161a] flex flex-col min-w-0 overflow-hidden transition-opacity duration-150">
      {/* Sunken Tab Strip (Aetox Workbench Pattern) */}
      <div className="bg-[#131316] border-b border-[#2a2a2e] px-2.5 flex items-center gap-1 overflow-x-auto select-none shrink-0">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`my-1.5 px-2 py-1.5 rounded-lg text-[12px] flex items-center gap-1.5 transition-colors shrink-0 ${
                isActive
                  ? "bg-[#1f1f23] text-[#f2f2f3] font-medium shadow-[inset_0_0_0_1px_#3a3a40]"
                  : "text-[#b0b3b8] hover:text-[#f2f2f3] hover:bg-[#1f1f23]/60"
              }`}
            >
              <span className={isActive ? "text-[#35d0e0]" : "text-[#7d8087]"}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {tab.dot && (
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tab.dot === "danger" ? "bg-[#f85149]" : "bg-[#d29922]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Workbench Content */}
      <div className="flex-1 min-h-0 flex flex-col bg-[#0f0f11]">
        {/* TAB 1: CODE EDITOR */}
        {activeTab === "editor" && (
          <>
            <div className="px-3 py-2 bg-[#131316] border-b border-[#222226] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11.5px] text-[#b0b3b8] truncate">
                  {activeFile.path}
                </span>
                <span className="text-[10.5px] font-mono text-[#7d8087] px-1.5 py-0.5 rounded bg-[#1f1f23]">
                  {activeFile.language}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {activeFile.modifiedContent && (
                  <button
                    type="button"
                    onClick={() => onSelectTab("diff")}
                    className="px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#3a3a40] text-[11.5px] text-[#f2f2f3] flex items-center gap-1.5"
                  >
                    <GitCompare className="w-3 h-3 text-[#d29922]" />
                    ดู Diff
                  </button>
                )}

                {(activeFile.category === "native-c" ||
                  activeFile.category === "java" ||
                  activeFile.category === "arm64") && (
                  <button
                    type="button"
                    onClick={() => onSyncSymbols(activeFile)}
                    className="px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[11.5px] text-[#b0b3b8] hover:text-[#f2f2f3] flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3 text-[#35d0e0]" />
                    Sync {activeFile.category === "java" ? "JADX" : "Ghidra"}
                  </button>
                )}

                {activeFile.category === "frida" && (
                  <button
                    type="button"
                    onClick={() => onRunFridaScript(activeFile)}
                    className="px-2.5 py-1 rounded-md bg-[#2f6bff] hover:bg-[#3b78ff] text-[11.5px] font-medium text-white flex items-center gap-1.5"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    รัน Frida
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <Editor
                key={`wb-editor-${activeFile.id}`}
                height="100%"
                language={activeFile.language}
                value={activeFile.content}
                theme="deeptrace-dark"
                keepCurrentModel
                beforeMount={handleBeforeMount}
                onChange={(val) => {
                  if (typeof val === "string") {
                    onUpdateFileContent(activeFile.id, val);
                  }
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 12.5,
                  fontFamily:
                    "Cascadia Code, JetBrains Mono, Consolas, monospace",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  occurrencesHighlight: "off",
                  selectionHighlight: false,
                  renderValidationDecorations: "off",
                  codeLens: false,
                  maxTokenizationLineLength: 2000,
                  stopRenderingLineAfter: 2000,
                  renderWhitespace: "none",
                }}
              />
            </div>
          </>
        )}

        {/* TAB 2: REVIEW DIFF */}
        {activeTab === "diff" && (
          <>
            {pendingDiffFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-[#7d8087] space-y-2">
                <GitCompare className="w-7 h-7 text-[#56585f]" />
                <div className="text-[13.5px] text-[#b0b3b8] font-medium">
                  ไม่มีแพตช์รอตรวจสอบ
                </div>
                <p className="text-[12px] max-w-[30ch]">
                  เมื่อ Agent เสนอแก้สคริปต์ Frida หรือเปลี่ยนชื่อ Symbol ระบบจะขึ้นเทียบ Side-by-Side ให้ตรวจที่นี่
                </p>
              </div>
            ) : (
              <>
                {/* Pending Diff Selector */}
                <div className="px-3 py-2 bg-[#131316] border-b border-[#222226] flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {pendingDiffFiles.map((file) => {
                      const active = file.id === diffTarget.id;
                      return (
                        <button
                          key={file.id}
                          type="button"
                          onClick={() => onSelectFile(file.id)}
                          className={`px-2 py-1 rounded text-[11.5px] font-mono transition-colors ${
                            active
                              ? "bg-[#1f1f23] text-[#f2f2f3] border border-[#3a3a40]"
                              : "text-[#7d8087] hover:text-[#b0b3b8]"
                          }`}
                        >
                          {file.name}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onAcceptPatch(diffTarget.id)}
                      className="px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#3fb950]/50 text-[#9ff0ad] text-[11.5px] font-medium flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                      Apply Patch
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectPatch(diffTarget.id)}
                      className="px-2 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[#b0b3b8] hover:text-[#f85149] text-[11.5px] flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      Discard
                    </button>
                  </div>
                </div>

                {diffTarget.patchSummary && (
                  <div className="px-3 py-2 bg-[#16161a] border-b border-[#222226] text-[12px] text-[#b0b3b8]">
                    {diffTarget.patchSummary}
                  </div>
                )}

                <div className="flex-1 min-h-0">
                  <DiffEditor
                    key={`wb-diff-${diffTarget.id}`}
                    height="100%"
                    language={diffTarget.language}
                    original={diffTarget.content}
                    modified={diffTarget.modifiedContent ?? diffTarget.content}
                    theme="deeptrace-dark"
                    keepCurrentOriginalModel
                    keepCurrentModifiedModel
                    beforeMount={handleBeforeMount}
                    options={{
                      renderSideBySide: true,
                      useInlineViewWhenSpaceIsLimited: true,
                      minimap: { enabled: false },
                      fontSize: 12.5,
                      fontFamily:
                        "Cascadia Code, JetBrains Mono, Consolas, monospace",
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      occurrencesHighlight: "off",
                      selectionHighlight: false,
                      renderValidationDecorations: "off",
                      codeLens: false,
                      stopRenderingLineAfter: 2000,
                      renderWhitespace: "none",
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* TAB 3: JNI & SYMBOLS INSPECTOR */}
        {activeTab === "symbols" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* 3-Hop Call Graph Slice Card */}
            <div className="rounded-xl bg-[#16161a] border border-[#2a2a2e] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-semibold text-[#f2f2f3] flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-[#35d0e0]" />
                  <span>Smart Context Slice ({sliceHops}-Hop Call Graph)</span>
                </div>
                <span className="text-[11px] font-mono text-[#7d8087]">
                  1,420 tokens
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-mono">
                <button
                  type="button"
                  onClick={() => {
                    onSelectFile("java-crypto");
                    onSelectTab("editor");
                  }}
                  className="px-2 py-1 rounded bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[#b0b3b8]"
                >
                  CryptoManager.a
                </button>
                <ArrowRight className="w-3 h-3 text-[#56585f]" />
                <button
                  type="button"
                  onClick={() => {
                    onSelectFile("smali-sign");
                    onSelectTab("editor");
                  }}
                  className="px-2 py-1 rounded bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[#b0b3b8]"
                >
                  SignInterceptor.nativeSign
                </button>
                <ArrowRight className="w-3 h-3 text-[#56585f]" />
                <button
                  type="button"
                  onClick={() => {
                    onSelectFile("native-c-jni");
                    onSelectTab("editor");
                  }}
                  className="px-2 py-1 rounded bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[#35d0e0]"
                >
                  0x14720 (JNI)
                </button>
                <ArrowRight className="w-3 h-3 text-[#56585f]" />
                <button
                  type="button"
                  onClick={() => {
                    onSelectFile("native-arm64");
                    onSelectTab("editor");
                  }}
                  className="px-2 py-1 rounded bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[#cfe0ff]"
                >
                  0x14A80 (sub_14A80)
                </button>
              </div>
            </div>

            {/* Symbols Table across Artifacts */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7d8087]">
                  Exported Symbols, JNI & Xrefs
                </span>
                <button
                  type="button"
                  onClick={() => onSyncSymbols(activeFile)}
                  className="text-[11.5px] text-[#35d0e0] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Sync Active to MCP
                </button>
              </div>

              <div className="space-y-1.5">
                {files.flatMap((file) =>
                  file.symbols.map((sym) => (
                    <button
                      key={`${file.id}-${sym.name}`}
                      type="button"
                      onClick={() => {
                        onSelectFile(file.id);
                        onSelectTab("editor");
                      }}
                      className="w-full text-left p-3 rounded-xl bg-[#16161a] hover:bg-[#1f1f23] border border-[#222226] hover:border-[#2a2a2e] transition-colors flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[12px] text-[#f2f2f3] truncate">
                          {sym.name}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-[#7d8087] shrink-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              sym.syncStatus === "synced"
                                ? "bg-[#3fb950]"
                                : sym.syncStatus === "pending"
                                ? "bg-[#d29922]"
                                : "bg-[#56585f]"
                            }`}
                          />
                          {sym.syncStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono text-[#7d8087]">
                        <span>{sym.address ?? file.name}</span>
                        <span className="uppercase text-[#56585f]">{sym.kind}</span>
                      </div>
                      <div className="text-[11px] text-[#7d8087] truncate">
                        Xrefs: {sym.xrefs.join(" · ")}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ARTIFACT FILES TREE */}
        {activeTab === "files" && (
          <div className="flex-1 flex flex-col min-h-0 p-3 space-y-3">
            <div className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-[#16161a] border border-[#222226] focus-within:border-[#3a3a40]">
              <Search className="w-3.5 h-3.5 text-[#56585f]" />
              <input
                type="text"
                value={fileQuery}
                onChange={(e) => setFileQuery(e.target.value)}
                placeholder="กรองไฟล์ Java, Smali, .so, Frida..."
                className="flex-1 bg-transparent text-[12.5px] text-[#f2f2f3] placeholder:text-[#7d8087] outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredFiles.map((file) => {
                const isActive = file.id === activeFile.id;
                const hasDiff = Boolean(file.modifiedContent);
                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => {
                      onSelectFile(file.id);
                      onSelectTab(hasDiff ? "diff" : "editor");
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center justify-between gap-2 transition-colors ${
                      isActive
                        ? "bg-[#132033] text-[#cfe0ff]"
                        : "text-[#b0b3b8] hover:bg-[#1c1c20] hover:text-[#f2f2f3]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {file.category === "native-c" || file.category === "arm64" ? (
                        <Cpu className="w-4 h-4 text-[#7d8087] shrink-0" />
                      ) : file.category === "frida" ? (
                        <TerminalIcon className="w-4 h-4 text-[#35d0e0] shrink-0" />
                      ) : (
                        <FileCode2 className="w-4 h-4 text-[#7d8087] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-mono text-[12px] truncate">
                          {file.name}
                        </div>
                        <div className="text-[10.5px] text-[#56585f] truncate">
                          {file.path}
                        </div>
                      </div>
                    </div>
                    {hasDiff && (
                      <span className="text-[11px] font-mono text-[#d29922] shrink-0">
                        M
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: INTEGRATED RE TERMINAL */}
        {activeTab === "terminal" && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Channel Pills & Send Errors to AI */}
            <div className="px-3 py-2 bg-[#131316] border-b border-[#222226] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1">
                {(["frida", "adb", "mcp", "terminal"] as ConsoleTab[]).map(
                  (ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setConsoleChannel(ch)}
                      className={`px-2 py-1 rounded text-[11.5px] font-mono transition-colors ${
                        consoleChannel === ch
                          ? "bg-[#1f1f23] text-[#f2f2f3] border border-[#3a3a40]"
                          : "text-[#7d8087] hover:text-[#b0b3b8]"
                      }`}
                    >
                      {ch === "terminal" ? "all" : ch}
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleSendErrors}
                  className="px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#3a3a40] text-[11.5px] text-[#f2f2f3] flex items-center gap-1.5"
                >
                  {errorLogs.length > 0 && (
                    <AlertTriangle className="w-3 h-3 text-[#f85149]" />
                  )}
                  <span>ส่ง Error ให้ Agent แก้</span>
                </button>
                <button
                  type="button"
                  onClick={onClearLogs}
                  className="p-1.5 rounded-md hover:bg-[#1f1f23] text-[#7d8087] hover:text-[#f2f2f3]"
                  title="ล้างหน้าจอ"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Log Stream */}
            <div className="flex-1 overflow-y-auto p-3 font-mono text-[12px] space-y-1.5">
              {visibleLogs.length === 0 ? (
                <div className="text-[#56585f]">
                  ยังไม่มี log ในช่อง {consoleChannel} — ลองพิมพ์ `adb devices` หรือ `frida`
                </div>
              ) : (
                visibleLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex gap-2.5 leading-relaxed ${
                      entry.level === "error"
                        ? "text-[#ffb3ae] bg-[#f85149]/10 px-2 py-1 rounded-md border border-[#f85149]/25"
                        : entry.level === "warn"
                        ? "text-[#d29922]"
                        : entry.level === "success"
                        ? "text-[#9ff0ad]"
                        : "text-[#b0b3b8]"
                    }`}
                  >
                    <span className="text-[#56585f] shrink-0">
                      {entry.timestamp}
                    </span>
                    <span className="whitespace-pre-wrap break-all">
                      {entry.text}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>

            {/* Command Bar */}
            <form
              onSubmit={handleRunCmd}
              className="px-3 py-2 border-t border-[#222226] bg-[#131316] flex items-center gap-2 shrink-0"
            >
              <span className="font-mono text-[12px] text-[#35d0e0] shrink-0">
                {consoleChannel}$
              </span>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="adb devices, frida -U -f ..., help, clear"
                className="flex-1 bg-transparent font-mono text-[12px] text-[#f2f2f3] placeholder:text-[#56585f] outline-none"
              />
              <button
                type="submit"
                className="p-1 text-[#7d8087] hover:text-[#f2f2f3]"
                title="Run"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
};
