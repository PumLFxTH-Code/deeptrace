import React, { useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Cpu,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Gauge,
  GitBranch,
  Info,
  KeyRound,
  Lock,
  PanelLeft,
  PanelRight,
  Plug,
  Plus,
  RotateCcw,
  SendHorizontal,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Square,
  Terminal as TerminalIcon,
  Wrench,
  X,
} from "lucide-react";
import {
  AgentMessage,
  DeskId,
  ExternalMcpBridgeConfig,
  GuardrailFailoverConfig,
  LearnedScope,
  LlmEndpointConfig,
  McpServerStatus,
  PermissionMode,
  ProjectMemoryDoc,
  ProviderCatalogEntry,
  ReSkillPreset,
  ReSpecialistAgent,
  ResourceGovernorConfig,
  ResourceMode,
  SettingsModalTab,
  ToolchainState,
  WorkspaceFile,
} from "../types/workspace";

interface CenterWorkspaceCardProps {
  activeDesk: DeskId;
  onSelectDesk: (desk: DeskId) => void;
  settingsModalTab: SettingsModalTab | null;
  isFirstRunModal: boolean;
  onOpenSettingsModal: (tab: SettingsModalTab) => void;
  onCloseSettingsModal: () => void;
  sessionTitle: string;
  sidebarCollapsed: boolean;
  workbenchCollapsed: boolean;
  onToggleSidebar: () => void;
  onToggleWorkbench: () => void;
  onNewSession: () => void;
  pendingDiffCount: number;
  // Chat & Agent
  messages: AgentMessage[];
  isStreaming: boolean;
  onSendPrompt: (prompt: string) => void;
  onRetryLastPrompt: (promptText?: string) => void;
  onStopStreaming: () => void;
  endpoints: LlmEndpointConfig[];
  selectedEndpointId: string;
  onSelectEndpoint: (id: string) => void;
  permissionMode: PermissionMode;
  onChangePermissionMode: (mode: PermissionMode) => void;
  sliceHops: number;
  onChangeSliceHops: (hops: number) => void;
  activeFile: WorkspaceFile;
  onInspectFileInWorkbench: (fileId: string, openDiff?: boolean) => void;
  // Capabilities (MCP + Skills)
  mcpServers: McpServerStatus[];
  onToggleMcpServer: (id: string) => void;
  reSkills: ReSkillPreset[];
  onToggleSkill: (id: string) => void;
  // Specialists
  specialists: ReSpecialistAgent[];
  onLaunchSpecialist: (agent: ReSpecialistAgent) => void;
  // Memory (.md) & Self-Learning
  memoryDocs: ProjectMemoryDoc[];
  activeMemoryId: string;
  onSelectMemoryDoc: (id: string) => void;
  onUpdateMemoryDoc: (id: string, content: string) => void;
  onCreateMemoryDoc: (filename: string) => void;
  onApproveLearned: (msgId: string, scope?: LearnedScope) => void;
  onRejectLearned: (msgId: string) => void;
  // Global Provider Catalog & Anti-Guardrail Failover
  providers: ProviderCatalogEntry[];
  onUpdateProvider: (id: string, patch: Partial<ProviderCatalogEntry>) => void;
  onUseProviderRoute: (provider: ProviderCatalogEntry) => void;
  failoverConfig: GuardrailFailoverConfig;
  onUpdateFailoverConfig: (patch: Partial<GuardrailFailoverConfig>) => void;
  onTestFailover: () => void;
  resourceConfig: ResourceGovernorConfig;
  onUpdateResourceConfig: (patch: Partial<ResourceGovernorConfig>) => void;
  externalMcpConfig: ExternalMcpBridgeConfig;
  onUpdateExternalMcpConfig: (patch: Partial<ExternalMcpBridgeConfig>) => void;
  onSimulateExternalMcpCall: () => void;
  onCopySelfMcpPayload?: () => void;
  // RE Toolchain Scanner & Installer + Thai Path Guard
  toolchain: ToolchainState;
  onChangeInstallRoot: (root: string) => void;
  onScanToolchainOnly: () => void;
  onCheckAndInstallToolchain: () => void;
  onInstallSingleTool: (toolId: string) => void;
}

const PERMISSION_OPTIONS: {
  id: PermissionMode;
  label: string;
  badge?: string;
  desc: string;
}[] = [
  {
    id: "request-review",
    label: "Request Review",
    desc: "Every command requires approval.",
  },
  {
    id: "default",
    label: "Default",
    desc: "Ask before sensitive operations.",
  },
  {
    id: "auto",
    label: "Auto",
    desc: "Automatically decide if commands run.",
  },
  {
    id: "turbo",
    label: "Turbo",
    badge: "Default",
    desc: "Run all commands without restrictions.",
  },
];

const LEARNED_SCOPE_OPTIONS: { id: LearnedScope; label: string }[] = [
  { id: "project:target_app", label: "โปรเจกต์ target_app (TARGET.md)" },
  { id: "mode:re-playbook", label: "Playbook สาย RE (PLAYBOOK.md)" },
  { id: "user:profile", label: "โปรไฟล์นักวิเคราะห์ (User)" },
  { id: "machine:toolchain", label: "เครื่องมือในเครื่อง (ADB/Frida)" },
];

function renderPermissionIcon(mode: PermissionMode, className = "w-4 h-4"): React.ReactNode {
  switch (mode) {
    case "request-review":
      return <Eye className={className} />;
    case "default":
      return <Lock className={className} />;
    case "auto":
      return <Shield className={className} />;
    case "turbo":
      return <ShieldAlert className={className} />;
  }
}

function renderFormattedLine(text: string): React.ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-semibold text-[#f2f2f3]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-[#1c1c21] border border-[#2c2c32] font-mono text-[12.5px] text-[#e4e4e7]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export const CenterWorkspaceCard: React.FC<CenterWorkspaceCardProps> = ({
  activeDesk,
  onSelectDesk,
  settingsModalTab,
  isFirstRunModal,
  onOpenSettingsModal,
  onCloseSettingsModal,
  sessionTitle,
  sidebarCollapsed,
  workbenchCollapsed,
  onToggleSidebar,
  onToggleWorkbench,
  onNewSession,
  pendingDiffCount,
  messages,
  isStreaming,
  onSendPrompt,
  onRetryLastPrompt,
  onStopStreaming,
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  permissionMode,
  onChangePermissionMode,
  sliceHops,
  onChangeSliceHops,
  activeFile,
  onInspectFileInWorkbench,
  mcpServers,
  onToggleMcpServer,
  reSkills,
  onToggleSkill,
  specialists,
  onLaunchSpecialist,
  memoryDocs,
  activeMemoryId,
  onSelectMemoryDoc,
  onUpdateMemoryDoc,
  onCreateMemoryDoc,
  onApproveLearned,
  onRejectLearned,
  providers,
  onUpdateProvider,
  onUseProviderRoute,
  failoverConfig,
  onUpdateFailoverConfig,
  onTestFailover,
  resourceConfig,
  onUpdateResourceConfig,
  externalMcpConfig,
  onUpdateExternalMcpConfig,
  onSimulateExternalMcpCall,
  onCopySelfMcpPayload,
  toolchain,
  onChangeInstallRoot,
  onScanToolchainOnly,
  onCheckAndInstallToolchain,
  onInstallSingleTool,
}) => {
  const [draft, setDraft] = useState("");
  const [expandedThinking, setExpandedThinking] = useState<Record<string, boolean>>({});
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [permMenuOpen, setPermMenuOpen] = useState(false);
  const [learnedScopeDrafts, setLearnedScopeDrafts] = useState<
    Record<string, LearnedScope>
  >({});
  const [apiKeyDrafts, setApiKeyDrafts] = useState<Record<string, string>>({});
  const [copiedBridgeCfg, setCopiedBridgeCfg] = useState(false);
  const [copiedPromptBundle, setCopiedPromptBundle] = useState(false);
  const [copiedCliCmd, setCopiedCliCmd] = useState(false);
  const [copiedTopbarMcp, setCopiedTopbarMcp] = useState(false);
  const [copiedDefenderCmd, setCopiedDefenderCmd] = useState(false);
  const [showDefenderGuide, setShowDefenderGuide] = useState(false);
  const [newNoteName, setNewNoteName] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selfMcpJsonConfig = JSON.stringify(
    {
      mcpServers: {
        "deeptrace-re-bridge": {
          command: "python",
          args: ["-m", "backend.mcp_servers.deeptrace_bridge_mcp"],
          env: {
            DEEPTRACE_DEFAULT_PROVIDER: externalMcpConfig.defaultProviderId,
            DEEPTRACE_DEFAULT_MODEL: externalMcpConfig.defaultModelName,
            DEEPTRACE_TOOLS_ROOT: toolchain.installRoot,
            DEEPTRACE_API_URL: "http://127.0.0.1:8000",
          },
        },
      },
    },
    null,
    2
  );

  const selfMcpCliCommand =
    "claude mcp add deeptrace-re-bridge -- python -m backend.mcp_servers.deeptrace_bridge_mcp";

  const selfMcpAiPromptBundle = [
    "# DeepTrace RE Harness — MCP Connection Bundle",
    "# นำข้อมูลด้านล่างไปวางให้ Antigravity / Claude / Codex / Cursor เพื่อเชื่อมต่อและสั่งงาน RE ผ่าน DeepTrace ได้ทันที",
    "",
    "- MCP Server Name: deeptrace-re-bridge",
    "- Stdio Command: python -m backend.mcp_servers.deeptrace_bridge_mcp",
    "- HTTP Bridge API: http://127.0.0.1:8000 (Swagger: http://127.0.0.1:8000/docs)",
    `- Default Worker Model: ${externalMcpConfig.defaultProviderId} / ${externalMcpConfig.defaultModelName}`,
    `- RE Toolchain Root (Pure ASCII): ${toolchain.installRoot}`,
    "",
    "## MCP Tools Exposed by DeepTrace:",
    "1. check_deeptrace_bridge_status() — เช็กสถานะ Bridge, Provider และ API Key พร้อมใช้งาน",
    "2. delegate_re_task_to_deeptrace(instruction, target_path, skill) — ส่งงาน RE ให้ DeepTrace จัดการ",
    "3. run_deeptrace_3hop_trace(symbol_or_header, target_apk) — ไล่สายเรียก 3-Hop (Java -> JNI -> .so -> Frida Hook)",
    "4. scan_re_toolchain(install_root) — ตรวจสอบ adb / jadx / apktool / ghidra / frida / radare2 / il2cppdumper",
    "",
    "## mcp_config.json:",
    "```json",
    selfMcpJsonConfig,
    "```",
  ].join("\n");

  const handleCopyFullMcpBundle = () => {
    if (onCopySelfMcpPayload) {
      onCopySelfMcpPayload();
    } else {
      navigator.clipboard?.writeText(selfMcpAiPromptBundle);
    }
    setCopiedPromptBundle(true);
    window.setTimeout(() => setCopiedPromptBundle(false), 1800);
  };

  useEffect(() => {
    if (!settingsModalTab) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCloseSettingsModal();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsModalTab, onCloseSettingsModal]);

  const hasNonAsciiInstallPath = /[^\x00-\x7F]/.test(toolchain.installRoot);
  const installedToolsCount = toolchain.tools.filter((t) => t.installed).length;
  const missingAnyCount = toolchain.tools.filter((t) => !t.installed).length;
  const defenderCommand = `Add-MpPreference -ExclusionPath "${toolchain.installRoot || "C:\\DeepTraceTools"}"`;

  const renderToolchainBootstrapper = () => (
    <section className="rounded-xl border border-[#28282e] bg-[#141417] p-4 space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Wrench className="w-4 h-4 text-[#a1a1aa] shrink-0" />
            <h3 className="text-[13.5px] font-semibold text-[#f4f4f5]">
              RE Toolchain Bootstrapper & Path Guard
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-[#1e1e23] border border-[#2c2c32] font-mono text-[10.5px] text-[#b4b4bc]">
              {installedToolsCount}/{toolchain.tools.length} พร้อมใช้งาน
              {missingAnyCount > 0 ? ` · ขาด ${missingAnyCount}` : ""}
            </span>
          </div>
          <p className="text-[12px] text-[#8b8e96]">
            สแกนหรือติดตั้งชุดเครื่องมือ RE (ADB, jadx, apktool, Ghidra, Frida) ลงโฟลเดอร์ ASCII เพื่อไม่ให้พาทภาษาไทยทำสคริปต์พัง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCheckAndInstallToolchain}
            className="px-3 py-1.5 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#111113] inline-flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>เช็คเครื่องมือ & ติดตั้ง</span>
          </button>
          <button
            type="button"
            onClick={onScanToolchainOnly}
            className="px-3 py-1.5 rounded-lg bg-[#1c1c20] hover:bg-[#242429] border border-[#2c2c32] text-[12px] text-[#d4d4d8] inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span>เช็คเครื่องมือ</span>
          </button>
        </div>
      </div>

      {/* Install Folder Input + ASCII / Thai Path Guard */}
      <div className="rounded-lg bg-[#101013] border border-[#242429] p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-[11.5px] font-medium text-[#b4b4bc] flex items-center gap-1.5">
            <FolderOpen className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span>โฟลเดอร์ติดตั้งชุดเครื่องมือ RE (แนะนำ Pure ASCII):</span>
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onChangeInstallRoot("C:\\DeepTraceTools")}
              className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                toolchain.installRoot === "C:\\DeepTraceTools"
                  ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                  : "bg-[#16161a] border-[#26262b] text-[#9b9ea5] hover:text-[#f4f4f5]"
              }`}
            >
              C:\DeepTraceTools (แนะนำ)
            </button>
            <button
              type="button"
              onClick={() => onChangeInstallRoot("D:\\DeepTraceTools")}
              className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                toolchain.installRoot === "D:\\DeepTraceTools"
                  ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                  : "bg-[#16161a] border-[#26262b] text-[#9b9ea5] hover:text-[#f4f4f5]"
              }`}
            >
              D:\DeepTraceTools
            </button>
            {!hasNonAsciiInstallPath && (
              <button
                type="button"
                onClick={() => onChangeInstallRoot("C:\\Users\\ฟลุ๊ค\\DeepTraceTools")}
                className="px-2 py-0.5 rounded font-mono text-[10.5px] bg-[#16161a] border border-[#26262b] text-[#8b8e96] hover:text-[#f4f4f5]"
              >
                จำลองพาทภาษาไทย
              </button>
            )}
          </div>
        </div>

        <input
          type="text"
          value={toolchain.installRoot}
          onChange={(e) => onChangeInstallRoot(e.target.value)}
          placeholder="C:\DeepTraceTools"
          className={`w-full rounded-lg bg-[#16161a] border px-3 py-1.5 text-[12.5px] font-mono outline-none transition-colors ${
            hasNonAsciiInstallPath
              ? "border-[#9a7828] text-[#e6c97a]"
              : "border-[#2a2a30] text-[#f4f4f5] focus:border-[#4b4b54]"
          }`}
        />

        {hasNonAsciiInstallPath ? (
          <div className="rounded-lg bg-[#1e1a12] border border-[#7c6122] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[#e6c97a]">
            <span>
              คำเตือน: พบตัวอักษรภาษาไทย/Non-ASCII ในพาท ({toolchain.installRoot}) — เครื่องมือสาย RE เช่น Ghidra, jadx, apktool มัก error เมื่อมีภาษาไทย กรุณาย้ายไปติดตั้งที่โฟลเดอร์ภาษาอังกฤษล้วนครับ
            </span>
            <button
              type="button"
              onClick={() => onChangeInstallRoot("C:\\DeepTraceTools")}
              className="px-2.5 py-1 rounded-md bg-[#e4e4e7] text-[#111113] font-medium text-[11.5px] hover:bg-[#f4f4f5] shrink-0"
            >
              สลับเป็น C:\DeepTraceTools ทันที
            </button>
          </div>
        ) : (
          <div className="text-[11px] font-mono text-[#9b9ea5] flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
            <span>
              พาทสะอาด (Pure ASCII) ปลอดภัยต่อ Ghidra Headless, jadx, apktool และ Frida CLI
            </span>
          </div>
        )}
      </div>

      {/* Detailed Package Matrix */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <span className="text-[#9b9ea5]">
            {toolchain.lastMode === "scan-only"
              ? `ผลสแกนล่าสุด (${toolchain.lastScanAt ?? "เมื่อครู่"}): พบ ${installedToolsCount} ตัว · ขาด ${missingAnyCount} ตัว`
              : toolchain.lastMode === "auto-setup"
              ? `ติดตั้งอัตโนมัติเรียบร้อย (${toolchain.lastScanAt ?? "เมื่อครู่"}) และอัปเดต TOOL_INDEX.md แล้ว`
              : "รายการเครื่องมือที่รองรับในชุด RE Bundle:"}
          </span>
          {missingAnyCount > 0 && (
            <button
              type="button"
              onClick={onCheckAndInstallToolchain}
              className="px-2.5 py-1 rounded-lg bg-[#242429] hover:bg-[#2c2c32] border border-[#34343c] text-[11.5px] font-medium text-[#f4f4f5] inline-flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>ติดตั้งทั้งหมดที่ขาด ({missingAnyCount})</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {toolchain.tools.map((tool) => (
            <div
              key={tool.id}
              className="rounded-lg border border-[#242429] bg-[#101013] px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      tool.installed ? "bg-[#d4d4d8]" : "bg-[#52525b]"
                    }`}
                  />
                  <span className="font-mono text-[12px] font-medium text-[#f4f4f5] truncate">
                    {tool.name}
                  </span>
                  {tool.recommended && (
                    <span className="text-[10px] font-mono text-[#8b8e96]">
                      แนะนำ
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#7d8087] truncate mt-0.5">
                  {tool.installed
                    ? `${toolchain.installRoot}\\${tool.installSubdir}\\${tool.binaryCheck}`
                    : `ขาด (${tool.sizeMb} MB) · ${tool.description}`}
                </div>
              </div>

              {tool.installed ? (
                <span className="px-2 py-0.5 rounded bg-[#1e1e23] border border-[#2c2c32] text-[#b4b4bc] font-mono text-[10.5px] shrink-0">
                  พร้อมใช้
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onInstallSingleTool(tool.id)}
                  className="px-2.5 py-1 rounded bg-[#242429] hover:bg-[#2c2c32] border border-[#34343c] text-[11px] text-[#f4f4f5] shrink-0"
                >
                  ติดตั้ง
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Windows SmartScreen / Antivirus Clean Separation Guide */}
      <div className="rounded-lg bg-[#101013] border border-[#242429] px-3 py-2.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowDefenderGuide((v) => !v)}
            className="text-[12px] font-medium text-[#e4e4e7] inline-flex items-center gap-1.5 hover:underline"
          >
            <Shield className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span>
              วิธีป้องกัน Windows Defender / SmartScreen เตือน False Positive
            </span>
            {showDefenderGuide ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(defenderCommand);
              setCopiedDefenderCmd(true);
              window.setTimeout(() => setCopiedDefenderCmd(false), 1800);
            }}
            className="px-2 py-0.5 rounded bg-[#16161a] hover:bg-[#222227] border border-[#2a2a30] text-[11px] font-mono text-[#b4b4bc]"
          >
            {copiedDefenderCmd ? "คัดลอกคำสั่ง Defender แล้ว ✓" : "คัดลอกคำสั่ง Exclusion"}
          </button>
        </div>

        {showDefenderGuide && (
          <div className="text-[12px] text-[#9b9ea5] space-y-1.5 pt-1 border-t border-[#222226]">
            <p>
              1. ตัวติดตั้ง <code className="font-mono text-[#e4e4e7]">DeepTrace.exe</code> แยกไฟล์ UI ออกจากเครื่องมือ RE (ไม่ยัด payload/UPX) เพื่อลดโอกาสถูก Antivirus มองผิดพลาด; ส่วนการเตือนครั้งแรกใน Windows SmartScreen เกิดจากไฟล์ยังไม่มี Code Signing Certificate เชิงพาณิชย์ (คลิก <em>More info → Run anyway</em>)
            </p>
            <p>
              2. เครื่องมืออย่าง <code className="font-mono text-[#e4e4e7]">frida</code> / <code className="font-mono text-[#e4e4e7]">jadx</code> มักถูก Windows Defender สแกนช้าหรือลบไฟล์บางตัว แนะนำให้รันคำสั่ง PowerShell (Admin) ด้านล่างเพื่อยกเว้นเฉพาะโฟลเดอร์เครื่องมือ:
            </p>
            <pre className="rounded bg-[#141417] border border-[#242429] px-2.5 py-1.5 font-mono text-[11px] text-[#e4e4e7] overflow-x-auto">
              {defenderCommand}
            </pre>
          </div>
        )}
      </div>
    </section>
  );

  const activeEndpoint =
    endpoints.find((e) => e.id === selectedEndpointId) ?? endpoints[0];
  const activeMemory =
    memoryDocs.find((m) => m.id === activeMemoryId) ?? memoryDocs[0];
  const activePermissionOption =
    PERMISSION_OPTIONS.find((opt) => opt.id === permissionMode) ??
    PERMISSION_OPTIONS[3];
  const mcpDefaultProvider = providers.find(
    (p) => p.id === externalMcpConfig.defaultProviderId
  );
  const isMcpBridgeReady = Boolean(
    externalMcpConfig.enabled &&
      mcpDefaultProvider &&
      (mcpDefaultProvider.category === "local" ||
        mcpDefaultProvider.apiKeyConfigured)
  );

  const renderExternalMcpBridgeSection = () => (
    <section className="rounded-xl bg-[#141417] border border-[#28282e] p-4 space-y-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-[14px] font-semibold text-[#f4f4f5] flex items-center gap-2">
            <Plug className="w-4 h-4 text-[#a1a1aa]" />
            External MCP Bridge (ให้ Antigravity / Claude / Codex เข้ามาสั่งงาน DeepTrace)
          </h2>
          <p className="text-[12.5px] text-[#8b8e96]">
            ให้โมเดลพี่ใหญ่ภายนอก (เช่น Antigravity / Claude / Codex) วางแผนและสั่งเรียกเครื่องมือ RE ใน DeepTrace ผ่านโมเดลลูกที่ตั้งค่าไว้ด้านล่าง
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              onUpdateExternalMcpConfig({
                enabled: !externalMcpConfig.enabled,
              })
            }
            className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-mono ${
              externalMcpConfig.enabled
                ? "bg-[#242429] border-[#383840] text-[#f4f4f5]"
                : "bg-[#101013] border-[#222226] text-[#7d8087]"
            }`}
          >
            {externalMcpConfig.enabled ? "Bridge ON" : "Bridge OFF"}
          </button>
          <button
            type="button"
            onClick={onSimulateExternalMcpCall}
            className="px-3 py-1 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#111113] transition-colors"
          >
            จำลอง Antigravity สั่งงานผ่าน MCP
          </button>
        </div>
      </div>

      {!isMcpBridgeReady ? (
        <div className="rounded-xl bg-[#1a1814] border border-[#5c4a24] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px]">
          <div className="flex items-start gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-[#d4b05d] shrink-0 mt-0.5" />
            <span className="text-[#e4e4e7]">
              แจ้งเตือน: ยังไม่ได้ตั้งค่า API Key สำหรับโมเดลเริ่มต้นของ MCP (
              <span className="font-mono text-[#e6c97a]">
                {mcpDefaultProvider?.name ?? "ยังไม่เลือก"}
              </span>
              ) — กรุณาใส่ API Key หรือเลือกโมเดลที่มี Key แล้วด้านล่างก่อนเปิดให้ Antigravity สั่งงาน
            </span>
          </div>
          {settingsModalTab !== "models" && (
            <button
              type="button"
              onClick={() => onOpenSettingsModal("models")}
              className="px-2.5 py-1 rounded-lg bg-[#242429] hover:bg-[#2c2c32] border border-[#34343c] text-[11.5px] font-medium text-[#f4f4f5] shrink-0"
            >
              ไปแท็บ โมเดล & API
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-[#18181c] border border-[#2c2c32] px-3.5 py-2 text-[12px] text-[#d4d4d8] flex items-center gap-2">
          <Check className="w-4 h-4 text-[#a1a1aa] shrink-0" />
          <span>
            พร้อมรับคำสั่งจาก Antigravity / Claude / Codex → ผ่านโมเดลลูก{" "}
            <span className="font-mono font-semibold text-[#f4f4f5]">
              {mcpDefaultProvider?.name} ({externalMcpConfig.defaultModelName})
            </span>
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#7d8087] mr-1">โมเดลเริ่มต้นสำหรับ MCP:</span>
          {providers
            .filter((p) =>
              ["deepseek", "openrouter", "ollama", "anthropic", "openai"].includes(
                p.id
              )
            )
            .map((p) => {
              const selected = externalMcpConfig.defaultProviderId === p.id;
              const ready = p.category === "local" || p.apiKeyConfigured;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    onUpdateExternalMcpConfig({
                      defaultProviderId: p.id,
                      defaultModelName: p.defaultModel,
                    })
                  }
                  className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-mono inline-flex items-center gap-1.5 transition-colors ${
                    selected
                      ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                      : "bg-[#101013] border-[#222226] text-[#9b9ea5] hover:text-[#f4f4f5]"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      ready ? "bg-[#d4d4d8]" : "bg-[#52525b]"
                    }`}
                  />
                  <span>{p.id}</span>
                </button>
              );
            })}
        </div>
      </div>

      {/* One-Click Copy Self MCP Connection Hub for External AI Agents */}
      <div className="rounded-lg bg-[#101013] border border-[#242429] p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-[12px] font-medium text-[#e4e4e7]">
            ข้อมูล MCP ของ DeepTrace (กดคัดลอกเพื่อนำไปโยนให้ AI เจ้าอื่นเชื่อมต่อได้ทันที)
          </div>
          <span className="text-[10.5px] font-mono text-[#7d8087]">
            Antigravity · Claude · Codex · Cursor · Windsurf
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyFullMcpBundle}
            className="px-3 py-1.5 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#111113] inline-flex items-center gap-1.5 transition-colors"
          >
            {copiedPromptBundle ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>
              {copiedPromptBundle
                ? "คัดลอกชุดข้อมูลเชื่อม MCP แล้ว ✓"
                : "คัดลอกชุดข้อมูลเชื่อม MCP ทั้งหมด (โยนให้ AI ตัวอื่น)"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(selfMcpJsonConfig);
              setCopiedBridgeCfg(true);
              window.setTimeout(() => setCopiedBridgeCfg(false), 1800);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222227] border border-[#2c2c34] text-[11.5px] font-mono text-[#d4d4d8] inline-flex items-center gap-1.5 transition-colors"
          >
            {copiedBridgeCfg ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3 h-3 text-[#a1a1aa]" />
            )}
            <span>
              {copiedBridgeCfg ? "คัดลอก JSON แล้ว ✓" : "คัดลอก mcp_config.json"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(selfMcpCliCommand);
              setCopiedCliCmd(true);
              window.setTimeout(() => setCopiedCliCmd(false), 1800);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222227] border border-[#2c2c34] text-[11.5px] font-mono text-[#d4d4d8] inline-flex items-center gap-1.5 transition-colors"
          >
            <TerminalIcon className="w-3 h-3 text-[#a1a1aa]" />
            <span>
              {copiedCliCmd ? "คัดลอก CLI แล้ว ✓" : "คัดลอกคำสั่ง CLI"}
            </span>
          </button>
        </div>

        <div className="relative rounded-lg bg-[#0d0d10] border border-[#222226] p-2.5">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(selfMcpJsonConfig);
              setCopiedBridgeCfg(true);
              window.setTimeout(() => setCopiedBridgeCfg(false), 1800);
            }}
            className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#18181c] hover:bg-[#242429] border border-[#2c2c34] text-[10.5px] font-mono text-[#b4b4bc]"
          >
            {copiedBridgeCfg ? "Copied ✓" : "Copy"}
          </button>
          <pre className="font-mono text-[11px] leading-relaxed text-[#b4b4bc] overflow-x-auto pr-14">
            {selfMcpJsonConfig}
          </pre>
        </div>
      </div>
    </section>
  );

  const enabledMcpTokens = mcpServers
    .filter((m) => m.enabled)
    .reduce((sum, m) => sum + m.tokenCost, 0);
  const enabledToolCount = mcpServers
    .filter((m) => m.enabled)
    .reduce((sum, m) => sum + m.toolsCount, 0);
  const tokenCap = 8600;
  const tokenPct = Math.min(100, Math.round((enabledMcpTokens / tokenCap) * 100));

  useEffect(() => {
    if (activeDesk === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isStreaming, activeDesk]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || isStreaming) return;
    setPlusMenuOpen(false);
    setModelMenuOpen(false);
    setPermMenuOpen(false);
    onSendPrompt(trimmed);
    setDraft("");
  };

  const deskTitle =
    activeDesk === "chat"
      ? sessionTitle
      : activeDesk === "capabilities"
      ? "ความสามารถ, MCP Servers & RE Skills"
      : activeDesk === "specialists"
      ? "เอเจนต์เฉพาะทางสาย Reverse Engineering"
      : activeDesk === "models"
      ? "ตั้งค่าโมเดล, API ค่ายทั่วโลก & ระบบกันติดการ์ด"
      : "ความจำโปรเจกต์ (Target Memory .md)";

  const renderCapabilitiesBody = () => (
    <div className="max-w-[820px] mx-auto px-6 py-5 space-y-7">
      {renderExternalMcpBridgeSection()}

      {/* Token Budget Meter */}
      <section className="rounded-xl bg-[#141417] border border-[#28282e] p-4 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-semibold text-[#f4f4f5]">
              MCP Tool Budget (Lazy Index Architecture)
            </h2>
            <p className="text-[12.5px] text-[#8b8e96]">
              สคีมาของเครื่องมือที่ยังไม่เรียกใช้จะถูกเก็บเป็นดัชนีเพื่อลดการใช้โทเค็นในทุกเทิร์น
            </p>
          </div>
          <div className="text-right font-mono">
            <div className="text-[13px] text-[#f4f4f5]">
              ~{enabledMcpTokens.toLocaleString()} / {tokenCap.toLocaleString()} tokens
            </div>
            <div className="text-[11px] text-[#7d8087]">
              {enabledToolCount} tools active
            </div>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-[#0f0f11] overflow-hidden">
          <div
            className="h-full bg-[#d4d4d8] transition-all duration-200"
            style={{ width: `${tokenPct}%` }}
          />
        </div>
      </section>

      {/* MCP Servers Shelf */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wider text-[#8b8e96] flex items-center gap-2">
            <Plug className="w-3.5 h-3.5 text-[#a1a1aa]" />
            RE MCP Servers
          </h3>
          <span className="text-[12px] text-[#7d8087]">
            {mcpServers.filter((m) => m.enabled).length} / {mcpServers.length} เชื่อมต่ออยู่
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {mcpServers.map((srv) => (
            <div
              key={srv.id}
              className={`rounded-xl border p-3.5 flex flex-col gap-2 transition-colors ${
                srv.enabled
                  ? "bg-[#141417] border-[#28282e]"
                  : "bg-[#111114] border-[#222226] opacity-85"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        srv.enabled ? "bg-[#d4d4d8]" : "bg-[#52525b]"
                      }`}
                    />
                    <span className="font-mono text-[13px] font-semibold text-[#f4f4f5] truncate">
                      {srv.name}
                    </span>
                    <span className="text-[10.5px] font-mono text-[#7d8087] uppercase">
                      {srv.transport}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-[#56585f] truncate mt-0.5">
                    {srv.endpoint}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleMcpServer(srv.id)}
                  className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors shrink-0 ${
                    srv.enabled
                      ? "bg-[#242429] border-[#383840] text-[#f4f4f5] hover:bg-[#2c2c34]"
                      : "bg-[#18181c] border-[#28282e] text-[#a1a1aa] hover:text-[#f4f4f5]"
                  }`}
                >
                  {srv.enabled ? "ปิดชั่วคราว" : "เชื่อมต่อ"}
                </button>
              </div>

              <p className="text-[12.5px] text-[#b0b3b8] leading-snug">
                {srv.why}
              </p>

              <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-[#7d8087]">
                <span>{srv.toolsCount} tools</span>
                <span>~{srv.tokenCost.toLocaleString()} tok</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* RE Skills Shelf */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[12.5px] font-semibold uppercase tracking-wider text-[#8b8e96] flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-[#a1a1aa]" />
            On-Demand RE Skills (โหลดเฉพาะเมื่อเจองานตรงสาย)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reSkills.map((skill) => (
            <div
              key={skill.id}
              className="rounded-xl bg-[#141417] border border-[#242429] p-3.5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[12.5px] font-semibold text-[#f4f4f5]">
                  {skill.name}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleSkill(skill.id)}
                  className={`px-2 py-0.5 rounded-full text-[11px] border transition-colors ${
                    skill.enabled
                      ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                      : "bg-[#101013] border-[#26262b] text-[#7d8087]"
                  }`}
                >
                  {skill.enabled ? "เปิดใช้งาน" : "ปิดไว้"}
                </button>
              </div>

              <p className="text-[12px] text-[#b0b3b8] leading-snug">
                {skill.summary}
              </p>

              <div className="flex flex-wrap gap-1 pt-0.5">
                {skill.triggers.map((trig) => (
                  <span
                    key={trig}
                    className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-[#0f0f11] border border-[#222226] text-[#7d8087]"
                  >
                    {trig}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const renderSpecialistsBody = () => (
    <div className="max-w-[820px] mx-auto px-6 py-5 space-y-5">
      <div>
        <h2 className="text-[15px] font-semibold text-[#f4f4f5]">
          เอเจนต์เฉพาะทางสาย Reverse Engineering
        </h2>
        <p className="text-[13px] text-[#8b8e96] mt-1">
          เลือกผู้เชี่ยวชาญแต่ละด้านเพื่อให้ใช้โมเดลและชุดเครื่องมือ MCP เฉพาะทางโดยไม่แบกบริบทข้ามงาน
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {specialists.map((agent) => (
          <div
            key={agent.id}
            className="rounded-xl bg-[#141417] border border-[#28282e] p-4 flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#1c1c20] border border-[#2c2c34] flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-[#d4d4d8]" />
                  </div>
                  <div>
                    <div className="text-[13.5px] font-semibold text-[#f4f4f5]">
                      {agent.name}
                    </div>
                    <div className="text-[11.5px] text-[#7d8087]">
                      {agent.role}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[12.5px] text-[#b0b3b8] leading-relaxed">
                {agent.description}
              </p>

              <div className="text-[11px] font-mono text-[#7d8087]">
                Model: <span className="text-[#d4d4d8]">{agent.modelPreference}</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool) => (
                  <span
                    key={tool}
                    className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#0f0f11] border border-[#222226] text-[#7d8087]"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLaunchSpecialist(agent)}
              className="w-full py-2 px-3 rounded-lg bg-[#242429] hover:bg-[#2c2c34] border border-[#34343c] text-[12.5px] font-medium text-[#f4f4f5] transition-colors"
            >
              สั่งงานเอเจนต์นี้
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMemoryBody = () => (
    <div className="flex-1 min-h-0 flex">
      <div className="w-56 border-r border-[#222226] bg-[#131316] p-3 flex flex-col gap-2 shrink-0">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7d8087] px-1">
          Target Memory (.md)
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {memoryDocs.map((doc) => {
            const active = doc.id === activeMemory?.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => onSelectMemoryDoc(doc.id)}
                className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors border ${
                  active
                    ? "bg-[#242429] border-[#34343c] text-[#f4f4f5]"
                    : "border-transparent text-[#b0b3b8] hover:bg-[#1c1c20]"
                }`}
              >
                <div className="font-mono text-[12px] font-medium truncate">
                  {doc.filename}
                </div>
                <div className="text-[11px] text-[#7d8087] truncate">
                  {doc.updatedAt}
                </div>
              </button>
            );
          })}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean = newNoteName.trim();
            if (!clean) return;
            onCreateMemoryDoc(clean.endsWith(".md") ? clean : `${clean}.md`);
            setNewNoteName("");
          }}
          className="flex gap-1 pt-2 border-t border-[#222226]"
        >
          <input
            type="text"
            value={newNoteName}
            onChange={(e) => setNewNoteName(e.target.value)}
            placeholder="NOTES.md"
            className="flex-1 min-w-0 px-2 py-1 rounded bg-[#0f0f11] border border-[#2a2a2e] text-[11.5px] font-mono text-[#f2f2f3] placeholder:text-[#56585f] outline-none"
          />
          <button
            type="submit"
            className="px-2 py-1 rounded bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[11.5px] text-[#f2f2f3]"
          >
            +
          </button>
        </form>
      </div>

      <div className="flex-1 flex flex-col min-w-0 p-5 space-y-3">
        {activeMemory && (
          <>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="font-mono text-[13.5px] font-semibold text-[#f4f4f5]">
                  {activeMemory.filename}
                </div>
                <div className="text-[12px] text-[#8b8e96]">
                  ไฟล์ Markdown ธรรมดา — Agent จะดึงเฉพาะหัวข้อที่เกี่ยวข้องโดยไม่ยัดทุกอย่างเข้า Prompt
                </div>
              </div>
              <span className="text-[11px] font-mono text-[#b4b4bc]">
                อัปเดตอัตโนมัติ ({activeMemory.updatedAt})
              </span>
            </div>

            <textarea
              value={activeMemory.content}
              onChange={(e) =>
                onUpdateMemoryDoc(activeMemory.id, e.target.value)
              }
              className="flex-1 min-h-[340px] w-full resize-none rounded-xl bg-[#141417] border border-[#28282e] focus:border-[#3f3f46] p-4 font-mono text-[13px] leading-relaxed text-[#f2f2f3] outline-none"
            />
          </>
        )}
      </div>
    </div>
  );

  const renderModelsBody = () => (
    <div className="max-w-[860px] mx-auto px-6 py-5 space-y-6">
      {renderExternalMcpBridgeSection()}

      {/* Hardware & Resource Governor */}
      <section className="rounded-xl bg-[#141417] border border-[#28282e] p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-[14px] font-semibold text-[#f4f4f5] flex items-center gap-2">
              <Gauge className="w-4 h-4 text-[#a1a1aa]" />
              ควบคุม CPU / RAM / การ์ดจอ 4–8GB (ป้องกันเครื่องค้างและกินไฟ 100%)
            </h2>
            <p className="text-[12.5px] text-[#8b8e96]">
              จำกัดเธรดรันงาน, ลดโหลดไฮไลต์ใน Editor, จำกัดคิว ADB/Frida และจำกัด Console Ring Buffer เพื่อให้รันคู่ JADX / Ghidra ได้ลื่นไม่ค้าง
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#1e1e23] border border-[#2c2c34] text-[11px] font-mono text-[#d4d4d8] shrink-0">
            จำกัดสูงสุด {resourceConfig.maxCpuThreads} Threads · คิว{" "}
            {resourceConfig.maxConcurrentMcpJobs} งาน
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {(
            [
              {
                id: "eco-low-vram",
                title: "Eco (การ์ดจอ 4–8GB / Cloud)",
                desc: "แนะนำ Cloud API, จำกัด CPU ≤ 4T, งานคิว 1 งาน, ประหยัด RAM สูงสุด",
                threads: 4,
                ram: 1536,
                jobs: 1,
                cap: 150,
                preferCloud: true,
              },
              {
                id: "balanced",
                title: "Balanced (งานทั่วไป)",
                desc: "จำกัด CPU ≤ 6T, RAM 2GB, คิว MCP 2 งาน เหมาะกับเครื่อง RAM 16GB",
                threads: 6,
                ram: 2048,
                jobs: 2,
                cap: 250,
                preferCloud: true,
              },
              {
                id: "performance",
                title: "Performance (เครื่องสเปกสูง)",
                desc: "เปิด CPU ≤ 8T สำหรับรันสแกนพร้อม Local 14B/32B (RAM 32GB+)",
                threads: 8,
                ram: 4096,
                jobs: 2,
                cap: 500,
                preferCloud: false,
              },
            ] as {
              id: ResourceMode;
              title: string;
              desc: string;
              threads: number;
              ram: number;
              jobs: number;
              cap: number;
              preferCloud: boolean;
            }[]
          ).map((preset) => {
            const active = resourceConfig.mode === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onUpdateResourceConfig({
                    mode: preset.id,
                    maxCpuThreads: preset.threads,
                    maxRamMb: preset.ram,
                    maxConcurrentMcpJobs: preset.jobs,
                    consoleRingBufferLimit: preset.cap,
                    preferCloudForLowVram: preset.preferCloud,
                  })
                }
                className={`text-left rounded-xl border p-3 transition-colors ${
                  active
                    ? "bg-[#242429] border-[#3f3f46]"
                    : "bg-[#101013] border-[#222226] hover:bg-[#18181d]"
                }`}
              >
                <div className="text-[12.5px] font-semibold text-[#f4f4f5]">
                  {preset.title}
                </div>
                <p className="text-[11.5px] text-[#8b8e96] mt-1 leading-snug">
                  {preset.desc}
                </p>
              </button>
            );
          })}
        </div>

        <div className="pt-2 border-t border-[#222226] flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex flex-wrap items-center gap-2 text-[#b0b3b8]">
            <span>เพดาน CPU:</span>
            {[2, 4, 6, 8].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onUpdateResourceConfig({ maxCpuThreads: t })}
                className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                  resourceConfig.maxCpuThreads === t
                    ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                    : "bg-[#0f0f11] border-[#222226] text-[#7d8087]"
                }`}
              >
                {t}T
              </button>
            ))}
            <span className="ml-2">คิวงานเบื้องหลัง:</span>
            {[1, 2].map((j) => (
              <button
                key={j}
                type="button"
                onClick={() =>
                  onUpdateResourceConfig({ maxConcurrentMcpJobs: j })
                }
                className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                  resourceConfig.maxConcurrentMcpJobs === j
                    ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                    : "bg-[#0f0f11] border-[#222226] text-[#7d8087]"
                }`}
              >
                {j} งาน
              </button>
            ))}
          </div>

          <span className="text-[11px] font-mono text-[#7d8087]">
            Console Cap: {resourceConfig.consoleRingBufferLimit} บรรทัด · Process Priority: BELOW_NORMAL
          </span>
        </div>
      </section>

      {/* Anti-Guardrail Advisory & Optional Failover Shield */}
      <section className="rounded-xl bg-[#141417] border border-[#28282e] p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-[14px] font-semibold text-[#f4f4f5] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#a1a1aa]" />
              ระบบรับมือโมเดลติดการ์ด (แนะนำโมเดลอื่น + ปุ่มรี, ไม่บังคับรัน Local)
            </h2>
            <p className="text-[12.5px] text-[#8b8e96]">
              ค่าเริ่มต้นจะแจ้งเตือนเมื่อตัวหลักติดการ์ดและให้คุณเลือกสลับไปโมเดล Cloud API อื่นหรือกดปุ่มรีส่งซ้ำได้เอง (ไม่ยัดเยียดโมเดลหนักลงเครื่อง 4–8GB)
            </p>
          </div>
          <button
            type="button"
            onClick={onTestFailover}
            className="px-3 py-1.5 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#111113] shrink-0 transition-colors"
          >
            ทดสอบแจ้งเตือนโมเดลติดการ์ด
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onUpdateFailoverConfig({
                autoFailoverOnRefusal: !failoverConfig.autoFailoverOnRefusal,
              })
            }
            className={`text-left rounded-xl border p-3 transition-colors ${
              failoverConfig.autoFailoverOnRefusal
                ? "bg-[#1e1e23] border-[#383840]"
                : "bg-[#101013] border-[#222226]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#f4f4f5]">
                Auto-Failover อัตโนมัติ (ตัวเลือกเสริม)
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  failoverConfig.autoFailoverOnRefusal
                    ? "bg-[#27272c] text-[#f4f4f5]"
                    : "bg-[#1c1c20] text-[#7d8087]"
                }`}
              >
                {failoverConfig.autoFailoverOnRefusal ? "ON" : "OFF (แนะนำ)"}
              </span>
            </div>
            <p className="text-[12px] text-[#8b8e96] mt-1 leading-snug">
              ปิดไว้เป็นค่าเริ่มต้นเพื่อให้คุณเป็นคนเลือกค่าย API ใหม่และกดปุ่มรีใต้ข้อความเอง (เปิดได้หากต้องการให้สลับไป Cloud/Local สำรองทันที)
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateFailoverConfig({
                neutralAuditFraming: !failoverConfig.neutralAuditFraming,
              })
            }
            className={`text-left rounded-xl border p-3 transition-colors ${
              failoverConfig.neutralAuditFraming
                ? "bg-[#1e1e23] border-[#383840]"
                : "bg-[#101013] border-[#222226]"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-medium text-[#f4f4f5]">
                Authorized Audit Context Framing
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                  failoverConfig.neutralAuditFraming
                    ? "bg-[#27272c] text-[#f4f4f5]"
                    : "bg-[#1c1c20] text-[#7d8087]"
                }`}
              >
                {failoverConfig.neutralAuditFraming ? "ON" : "OFF"}
              </span>
            </div>
            <p className="text-[12px] text-[#8b8e96] mt-1 leading-snug">
              แนบ metadata บริบท Local Binary Audit & Memory Safety Research อย่างตรงไปตรงมา ลด false-positive บน Cloud
            </p>
          </button>
        </div>

        <div className="pt-2 border-t border-[#222226] flex flex-wrap items-center justify-between gap-3 text-[12px]">
          <div className="flex items-center gap-2 text-[#b0b3b8]">
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span>โมเดลสำรองปลายทาง (Fallback Target):</span>
            <span className="font-mono text-[#f4f4f5] px-2 py-0.5 rounded bg-[#0f0f11] border border-[#2a2a2e]">
              {failoverConfig.fallbackProviderId} · {failoverConfig.fallbackModelName}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {providers
              .filter((p) => p.guardrailPolicy !== "strict-cloud")
              .slice(0, 4)
              .map((p) => {
                const isFallback = failoverConfig.fallbackProviderId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      onUpdateFailoverConfig({
                        fallbackProviderId: p.id,
                        fallbackModelName: p.defaultModel,
                      })
                    }
                    className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-colors ${
                      isFallback
                        ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                        : "bg-[#0f0f11] border-[#222226] text-[#7d8087] hover:text-[#f2f2f3]"
                    }`}
                  >
                    {p.id}
                  </button>
                );
              })}
          </div>
        </div>
      </section>

      {/* Grouped Global Provider Catalog */}
      {(
        [
          {
            key: "local",
            title: "รันในเครื่อง 100% (Local Offline — ไม่ติดการ์ด & ไม่หลุดออกนอกเครื่อง)",
          },
          {
            key: "aggregator",
            title: "เกตเวย์รวมหลายค่าย & บัญชีเดิม (Gateway / OAuth — ตามแนวทาง Aetox-Harness)",
          },
          {
            key: "cloud",
            title: "Cloud API ค่ายหลักทั่วโลก (OpenAI-Compatible)",
          },
        ] as const
      ).map((group) => {
        const items = providers.filter((p) => p.category === group.key);
        if (items.length === 0) return null;
        return (
          <section key={group.key} className="space-y-3">
            <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#8b8e96] flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-[#a1a1aa]" />
              <span>{group.title}</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((provider) => {
                const isFallback = failoverConfig.fallbackProviderId === provider.id;
                const policyLabel =
                  provider.guardrailPolicy === "uncensored-local"
                    ? "ไม่ติดการ์ด (Local)"
                    : provider.guardrailPolicy === "re-friendly"
                    ? "ยืดหยุ่นสาย RE"
                    : "Strict Cloud (ใช้ Failover)";

                return (
                  <div
                    key={provider.id}
                    className="rounded-xl bg-[#141417] border border-[#242429] p-3.5 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              provider.apiKeyConfigured ? "bg-[#d4d4d8]" : "bg-[#52525b]"
                            }`}
                          />
                          <span className="text-[13.5px] font-semibold text-[#f4f4f5] truncate">
                            {provider.name}
                          </span>
                        </div>
                        <div className="text-[11.5px] text-[#8b8e96] mt-0.5 leading-snug">
                          {provider.authGuide}
                        </div>
                        {provider.vramRequirement && (
                          <div className="text-[10.5px] font-mono text-[#a1a1aa] mt-1">
                            {provider.vramRequirement}
                          </div>
                        )}
                      </div>

                      <span className="px-2 py-0.5 rounded-full border border-[#2e2e36] bg-[#1a1a1f] text-[#b4b4bc] text-[10.5px] font-medium shrink-0">
                        {policyLabel}
                      </span>
                    </div>

                    <div className="space-y-1.5 pt-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono text-[#7d8087] w-14 shrink-0">
                          Base URL
                        </span>
                        <input
                          type="text"
                          value={provider.baseUrl}
                          onChange={(e) =>
                            onUpdateProvider(provider.id, {
                              baseUrl: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 px-2 py-1 rounded bg-[#0f0f11] border border-[#2a2a2e] focus:border-[#52525b] font-mono text-[11px] text-[#d4d4d8] outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono text-[#7d8087] w-14 shrink-0">
                          Model
                        </span>
                        <select
                          value={provider.defaultModel}
                          onChange={(e) =>
                            onUpdateProvider(provider.id, {
                              defaultModel: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 px-2 py-1 rounded bg-[#0f0f11] border border-[#2a2a2e] font-mono text-[11px] text-[#f4f4f5] outline-none"
                        >
                          {provider.models.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      {provider.category !== "local" && (
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-mono text-[#7d8087] w-14 shrink-0">
                            API Key
                          </span>
                          <input
                            type="password"
                            value={apiKeyDrafts[provider.id] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setApiKeyDrafts((prev) => ({
                                ...prev,
                                [provider.id]: val,
                              }));
                            }}
                            placeholder={
                              provider.apiKeyConfigured
                                ? `ตั้งค่าแล้ว (${provider.apiKeyHint})`
                                : provider.apiKeyHint
                            }
                            className="flex-1 min-w-0 px-2 py-1 rounded bg-[#0f0f11] border border-[#2a2a2e] focus:border-[#52525b] font-mono text-[11px] text-[#f4f4f5] placeholder:text-[#56585f] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const val = (
                                apiKeyDrafts[provider.id] ?? ""
                              ).trim();
                              onUpdateProvider(provider.id, {
                                apiKeyConfigured: val
                                  ? true
                                  : !provider.apiKeyConfigured,
                                apiKeyHint: val
                                  ? `${val.slice(0, 6)}...`
                                  : provider.apiKeyHint,
                              });
                              if (val) {
                                setApiKeyDrafts((prev) => ({
                                  ...prev,
                                  [provider.id]: "",
                                }));
                              }
                            }}
                            className="px-2 py-1 rounded bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[11px] text-[#d4d4d8] shrink-0"
                          >
                            {(apiKeyDrafts[provider.id] ?? "").trim()
                              ? "บันทึก"
                              : provider.apiKeyConfigured
                              ? "พร้อมใช้"
                              : "เปิดใช้"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onUseProviderRoute(provider)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#242429] hover:bg-[#2c2c34] border border-[#34343c] text-[11.5px] font-medium text-[#f4f4f5] transition-colors"
                      >
                        ใช้งานค่ายนี้ทันที
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateExternalMcpConfig({
                            defaultProviderId: provider.id,
                            defaultModelName: provider.defaultModel,
                          })
                        }
                        className={`py-1.5 px-2.5 rounded-lg border text-[11px] transition-colors shrink-0 ${
                          externalMcpConfig.defaultProviderId === provider.id
                            ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                            : "bg-[#101013] border-[#222226] text-[#7d8087] hover:text-[#f2f2f3]"
                        }`}
                      >
                        {externalMcpConfig.defaultProviderId === provider.id
                          ? "โมเดลหลัก MCP ✓"
                          : "ตั้งเป็นโมเดลหลัก MCP"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateFailoverConfig({
                            fallbackProviderId: provider.id,
                            fallbackModelName: provider.defaultModel,
                          })
                        }
                        className={`py-1.5 px-2.5 rounded-lg border text-[11px] transition-colors shrink-0 ${
                          isFallback
                            ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                            : "bg-[#101013] border-[#222226] text-[#7d8087] hover:text-[#f2f2f3]"
                        }`}
                      >
                        {isFallback ? "Fallback หลัก ✓" : "ตั้งเป็น Fallback"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );

  return (
    <main
      className="center-card"
      onClick={() => {
        if (plusMenuOpen) setPlusMenuOpen(false);
        if (modelMenuOpen) setModelMenuOpen(false);
        if (permMenuOpen) setPermMenuOpen(false);
      }}
    >
      {/* Minimal 52px Topbar inside the rounded card */}
      <header className="h-[52px] px-3.5 flex items-center gap-3 shrink-0 border-b border-[#222226]/70 select-none">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "แสดงแถบซ้าย (Ctrl+B)" : "ซ่อนแถบซ้าย (Ctrl+B)"}
          className="w-8 h-8 rounded-lg hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3] flex items-center justify-center transition-colors shrink-0"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
          <span className="text-[13.5px] font-semibold text-[#e4e4e7] truncate min-w-0">
            {deskTitle}
          </span>
          <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16161a] border border-[#242429] text-[11px] font-mono text-[#8b8e96] shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4d4d8]" />
            arm64-v8a · libnative-sign.so
          </span>
          <button
            type="button"
            onClick={() => onOpenSettingsModal("models")}
            title="ตั้งค่าควบคุม CPU / RAM / การ์ดจอ 4–8GB เพื่อป้องกันเครื่องค้าง"
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#16161a] hover:bg-[#202025] border border-[#242429] text-[11px] font-mono text-[#8b8e96] hover:text-[#f4f4f5] shrink-0 transition-colors"
          >
            <Gauge className="w-3 h-3 text-[#a1a1aa]" />
            <span>CPU ≤ {resourceConfig.maxCpuThreads}T · RAM Guard</span>
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              handleCopyFullMcpBundle();
              setCopiedTopbarMcp(true);
              window.setTimeout(() => setCopiedTopbarMcp(false), 1600);
            }}
            title="คัดลอกชุดข้อมูล MCP ของ DeepTrace ไปวางให้ AI เจ้าอื่นเชื่อมต่อได้ทันที"
            className="h-8 px-2.5 rounded-lg bg-[#18181c] hover:bg-[#242429] border border-[#27272c] text-[11.5px] font-medium text-[#d4d4d8] hover:text-[#f4f4f5] inline-flex items-center gap-1.5 transition-colors mr-1"
          >
            {copiedTopbarMcp ? (
              <Check className="w-3.5 h-3.5 text-[#f4f4f5]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#a1a1aa]" />
            )}
            <span className="hidden sm:inline">
              {copiedTopbarMcp ? "คัดลอก MCP แล้ว ✓" : "คัดลอก MCP"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenSettingsModal("toolchain")}
            title="ตั้งค่าระบบ, เช็คเครื่องมือ RE และ API (Popup)"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              settingsModalTab !== null
                ? "bg-[#242429] text-[#f4f4f5]"
                : "hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3]"
            }`}
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenSettingsModal("memory")}
            title="เปิดความจำโปรเจกต์ (.md)"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              settingsModalTab === "memory"
                ? "bg-[#242429] text-[#f4f4f5]"
                : "hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onNewSession}
            title="เริ่มเซสชันวิเคราะห์ใหม่"
            className="w-8 h-8 rounded-lg hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3] flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleWorkbench}
            title={
              workbenchCollapsed
                ? "เปิด Workbench ด้านขวา (Ctrl+J)"
                : "ซ่อน Workbench ด้านขวา (Ctrl+J)"
            }
            className="relative w-8 h-8 rounded-lg hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3] flex items-center justify-center transition-colors"
          >
            <PanelRight className="w-4 h-4" />
            {workbenchCollapsed && pendingDiffCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#e4e4e7]" />
            )}
          </button>
        </div>
      </header>

      {/* DESK 1: AGENT CHAT */}
      {activeDesk === "chat" && (
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Centered Calm Reading Stream */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[780px] mx-auto px-6 py-7 space-y-7">
              {messages.length === 0 ? (
                <div className="py-10 space-y-6">
                  <div className="space-y-1.5">
                    <div className="text-[16px] font-semibold text-[#f4f4f5]">
                      ห้องวิเคราะห์ Reverse Engineering พร้อมทำงาน
                    </div>
                    <p className="text-[13px] text-[#8b8e96] leading-relaxed">
                      เลือกงานเริ่มต้นด้านล่าง พิมพ์คำสั่งที่ช่องด้านล่าง หรือคัดลอกข้อมูล MCP เพื่อนำไปให้ AI เจ้าอื่นเชื่อมต่อเข้ามาสั่งงานเครื่องมือ RE ใน DeepTrace ได้ทันที
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        title: "แกะสายเรียก 3-Hop",
                        desc: "ไล่จาก Java → JNI → Native .so พร้อมชี้จุดซ่อนคีย์",
                        prompt: `วิเคราะห์และไล่สายเรียก 3-Hop (Java -> JNI -> Native .so) จาก ${activeFile.name} พร้อมสร้างแพตช์ Frida ที่ปลอดภัย`,
                      },
                      {
                        title: "ร่างสคริปต์ Frida Hook",
                        desc: "Interceptor ตรวจ Pointer / Arguments ไม่ให้แอพเด้ง",
                        prompt: `สร้างสคริปต์ Frida Hook แบบ Native-Safe พร้อมอ่าน pointer ใน ${activeFile.name}`,
                      },
                      {
                        title: "สแกน Secret & Crypto",
                        desc: "ตรวจ hardcoded HMAC key, nonce และ endpoint",
                        prompt: `สแกนหา hardcoded key, salt และจุดคำนวณ cryptographic signature ในโปรเจกต์ปัจจุบัน`,
                      },
                    ].map((starter) => (
                      <button
                        key={starter.title}
                        type="button"
                        onClick={() => onSendPrompt(starter.prompt)}
                        className="text-left rounded-xl bg-[#141417] hover:bg-[#1c1c20] border border-[#242429] hover:border-[#34343c] p-3.5 space-y-1 transition-colors"
                      >
                        <div className="text-[13px] font-medium text-[#f4f4f5]">
                          {starter.title}
                        </div>
                        <div className="text-[11.5px] text-[#8b8e96] leading-snug">
                          {starter.desc}
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onOpenSettingsModal("toolchain")}
                      className="px-3 py-1.5 rounded-lg bg-[#1c1c20] hover:bg-[#242429] border border-[#2c2c34] text-[12px] text-[#e4e4e7] inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-[#a1a1aa]" />
                      <span>ตั้งค่าเครื่องมือ RE & API (Popup)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyFullMcpBundle}
                      className="px-3 py-1.5 rounded-lg bg-[#1c1c20] hover:bg-[#242429] border border-[#2c2c34] text-[12px] text-[#e4e4e7] inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#a1a1aa]" />
                      <span>
                        {copiedPromptBundle
                          ? "คัดลอกข้อมูล MCP แล้ว ✓"
                          : "คัดลอกข้อมูล MCP ให้ AI ภายนอกเชื่อมต่อ"}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                if (msg.role === "user") {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl bg-[#1f1f23] border border-[#2a2a2e] px-4 py-2.5 text-[14px] leading-relaxed text-[#f2f2f3] whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  );
                }

                const thinkingOpen = Boolean(expandedThinking[msg.id]);

                return (
                  <article key={msg.id} className="space-y-3">
                    {/* Collapsed Thinking Toggle */}
                    {msg.reasoningSteps && msg.reasoningSteps.length > 0 && (
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedThinking((prev) => ({
                              ...prev,
                              [msg.id]: !prev[msg.id],
                            }))
                          }
                          className="inline-flex items-center gap-1.5 text-[12px] text-[#7d8087] hover:text-[#b0b3b8] transition-colors"
                        >
                          {thinkingOpen ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                          <span>
                            คิดเป็นเวลา {msg.thinkingDurationSec ?? 1.4}s ·{" "}
                            {msg.reasoningSteps.length} ขั้นตอน
                          </span>
                        </button>

                        {thinkingOpen && (
                          <div className="mt-2 pl-4 border-l border-[#2a2a2e] space-y-1 text-[12.5px] text-[#7d8087]">
                            {msg.reasoningSteps.map((step, idx) => (
                              <div key={idx}>{step}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quiet Compact MCP Tool Timeline */}
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="space-y-1 py-0.5">
                        {msg.toolCalls.map((tc) => (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => {
                              if (tc.targetFileId) {
                                onInspectFileInWorkbench(tc.targetFileId);
                              }
                            }}
                            className="w-full text-left flex items-center gap-2.5 py-1 px-2 -mx-2 rounded-lg hover:bg-[#16161a] transition-colors text-[12.5px] group"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                tc.status === "success"
                                  ? "bg-[#d4d4d8]"
                                  : "bg-[#a1a1aa]"
                              }`}
                            />
                            <span className="font-mono text-[#7d8087] shrink-0">
                              {tc.server}
                            </span>
                            <span className="font-mono text-[#d4d4d8] group-hover:text-[#f4f4f5] truncate">
                              {tc.toolName}
                            </span>
                            <span className="text-[#56585f] truncate hidden sm:inline">
                              — {tc.resultPreview}
                            </span>
                            <span className="ml-auto font-mono text-[11px] text-[#56585f] shrink-0">
                              {tc.durationMs}ms
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Auto-Failover Notice Banner */}
                    {msg.failoverNotice && (
                      <div className="rounded-xl bg-[#16161a] border border-[#2c2c34] px-3.5 py-2.5 flex items-start gap-2.5 text-[12.5px]">
                        <ArrowLeftRight className="w-4 h-4 text-[#a1a1aa] shrink-0 mt-0.5" />
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-medium text-[#f2f2f3] flex flex-wrap items-center gap-1.5">
                            <span>Auto-Failover (สลับโมเดลกันงานสะดุด):</span>
                            <span className="font-mono text-[11.5px] text-[#7d8087] line-through">
                              {msg.failoverNotice.fromModel}
                            </span>
                            <span className="text-[#7d8087]">→</span>
                            <span className="font-mono text-[11.5px] text-[#f4f4f5]">
                              {msg.failoverNotice.toModel}
                            </span>
                          </div>
                          <div className="text-[12px] text-[#b0b3b8]">
                            {msg.failoverNotice.reason}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Guardrail Refusal Advisory (Non-Forced, User Chooses Model & Clicks Retry) */}
                    {msg.refusalAdvisory && (
                      <div className="rounded-xl bg-[#181715] border border-[#3a362c] p-3.5 space-y-3 text-[12.5px]">
                        <div className="flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 text-[#c9b478] shrink-0 mt-0.5" />
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-medium text-[#f2f2f3]">
                              ตัว{" "}
                              <span className="font-mono text-[#e2cf95]">
                                {msg.refusalAdvisory.blockedModel}
                              </span>{" "}
                              ไม่สามารถใช้งานคำสั่งนี้ได้เนื่องจากติดการ์ดความปลอดภัย
                            </div>
                            <div className="text-[12px] text-[#b0b3b8]">
                              {msg.refusalAdvisory.reason} — ลองเลือกสลับไปยังโมเดลตัวอื่นด้านล่าง (เช่น Cloud API สำหรับเครื่องการ์ดจอ 4–8GB) แล้วกดปุ่มรีส่งซ้ำได้เลยครับ
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {msg.refusalAdvisory.suggestedProviders.map((sp) => {
                            const catProvider = providers.find((p) => p.id === sp.id);
                            const isCurrent = activeEndpoint.modelName === sp.modelName;
                            return (
                              <button
                                key={sp.id}
                                type="button"
                                onClick={() => {
                                  if (catProvider) {
                                    onUseProviderRoute({
                                      ...catProvider,
                                      defaultModel: sp.modelName,
                                    });
                                  }
                                }}
                                title={sp.vramNote}
                                className={`px-2.5 py-1 rounded-lg border text-[11.5px] transition-colors flex items-center gap-1.5 ${
                                  isCurrent
                                    ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                                    : "bg-[#101013] hover:bg-[#1f1f23] border-[#2a2a2e] text-[#d0d2d6]"
                                }`}
                              >
                                <span className="font-medium">{sp.name}</span>
                                <span className="text-[10.5px] font-mono text-[#7d8087]">
                                  {sp.vramNote}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="pt-2 border-t border-[#2a2a2e]/70 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11.5px] text-[#7d8087]">
                            โมเดลที่เลือกอยู่ตอนนี้:{" "}
                            <span className="font-mono text-[#e4e4e7]">
                              {activeEndpoint.modelName}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={isStreaming}
                            onClick={() => onRetryLastPrompt(msg.sourcePrompt)}
                            className="px-3 py-1 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#111113] inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>ลองส่งใหม่ไปยัง {activeEndpoint.modelName}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Clean Unboxed Prose Body */}
                    <div className="text-[14.5px] leading-[1.68] text-[#f2f2f3] space-y-2.5">
                      {msg.content.split("\n\n").map((block, bIdx) => (
                        <div key={bIdx} className="whitespace-pre-wrap">
                          {renderFormattedLine(block)}
                        </div>
                      ))}
                    </div>

                    {/* Subtle Turn Metadata */}
                    <div className="pt-1 flex items-center gap-3 text-[11.5px] text-[#56585f] font-mono">
                      <span>{msg.model}</span>
                      {msg.tokenUsage && (
                        <span>
                          {msg.tokenUsage.sliceHops}-Hop ({msg.tokenUsage.promptTokens}{" "}
                          in / {msg.tokenUsage.completionTokens} out)
                        </span>
                      )}
                    </div>

                    {/* Inline Self-Learning Memory Proposal Card */}
                    {msg.learnedProposal && (() => {
                      const prop = msg.learnedProposal;
                      const chosenScope = learnedScopeDrafts[msg.id] ?? prop.scope;
                      return (
                        <div className="mt-2 rounded-xl bg-[#16161a] border border-[#2a2a2e] p-3.5 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[12.5px] font-medium text-[#f2f2f3]">
                              <BrainCircuit className="w-4 h-4 text-[#a1a1aa] shrink-0" />
                              <span>Self-Learning Memory (จำไว้ใช้ลด Token รอบหน้า)</span>
                              <span className="px-2 py-0.5 rounded-full bg-[#1e1e23] border border-[#2c2c34] text-[11px] font-mono text-[#d4d4d8]">
                                ประหยัด ~{prop.tokensSavedEst.toLocaleString()} tok
                              </span>
                            </div>
                            {prop.state === "approved" && (
                              <button
                                type="button"
                                onClick={() => onOpenSettingsModal("memory")}
                                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#e4e4e7] hover:underline"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>บันทึกแล้ว (เปิดดู .md)</span>
                              </button>
                            )}
                            {prop.state === "rejected" && (
                              <span className="text-[11.5px] text-[#7d8087]">
                                ข้ามบทเรียนนี้แล้ว
                              </span>
                            )}
                          </div>

                          <div className="rounded-lg bg-[#0f0f11] border border-[#222226] px-3 py-2 font-mono text-[12px] text-[#e6e7ea] leading-relaxed">
                            {prop.ruleText}
                          </div>

                          <div className="text-[12px] text-[#7d8087] flex flex-wrap items-center justify-between gap-2">
                            <span>เหตุผล: {prop.reason}</span>
                            <span className="text-[11px] text-[#56585f]">
                              {prop.audience}
                            </span>
                          </div>

                          {prop.state === "pending" && (
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[#222226]">
                              <div className="flex items-center gap-2">
                                <span className="text-[11.5px] text-[#7d8087]">
                                  ขอบเขต:
                                </span>
                                <select
                                  value={chosenScope}
                                  onChange={(e) =>
                                    setLearnedScopeDrafts((prev) => ({
                                      ...prev,
                                      [msg.id]: e.target.value as LearnedScope,
                                    }))
                                  }
                                  className="rounded-lg bg-[#101013] border border-[#2a2a2e] px-2.5 py-1 text-[11.5px] text-[#f2f2f3] outline-none focus:border-[#52525b]"
                                >
                                  {LEARNED_SCOPE_OPTIONS.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => onRejectLearned(msg.id)}
                                  className="px-2.5 py-1 rounded-lg bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[12px] text-[#b0b3b8] inline-flex items-center gap-1 transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ไม่เก็บ</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onApproveLearned(msg.id, chosenScope)
                                  }
                                  className="px-3 py-1 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#111113] inline-flex items-center gap-1.5 transition-colors"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>บันทึกเข้าความจำ</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </article>
                );
              }))}

              {/* Latest Message Quick Retry Row (Switch Model -> Click Retry) */}
              {messages.length > 0 && !isStreaming && (
                <div className="pt-2 border-t border-[#222226]/70 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11.5px] text-[#7d8087]">
                    หากผลลัพธ์ไม่ตรงใจหรือติดการ์ด สามารถสลับโมเดลด้านล่างแล้วกดรีส่งคำสั่งล่าสุดใหม่ได้ทันที
                  </span>
                  <button
                    type="button"
                    onClick={() => onRetryLastPrompt()}
                    className="px-3 py-1 rounded-lg bg-[#16161a] hover:bg-[#1f1f23] border border-[#2a2a2e] hover:border-[#3f3f46] text-[12px] font-medium text-[#b0b3b8] hover:text-[#f2f2f3] inline-flex items-center gap-1.5 transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#d4d4d8]" />
                    <span>รีส่งซ้ำไปยัง {activeEndpoint.modelName}</span>
                  </button>
                </div>
              )}

              {isStreaming && (
                <div className="flex items-center gap-2.5 text-[13px] text-[#b0b3b8]">
                  <span className="w-2 h-2 rounded-full bg-[#d4d4d8] animate-pulse" />
                  <span>
                    กำลังเรียกเครื่องมือ MCP และวิเคราะห์ผ่าน{" "}
                    <span className="font-mono text-[#f2f2f3]">
                      {activeEndpoint.modelName}
                    </span>
                    ...
                  </span>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Floating Rounded Composer (Aetox Pattern) */}
          <div className="px-6 pb-4 pt-2 shrink-0">
            <form
              onSubmit={handleSubmit}
              className="max-w-[780px] mx-auto rounded-2xl bg-[#16161a] border border-[#2a2a2e] focus-within:border-[#3a3a40] p-3 space-y-2.5 relative transition-colors"
            >
              {/* Active Context Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onInspectFileInWorkbench(
                      activeFile.id,
                      Boolean(activeFile.modifiedContent)
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[11.5px] font-mono text-[#b0b3b8]"
                >
                  <FileText className="w-3 h-3 text-[#a1a1aa]" />
                  <span>{activeFile.name}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onChangeSliceHops(sliceHops >= 5 ? 3 : sliceHops + 1)
                  }
                  title="คลิกเพื่อปรับระดับ Call Graph Slice (3–5 Hop)"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[11.5px] font-mono text-[#b0b3b8]"
                >
                  <GitBranch className="w-3 h-3 text-[#a1a1aa]" />
                  <span>{sliceHops}-Hop Slice</span>
                </button>

                {pendingDiffCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onInspectFileInWorkbench(activeFile.id, true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[11.5px] text-[#b0b3b8]"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#d29922]" />
                    <span>{pendingDiffCount} Diff รอตรวจ</span>
                  </button>
                )}
              </div>

              {/* Textarea */}
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder={`สั่งงานวิเคราะห์ ${activeFile.name} หรือถามเกี่ยวกับ Call Graph...`}
                className="w-full resize-none bg-transparent text-[14px] leading-relaxed text-[#f2f2f3] placeholder:text-[#7d8087] outline-none"
              />

              {/* Bottom Composer Controls */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {/* Left: + Quick Actions */}
                <div className="relative flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setModelMenuOpen(false);
                      setPermMenuOpen(false);
                      setPlusMenuOpen((v) => !v);
                    }}
                    className="w-8 h-8 rounded-lg hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3] flex items-center justify-center transition-colors"
                    title="คำสั่งลัด RE"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {plusMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-10 left-0 w-64 rounded-xl bg-[#1f1f23] border border-[#2a2a2e] shadow-[0_12px_32px_rgba(0,0,0,0.45)] p-1.5 z-30 space-y-0.5"
                    >
                      {[
                        {
                          label: "Decompile & ไล่ Xrefs",
                          prompt: `Decompile และอธิบาย Xrefs รอบ ${activeFile.symbols[0]?.name ?? activeFile.name} แบบ ${sliceHops}-Hop`,
                        },
                        {
                          label: "สร้างสคริปต์ Frida Hook",
                          prompt: `สร้าง Frida Interceptor hook ที่ปลอดภัยสำหรับ ${activeFile.name}`,
                        },
                        {
                          label: "เสนอชื่อ Symbol -> Sync Ghidra",
                          prompt: `เสนอชื่อฟังก์ชันและตัวแปรที่อ่านเข้าใจง่ายสำหรับ ${activeFile.name} พร้อม Sync กลับ MCP`,
                        },
                        {
                          label: "แปลง Logic เป็น Python Client",
                          prompt: `สรุปขั้นตอนสร้าง Signature จาก ${activeFile.name} และเขียนโค้ด Python ทดสอบ`,
                        },
                      ].map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => {
                            setPlusMenuOpen(false);
                            onSendPrompt(action.prompt);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg text-[12.5px] text-[#b0b3b8] hover:bg-[#26262b] hover:text-[#f2f2f3] transition-colors flex items-center gap-2"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
                          <span>{action.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Local Permissions + Model Chip + Send/Stop */}
                <div className="flex items-center gap-1.5 sm:gap-2 relative">
                  {/* Local Permissions Popover (Matches Screenshot Pattern) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPlusMenuOpen(false);
                        setModelMenuOpen(false);
                        setPermMenuOpen((v) => !v);
                      }}
                      title="Local Permissions — เลือกระดับสิทธิ์รันคำสั่งเครื่อง"
                      className="h-8 px-2.5 rounded-lg bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[12px] text-[#b0b3b8] hover:text-[#f2f2f3] flex items-center gap-1.5 transition-colors"
                    >
                      {renderPermissionIcon(permissionMode, "w-3.5 h-3.5 text-[#b0b3b8]")}
                      <span className="truncate max-w-[105px]">
                        {activePermissionOption.label}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-[#7d8087]" />
                    </button>

                    {permMenuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute bottom-10 right-0 w-[300px] rounded-xl bg-[#1a1a1e] border border-[#2e2e34] shadow-[0_14px_36px_rgba(0,0,0,0.6)] p-2 z-40 space-y-0.5"
                      >
                        <div className="px-2.5 pt-1 pb-1.5 text-[11.5px] font-medium text-[#7d8087]">
                          Local Permissions
                        </div>
                        {PERMISSION_OPTIONS.map((opt) => {
                          const active = permissionMode === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                onChangePermissionMode(opt.id);
                                setPermMenuOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                active
                                  ? "bg-[#242429] text-[#f2f2f3]"
                                  : "hover:bg-[#222227] text-[#d0d2d6]"
                              }`}
                            >
                              <div className="text-[#9b9ea5] shrink-0">
                                {renderPermissionIcon(opt.id, "w-4 h-4")}
                              </div>
                              <div className="min-w-0 flex-1 leading-tight">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[13px] font-medium text-[#f2f2f3]">
                                    {opt.label}
                                  </span>
                                  {opt.badge && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#2b2b31] border border-[#383840] text-[10.5px] font-medium text-[#b0b3b8]">
                                      <span>{opt.badge}</span>
                                      <Info className="w-2.5 h-2.5 text-[#8c8f96]" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11.5px] text-[#7d8087] mt-0.5">
                                  {opt.desc}
                                </div>
                              </div>
                              {active && (
                                <Check className="w-4 h-4 text-[#f2f2f3] shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Model Picker Chip */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlusMenuOpen(false);
                      setPermMenuOpen(false);
                      setModelMenuOpen((v) => !v);
                    }}
                    className="h-8 px-2.5 rounded-lg bg-[#1f1f23] hover:bg-[#26262b] border border-[#2a2a2e] text-[12px] text-[#b0b3b8] hover:text-[#f2f2f3] flex items-center gap-2 transition-colors"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        activeEndpoint.privacyLevel === "Local Offline"
                          ? "bg-[#e4e4e7]"
                          : "bg-[#8b8e96]"
                      }`}
                    />
                    <span className="font-mono truncate max-w-[150px]">
                      {activeEndpoint.modelName}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-[#7d8087]" />
                  </button>

                  {modelMenuOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-10 right-0 w-80 rounded-xl bg-[#1f1f23] border border-[#2a2a2e] shadow-[0_12px_32px_rgba(0,0,0,0.5)] p-3 z-30 space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7d8087]">
                          LLM Routing (OpenAI-Compatible)
                        </div>
                        {endpoints.map((ep) => {
                          const selected = ep.id === selectedEndpointId;
                          return (
                            <button
                              key={ep.id}
                              type="button"
                              onClick={() => {
                                onSelectEndpoint(ep.id);
                                setModelMenuOpen(false);
                              }}
                              className={`w-full text-left p-2 rounded-lg border transition-colors ${
                                selected
                                  ? "bg-[#27272c] border-[#3f3f46] text-[#f4f4f5]"
                                  : "bg-[#16161a] border-[#222226] text-[#b0b3b8] hover:bg-[#26262b]"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 text-[12px] font-medium">
                                <span className="truncate">{ep.name}</span>
                                <span className="text-[10.5px] shrink-0 text-[#a1a1aa]">
                                  {ep.privacyLevel}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-[#7d8087] truncate mt-0.5">
                                {ep.baseUrl} · {ep.modelName}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="pt-2 border-t border-[#2a2a2e] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#7d8087]">
                          Auto-Failover:{" "}
                          <span className="text-[#e4e4e7] font-mono">
                            {failoverConfig.autoFailoverOnRefusal ? "ON" : "OFF"}
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setModelMenuOpen(false);
                            onOpenSettingsModal("models");
                          }}
                          className="text-[11.5px] font-medium text-[#e4e4e7] hover:underline flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>เพิ่ม API ค่ายทั่วโลก</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {isStreaming ? (
                    <button
                      type="button"
                      onClick={onStopStreaming}
                      className="w-8 h-8 rounded-lg bg-[#26262b] hover:bg-[#313136] border border-[#3a3a40] text-[#f4f4f5] flex items-center justify-center transition-colors"
                      title="หยุดการทำงาน"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!draft.trim()}
                      className="w-8 h-8 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] disabled:bg-[#1f1f23] disabled:text-[#56585f] text-[#111113] flex items-center justify-center transition-colors"
                      title="ส่งคำสั่ง (Enter)"
                    >
                      <SendHorizontal className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DESK 2: CAPABILITIES (MCP SHELF + LAZY RE SKILLS) */}
      {activeDesk === "capabilities" && (
        <div className="flex-1 overflow-y-auto">
          {renderCapabilitiesBody()}
        </div>
      )}

      {/* DESK 3: SPECIALIST RE AGENTS */}
      {activeDesk === "specialists" && (
        <div className="flex-1 overflow-y-auto">
          {renderSpecialistsBody()}
        </div>
      )}

      {/* DESK 4: PROJECT MEMORY (.MD NOTES) */}
      {activeDesk === "memory" && renderMemoryBody()}

      {/* DESK 5: GLOBAL LLM PROVIDERS, RESOURCE GOVERNOR & GUARDRAIL ADVISORY */}
      {activeDesk === "models" && (
        <div className="flex-1 overflow-y-auto">
          {renderModelsBody()}
        </div>
      )}

      {/* UNIFIED SETTINGS & FIRST-RUN POPUP MODAL (Aetox-Harness Overlay Pattern) */}
      {settingsModalTab !== null && (
        <div
          onClick={onCloseSettingsModal}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[1000px] h-[84vh] max-h-[780px] rounded-xl bg-[#111114] border border-[#27272c] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-[#222226] bg-[#141417] flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
              <div className="min-w-0">
                <div className="text-[14.5px] font-semibold text-[#f4f4f5] truncate">
                  {isFirstRunModal
                    ? "ตั้งค่าเริ่มต้นครั้งแรก — DeepTrace RE Harness"
                    : "ตั้งค่าระบบ, เครื่องมือ RE & โมเดล — DeepTrace"}
                </div>
                <div className="text-[12px] text-[#8b8e96] truncate">
                  ตั้งค่าชุดเครื่องมือ, คีย์ API ค่ายทั่วโลก, MCP Bridge และความจำโปรเจกต์โดยไม่รบกวนหน้าแชท
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyFullMcpBundle}
                  className="px-3 py-1.5 rounded-lg bg-[#1c1c20] hover:bg-[#242429] border border-[#2c2c34] text-[12px] font-medium text-[#e4e4e7] inline-flex items-center gap-1.5 transition-colors"
                >
                  {copiedPromptBundle ? (
                    <Check className="w-3.5 h-3.5 text-[#f4f4f5]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#a1a1aa]" />
                  )}
                  <span>
                    {copiedPromptBundle
                      ? "คัดลอก MCP แล้ว ✓"
                      : "คัดลอก MCP เชื่อม AI เจ้าอื่น"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCloseSettingsModal();
                    if (activeDesk !== "chat") onSelectDesk("chat");
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[12px] font-medium text-[#111113] inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>พร้อมใช้งาน / ปิดหน้าต่าง (Esc)</span>
                </button>
              </div>
            </div>

            {/* Modal Split Body */}
            <div className="flex-1 min-h-0 flex">
              {/* Modal Left Tab Navigation */}
              <aside className="w-56 border-r border-[#222226] bg-[#131316] p-3 flex flex-col gap-1 shrink-0 select-none">
                {(
                  [
                    {
                      id: "toolchain",
                      label: "เช็ค & ติดตั้งเครื่องมือ RE",
                      icon: <Wrench className="w-4 h-4" />,
                    },
                    {
                      id: "models",
                      label: "โมเดล & API (ค่ายทั่วโลก)",
                      icon: <KeyRound className="w-4 h-4" />,
                    },
                    {
                      id: "capabilities",
                      label: "ความสามารถ & MCP",
                      icon: <Plug className="w-4 h-4" />,
                    },
                    {
                      id: "specialists",
                      label: "เอเจนต์เฉพาะทาง",
                      icon: <Bot className="w-4 h-4" />,
                    },
                    {
                      id: "memory",
                      label: "ความจำโปรเจกต์ (.md)",
                      icon: <BookOpen className="w-4 h-4" />,
                    },
                  ] as {
                    id: SettingsModalTab;
                    label: string;
                    icon: React.ReactNode;
                  }[]
                ).map((tab) => {
                  const active = settingsModalTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => onOpenSettingsModal(tab.id)}
                      className={`w-full px-3 py-2 rounded-lg text-[12.5px] flex items-center gap-2.5 text-left border transition-colors ${
                        active
                          ? "bg-[#242429] border-[#34343c] text-[#f4f4f5] font-medium"
                          : "border-transparent text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5]"
                      }`}
                    >
                      <span className={active ? "text-[#f4f4f5]" : "text-[#7d8087]"}>
                        {tab.icon}
                      </span>
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </aside>

              {/* Modal Right Content Pane */}
              <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#0f0f11]">
                {settingsModalTab === "memory" ? (
                  renderMemoryBody()
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {settingsModalTab === "toolchain" && (
                      <div className="max-w-[820px] mx-auto px-6 py-5 space-y-6">
                        {renderToolchainBootstrapper()}
                        {renderExternalMcpBridgeSection()}
                      </div>
                    )}
                    {settingsModalTab === "models" && renderModelsBody()}
                    {settingsModalTab === "capabilities" &&
                      renderCapabilitiesBody()}
                    {settingsModalTab === "specialists" &&
                      renderSpecialistsBody()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
