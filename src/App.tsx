import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LeftSidebar } from "./components/LeftSidebar";
import { CenterWorkspaceCard } from "./components/CenterWorkspaceCard";
import { RightWorkbench } from "./components/RightWorkbench";
import {
  SAMPLE_AGENT_MESSAGES,
  SAMPLE_CONSOLE_LOGS,
  SAMPLE_EXTERNAL_MCP_BRIDGE,
  SAMPLE_FAILOVER_CONFIG,
  SAMPLE_FILES,
  SAMPLE_LLM_ENDPOINTS,
  SAMPLE_MCP_SERVERS,
  SAMPLE_MEMORY_DOCS,
  SAMPLE_PROVIDER_CATALOG,
  SAMPLE_RESOURCE_CONFIG,
  SAMPLE_RE_SKILLS,
  SAMPLE_SESSIONS,
  SAMPLE_SPECIALISTS,
  SAMPLE_TOOLCHAIN_STATE,
} from "./lib/sampleWorkspace";
import {
  AgentMessage,
  ConsoleLogEntry,
  ConsoleTab,
  DeskId,
  ExternalMcpBridgeConfig,
  GuardrailFailoverConfig,
  LearnedScope,
  LlmEndpointConfig,
  McpServerStatus,
  PermissionMode,
  ProjectMemoryDoc,
  ProviderCatalogEntry,
  ReDoorMode,
  ReSessionItem,
  ReSkillPreset,
  ReSpecialistAgent,
  ResourceGovernorConfig,
  ToolchainState,
  WorkbenchTabId,
  WorkspaceFile,
} from "./types/workspace";

function nowTimestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

function classifyReverseSkill(prompt: string): {
  skill: string;
  workflow: string;
} {
  const lower = prompt.toLowerCase();
  if (/(apk|smali|dex|jadx|android|okhttp|pinning)/.test(lower)) {
    return {
      skill: "apk-reverse",
      workflow: "Route First -> TOOL_INDEX -> Manifest/DEX Triage -> Smali Slice -> Hook/Patch",
    };
  }
  if (/(\.so|ghidra|arm64|x86|elf|jni|sub_|ollvm|ida)/.test(lower)) {
    return {
      skill: "ghidra-native-reverse",
      workflow: "Route First -> TOOL_INDEX -> Imports/Exports -> 3-Hop Xref Slice -> Decompile",
    };
  }
  if (/(jsvmp|javascript|webpack|ast|xhr|fetch)/.test(lower)) {
    return {
      skill: "js-vmp-reverse",
      workflow: "Route First -> TOOL_INDEX -> Request Origin -> AST/Hook -> Signature Trace",
    };
  }
  if (/(protobuf|grpc|websocket|packet|hmac|aes|x-sign)/.test(lower)) {
    return {
      skill: "protocol-protobuf-reverse",
      workflow: "Route First -> TOOL_INDEX -> Capture/Decrypt -> Frame Schema -> Encoder Check",
    };
  }
  if (/(unity|il2cpp|global-metadata|\.net|mono)/.test(lower)) {
    return {
      skill: "unity-il2cpp-dotnet",
      workflow: "Route First -> TOOL_INDEX -> Metadata Dump -> Managed/Native Bridge -> Slice",
    };
  }
  if (/(golang|rust|pclntab|tokio)/.test(lower)) {
    return {
      skill: "go-rust-binary-reverse",
      workflow: "Route First -> TOOL_INDEX -> pclntab/RTTI Recovery -> String/ABI Trace",
    };
  }
  return {
    skill: "reverse-skill-router",
    workflow: "Route First -> TOOL_INDEX -> Triage -> Targeted Slice -> FIELD_JOURNAL",
  };
}

export function App() {
  // Navigation & Cockpit Shell State
  const [activeDesk, setActiveDesk] = useState<DeskId>("chat");
  const [doorMode, setDoorMode] = useState<ReDoorMode>("assistant");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [workbenchCollapsed, setWorkbenchCollapsed] = useState(false);
  const [workbenchTab, setWorkbenchTab] = useState<WorkbenchTabId>("diff");

  // Resizable Panels
  const [sidebarWidth, setSidebarWidth] = useState(268);
  const [workbenchWidth, setWorkbenchWidth] = useState(500);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{
    side: "left" | "right" | null;
    startX: number;
    startWidth: number;
  }>({ side: null, startX: 0, startWidth: 0 });

  // Target Artifacts & Workbench Files
  const [files, setFiles] = useState<WorkspaceFile[]>(SAMPLE_FILES);
  const [activeFileId, setActiveFileId] = useState<string>("frida-hook");

  // RE Capabilities, Specialists & Project Memory
  const [mcpServers, setMcpServers] = useState<McpServerStatus[]>(SAMPLE_MCP_SERVERS);
  const [reSkills, setReSkills] = useState<ReSkillPreset[]>(SAMPLE_RE_SKILLS);
  const [specialists] = useState<ReSpecialistAgent[]>(SAMPLE_SPECIALISTS);
  const [memoryDocs, setMemoryDocs] = useState<ProjectMemoryDoc[]>(SAMPLE_MEMORY_DOCS);
  const [activeMemoryId, setActiveMemoryId] = useState<string>(SAMPLE_MEMORY_DOCS[0].id);

  // Sessions, Chat, Providers & Guardrail Failover
  const [sessions, setSessions] = useState<ReSessionItem[]>(SAMPLE_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>(SAMPLE_SESSIONS[0].id);
  const [endpoints, setEndpoints] = useState<LlmEndpointConfig[]>(SAMPLE_LLM_ENDPOINTS);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string>(
    SAMPLE_LLM_ENDPOINTS[0].id
  );
  const [providers, setProviders] = useState<ProviderCatalogEntry[]>(
    SAMPLE_PROVIDER_CATALOG
  );
  const [failoverConfig, setFailoverConfig] = useState<GuardrailFailoverConfig>(
    SAMPLE_FAILOVER_CONFIG
  );
  const [resourceConfig, setResourceConfig] = useState<ResourceGovernorConfig>(
    SAMPLE_RESOURCE_CONFIG
  );
  const [externalMcpConfig, setExternalMcpConfig] =
    useState<ExternalMcpBridgeConfig>(SAMPLE_EXTERNAL_MCP_BRIDGE);
  const [toolchain, setToolchain] = useState<ToolchainState>(SAMPLE_TOOLCHAIN_STATE);
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("turbo");
  const [sliceHops, setSliceHops] = useState<number>(3);
  const [messages, setMessages] = useState<AgentMessage[]>(SAMPLE_AGENT_MESSAGES);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamTimerRef = useRef<number | null>(null);
  const rafResizeRef = useRef<number | null>(null);
  const lastUserPromptRef = useRef<string>(
    SAMPLE_AGENT_MESSAGES[0]?.content ?? ""
  );

  // Console Logs
  const [logs, setLogs] = useState<ConsoleLogEntry[]>(SAMPLE_CONSOLE_LOGS);

  // Keyboard shortcuts (Ctrl+B toggle sidebar, Ctrl+J toggle workbench)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarCollapsed((v) => !v);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setWorkbenchCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Drag resize handlers (rAF throttled to keep CPU calm on drag)
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag.side) return;
      const clientX = e.clientX;
      if (rafResizeRef.current !== null) return;
      rafResizeRef.current = window.requestAnimationFrame(() => {
        rafResizeRef.current = null;
        const activeDrag = dragRef.current;
        if (!activeDrag.side) return;
        if (activeDrag.side === "left") {
          const next = Math.min(
            380,
            Math.max(210, activeDrag.startWidth + (clientX - activeDrag.startX))
          );
          setSidebarWidth(next);
        } else {
          const next = Math.min(
            780,
            Math.max(340, activeDrag.startWidth - (clientX - activeDrag.startX))
          );
          setWorkbenchWidth(next);
        }
      });
    };

    const onMouseUp = () => {
      if (rafResizeRef.current !== null) {
        window.cancelAnimationFrame(rafResizeRef.current);
        rafResizeRef.current = null;
      }
      if (!dragRef.current.side) return;
      dragRef.current.side = null;
      setIsResizing(false);
      document.body.style.cursor = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      if (rafResizeRef.current !== null) {
        window.cancelAnimationFrame(rafResizeRef.current);
        rafResizeRef.current = null;
      }
    };
  }, []);

  const startDrag = (side: "left" | "right", e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      side,
      startX: e.clientX,
      startWidth: side === "left" ? sidebarWidth : workbenchWidth,
    };
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
  };

  const activeFile = useMemo(
    () => files.find((f) => f.id === activeFileId) ?? files[0],
    [files, activeFileId]
  );

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? sessions[0],
    [sessions, activeSessionId]
  );

  const activeEndpoint =
    endpoints.find((e) => e.id === selectedEndpointId) ?? endpoints[0];

  const pendingDiffCount = useMemo(
    () => files.filter((f) => Boolean(f.modifiedContent)).length,
    [files]
  );

  const enabledToolsCount = useMemo(
    () =>
      mcpServers
        .filter((m) => m.enabled)
        .reduce((sum, m) => sum + m.toolsCount, 0),
    [mcpServers]
  );

  const configuredProvidersCount = useMemo(
    () => providers.filter((p) => p.apiKeyConfigured).length,
    [providers]
  );

  const appendLog = useCallback(
    (source: ConsoleTab, level: ConsoleLogEntry["level"], text: string) => {
      setLogs((prev) => {
        const next = [
          ...prev,
          {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            timestamp: nowTimestamp(),
            source,
            level,
            text,
          },
        ];
        return next.slice(-resourceConfig.consoleRingBufferLimit);
      });
    },
    [resourceConfig.consoleRingBufferLimit]
  );

  const handleChangeDoorMode = (door: ReDoorMode) => {
    setDoorMode(door);
    if (door === "workbench") {
      setWorkbenchCollapsed(false);
      setWorkbenchTab("editor");
    }
  };

  const handleInspectFileInWorkbench = (fileId: string, openDiff = false) => {
    setActiveFileId(fileId);
    setWorkbenchCollapsed(false);
    const target = files.find((f) => f.id === fileId);
    if (openDiff && target?.modifiedContent) {
      setWorkbenchTab("diff");
    } else {
      setWorkbenchTab("editor");
    }
  };

  const handleUpdateFileContent = (fileId: string, content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === fileId ? { ...f, content } : f))
    );
  };

  const handleAcceptPatch = (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    if (!target?.modifiedContent) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              content: f.modifiedContent ?? f.content,
              modifiedContent: undefined,
              patchSummary: undefined,
            }
          : f
      )
    );
    setWorkbenchTab("editor");
    appendLog("mcp", "success", `[Patch] Applied AI diff to ${target.path}`);
  };

  const handleRejectPatch = (fileId: string) => {
    const target = files.find((f) => f.id === fileId);
    if (!target) return;
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, modifiedContent: undefined, patchSummary: undefined }
          : f
      )
    );
    setWorkbenchTab("editor");
    appendLog("mcp", "warn", `[Patch] Discarded diff for ${target.path}`);
  };

  const handleSyncSymbols = (file: WorkspaceFile) => {
    const server = file.category === "java" ? "jadx-ai-mcp" : "GhidraMCP";
    setFiles((prev) =>
      prev.map((f) =>
        f.id === file.id
          ? {
              ...f,
              symbols: f.symbols.map((s) => ({ ...s, syncStatus: "synced" })),
            }
          : f
      )
    );
    setWorkbenchCollapsed(false);
    setWorkbenchTab("terminal");
    appendLog(
      "mcp",
      "success",
      `[${server}] Synced ${file.symbols.length} symbols for ${file.name}`
    );
  };

  const handleRunFridaScript = (file: WorkspaceFile) => {
    setWorkbenchCollapsed(false);
    setWorkbenchTab("terminal");
    const isPatched = !file.modifiedContent && file.content.includes("readByteArray");
    appendLog(
      "frida",
      "info",
      `[frida] frida -U -f com.target.app -l ${file.path}`
    );

    if (isPatched) {
      appendLog(
        "frida",
        "success",
        `[frida][stdout] [+] Hooking sub_14A80 (compute_hmac_sha256_sig) | len=64 -> HMAC-SHA256: 9f4e2c8a10...b7d1`
      );
    } else {
      appendLog(
        "frida",
        "error",
        `[frida][stderr] Error: access violation accessing 0x7a44012000 at Memory.readUtf8String (${file.name}:19)`
      );
    }
  };

  const handleSendPrompt = useCallback(
    (promptText: string, forceRefusalDemo = false) => {
      lastUserPromptRef.current = promptText;
      const userMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: promptText,
        timestamp: nowTimestamp(),
        model: "user",
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);

      const endpoint = activeEndpoint;
      const targetFile = activeFile;
      const currentHops = sliceHops;
      const activeServer =
        targetFile.category === "java" ? "jadx-ai-mcp" : "GhidraMCP";
      const fallbackProvider =
        providers.find((p) => p.id === failoverConfig.fallbackProviderId) ??
        providers[0];
      const hasSensitiveKeyword =
        /(bypass|hook|frida|inject|ssl|dump|patch|crack|pinning|ollvm|offset|root)/i.test(
          promptText
        );
      const isStrictRoute =
        forceRefusalDemo || endpoint.guardrailPolicy === "strict-cloud";
      const triggeredFailover =
        failoverConfig.autoFailoverOnRefusal &&
        (forceRefusalDemo || (isStrictRoute && hasSensitiveKeyword));
      const blockedWithAdvisory =
        !failoverConfig.autoFailoverOnRefusal &&
        (forceRefusalDemo || (isStrictRoute && hasSensitiveKeyword));

      streamTimerRef.current = window.setTimeout(() => {
        if (triggeredFailover) {
          const fromLabel = forceRefusalDemo
            ? "gpt-4.1 (Strict Cloud)"
            : endpoint.modelName;
          const toLabel = `${fallbackProvider.name} · ${failoverConfig.fallbackModelName}`;
          appendLog(
            "mcp",
            "warn",
            `[Guardrail Shield] ${fromLabel} ปฏิเสธคำสั่ง (${failoverConfig.neutralAuditFraming ? "หลังทำ Audit Framing" : "ไม่มี Framing"}) -> Auto-Failover ไปยัง ${toLabel}`
          );

          const assistantMsg: AgentMessage = {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            sourcePrompt: promptText,
            timestamp: nowTimestamp(),
            thinkingDurationSec: 1.6,
            model: `${failoverConfig.fallbackModelName} (${fallbackProvider.category === "local" ? "Local Offline" : "Gateway / Cloud"})`,
            routeKind: fallbackProvider.category === "local" ? "local" : "cloud",
            failoverNotice: {
              fromModel: fromLabel,
              toModel: toLabel,
              reason:
                "โมเดลหลักติด policy guardrail ระหว่างคำสั่งวิเคราะห์/Hook ระบบจึงสลับเทิร์นนี้ไปยังโมเดลสำรองที่ตั้งค่าไว้โดยไม่ต้องพิมพ์ใหม่",
            },
            reasoningSteps: [
              `ส่งคำขอรอบแรกไปยัง ${fromLabel} (โหมดสิทธิ์ ${permissionMode})`,
              `ตรวจพบคำตอบปฏิเสธ (Guardrail Refusal) -> เรียก Failover Shield ทันที`,
              `โอน 3-Hop Context + Memory Notes (.md) ไปยัง ${toLabel}`,
              `รัน ${activeServer} แบบ ${currentHops}-Hop Slice บน ${targetFile.name}`,
            ],
            toolCalls: [
              {
                id: `tc-${Date.now()}`,
                server: activeServer,
                toolName:
                  targetFile.category === "frida"
                    ? "slice_call_graph"
                    : "inspect_xrefs",
                args: JSON.stringify({ file: targetFile.path, hops: currentHops }),
                resultPreview: `Resumed seamlessly via ${failoverConfig.fallbackProviderId}`,
                durationMs: 44,
                status: "success",
                targetFileId: targetFile.id,
              },
            ],
            tokenUsage: {
              promptTokens: 890 + currentHops * 160,
              completionTokens: 245,
              sliceHops: currentHops,
            },
            content:
              `โอนงานต่อเนื่องมายัง **${failoverConfig.fallbackModelName}** และวิเคราะห์ **${targetFile.name}** เรียบร้อยครับ\n\n` +
              `- สถานะ Auto-Failover: ข้ามการติดการ์ดของ \`${fromLabel}\` โดยไม่เสียบริบทเดิม\n` +
              `- สัญลักษณ์ที่เกี่ยวข้อง: ${targetFile.symbols.map((s) => `\`${s.name}\``).join(", ") || "ไม่มี"}`,
            learnedProposal: {
              id: `learn-${Date.now()}`,
              scope: "mode:re-playbook",
              scopeLabel: "Playbook สาย RE",
              audience: "ลดการยิงซ้ำเข้า Strict Cloud API · ประหยัด ~2,200 tokens/รอบ",
              ruleText: `สำหรับงาน Hook/วิเคราะห์ ${targetFile.name} ให้ใช้ ${failoverConfig.fallbackProviderId} (${failoverConfig.fallbackModelName}) แทนโมเดล Strict Cloud เพื่อลดการติดการ์ดซ้ำ`,
              reason: "หลีกเลี่ยงการส่งคำสั่งสาย Native/Frida ซ้ำเข้าโมเดลที่ติดการ์ด",
              tokensSavedEst: 2200,
              state: "pending",
            },
          };

          setMessages((prev) => [...prev, assistantMsg]);
          setIsStreaming(false);
          streamTimerRef.current = null;
          return;
        }

        if (blockedWithAdvisory) {
          const blockedName = forceRefusalDemo
            ? "gpt-4.1 (Strict Cloud)"
            : endpoint.modelName;
          appendLog(
            "mcp",
            "warn",
            `[Guardrail Advisory] ตัว ${blockedName} ติดการ์ดความปลอดภัย — แนะนำผู้ใช้เลือกโมเดลอื่นแล้วกดปุ่มรีส่งซ้ำ (ไม่บังคับ Local GPU)`
          );
          const advisoryMsg: AgentMessage = {
            id: `msg-${Date.now() + 1}`,
            role: "assistant",
            sourcePrompt: promptText,
            timestamp: nowTimestamp(),
            thinkingDurationSec: 0.4,
            model: `${blockedName} (Cloud API)`,
            routeKind: "cloud",
            refusalAdvisory: {
              blockedModel: blockedName,
              reason:
                "โมเดลนี้ปฏิเสธคำขอที่มีคำสั่งสาย Hook / Bypass / SSL Pinning (หากเครื่องของคุณใช้การ์ดจอ 4–8GB แนะนำให้สลับไป Cloud API ค่ายอื่นด้านล่างโดยไม่กิน VRAM ในเครื่อง)",
              suggestedProviders: [
                {
                  id: "deepseek",
                  name: "DeepSeek Reasoner",
                  modelName: "deepseek-reasoner",
                  vramNote: "0GB VRAM (Cloud)",
                },
                {
                  id: "openrouter",
                  name: "OpenRouter (Qwen Coder)",
                  modelName: "qwen/qwen-2.5-coder-32b-instruct",
                  vramNote: "0GB VRAM (Cloud)",
                },
                {
                  id: "xai",
                  name: "xAI Grok 3",
                  modelName: "grok-3",
                  vramNote: "0GB VRAM (Cloud)",
                },
                {
                  id: "ollama",
                  name: "Ollama 7B-Q4",
                  modelName: "qwen2.5-coder:7b-instruct-q4_K_M",
                  vramNote: "4–8GB VRAM (Local)",
                },
              ],
            },
            content:
              `ตัว **${blockedName}** ไม่สามารถใช้งานคำขอนี้ได้เนื่องจากติดการ์ดความปลอดภัยครับ\n\n` +
              `- คุณสามารถคลิกเลือกโมเดลตัวอื่นจากการ์ดด้านบน (หรือที่ตัวเลือกโมเดลด้านล่าง) แล้วกดปุ่ม **รีส่งซ้ำไปยังโมเดลใหม่** เพื่อส่งคำสั่งเดิมไปประมวลผลต่อได้ทันทีโดยไม่กินทรัพยากรการ์ดจอในเครื่อง`,
          };
          setMessages((prev) => [...prev, advisoryMsg]);
          setIsStreaming(false);
          streamTimerRef.current = null;
          return;
        }

        const skillRoute = classifyReverseSkill(promptText);
        const assistantMsg: AgentMessage = {
          id: `msg-${Date.now() + 1}`,
          role: "assistant",
          sourcePrompt: promptText,
          timestamp: nowTimestamp(),
          thinkingDurationSec: 1.2,
          model: `${endpoint.modelName} (${endpoint.privacyLevel})`,
          routeKind: endpoint.provider === "cloud" ? "cloud" : "local",
          reasoningSteps: [
            `[reverse-skill Router] จับคู่โหมดงาน -> ${skillRoute.skill} (${skillRoute.workflow})`,
            `เลือกเส้นทางโมเดล ${endpoint.name} (${endpoint.baseUrl})`,
            `Resource Guard: CPU ≤ ${resourceConfig.maxCpuThreads}T, Concurrent MCP ≤ ${resourceConfig.maxConcurrentMcpJobs}`,
            `ตัด Call Graph รอบ ${targetFile.name} ลึก ${currentHops}-Hop เพื่อประหยัด Context`,
            `ตรวจ ${targetFile.symbols.length} สัญลักษณ์ที่ผูกอยู่กับ ${activeServer}`,
          ],
          toolCalls: [
            {
              id: `tc-${Date.now()}`,
              server: activeServer,
              toolName:
                targetFile.category === "frida"
                  ? "slice_call_graph"
                  : "inspect_xrefs",
              args: JSON.stringify({ file: targetFile.path, hops: currentHops, skill: skillRoute.skill }),
              resultPreview: `Routed via ${skillRoute.skill} · Sliced ${targetFile.name}`,
              durationMs: 38,
              status: "success",
              targetFileId: targetFile.id,
            },
          ],
          tokenUsage: {
            promptTokens: 960 + currentHops * 180,
            completionTokens: 210,
            sliceHops: currentHops,
          },
          content:
            `วิเคราะห์ **${targetFile.name}** ด้วย **${endpoint.modelName}** (${currentHops}-Hop Slice · สกิล \`${skillRoute.skill}\`) เรียบร้อยครับ\n\n` +
            `- ลำดับ Router: \`${skillRoute.workflow}\`\n` +
            `- สัญลักษณ์ที่เกี่ยวข้อง: ${targetFile.symbols.map((s) => `\`${s.name}\``).join(", ") || "ไม่มี"}\n` +
            `- โหมด Local Permissions: \`${permissionMode}\` · Resource Profile: \`${resourceConfig.mode}\`\n` +
            `- แนะนำ: สามารถเปิดแท็บ **Review** หรือ **JNI & Symbols** ใน Workbench ด้านขวาเพื่อตรวจแก้และกด **Apply Patch** ได้ทันที`,
          ...(hasSensitiveKeyword
            ? {
                learnedProposal: {
                  id: `learn-${Date.now()}`,
                  scope: "project:target_app" as LearnedScope,
                  scopeLabel: "โปรเจกต์ target_app (FIELD_JOURNAL.md)",
                  audience: "โหลดเฉพาะตอนวิเคราะห์ไฟล์นี้ · ประหยัด ~1,900 tokens ในรอบหน้า",
                  ruleText: `[Evidence] รันสกิล ${skillRoute.skill} (${currentHops}-Hop Slice) จาก ${targetFile.symbols[0]?.name ?? targetFile.name} -> [Finding] ยึดผล ${activeServer} ก่อนสร้าง Hook -> [Path] ${targetFile.path}`,
                  reason: "บันทึกหลักฐานแบบ Evidence -> Finding -> Path ลง FIELD_JOURNAL.md เพื่อไม่ต้องสแกนซ้ำ",
                  tokensSavedEst: 1900,
                  state: "pending" as const,
                },
              }
            : {}),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
        streamTimerRef.current = null;
      }, 420);
    },
    [
      activeEndpoint,
      activeFile,
      appendLog,
      failoverConfig,
      permissionMode,
      providers,
      resourceConfig.maxConcurrentMcpJobs,
      resourceConfig.maxCpuThreads,
      resourceConfig.mode,
      sliceHops,
    ]
  );

  const handleRetryLastPrompt = useCallback(
    (customPrompt?: string) => {
      if (isStreaming) return;
      const lastUserMsg = [...messages]
        .reverse()
        .find((m) => m.role === "user");
      const targetPrompt = (
        customPrompt ??
        lastUserMsg?.content ??
        lastUserPromptRef.current
      ).trim();
      if (!targetPrompt) return;
      appendLog(
        "mcp",
        "info",
        `[Retry] ส่งคำสั่งล่าสุดซ้ำไปยัง ${activeEndpoint.name} (${activeEndpoint.modelName})`
      );
      handleSendPrompt(targetPrompt, false);
    },
    [activeEndpoint.modelName, activeEndpoint.name, appendLog, handleSendPrompt, isStreaming, messages]
  );

  const handleStopStreaming = () => {
    if (streamTimerRef.current !== null) {
      window.clearTimeout(streamTimerRef.current);
      streamTimerRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleExecuteCommand = (command: string, channel: ConsoleTab) => {
    const lower = command.toLowerCase();
    appendLog(channel, "info", `$ ${command}`);

    if (lower === "clear") {
      setLogs([]);
      return;
    }
    if (lower === "help") {
      appendLog(
        channel,
        "info",
        "คำสั่งตัวอย่าง: adb devices | adb logcat | frida -U -f com.target.app -l hook_native_sign.js | clear"
      );
      return;
    }
    if (lower.startsWith("adb devices")) {
      appendLog(
        "adb",
        "success",
        "List of devices attached\n127.0.0.1:5555\tdevice product:cheetah model:Pixel_7_Pro"
      );
      return;
    }
    if (lower.startsWith("adb logcat")) {
      appendLog(
        "adb",
        "warn",
        "I/SignInterceptor(19402): Calling nativeSign(nonce=92a1f4, len=64)"
      );
      return;
    }
    if (lower.startsWith("frida")) {
      const fridaFile = files.find((f) => f.id === "frida-hook") ?? activeFile;
      handleRunFridaScript(fridaFile);
      return;
    }
    appendLog(
      channel,
      "warn",
      `[Phase 1 Shell] Executed '${command}'. เชื่อมต่อ Python RE-Local-MCP ใน Phase 3 เพื่อรันบนเครื่องจริง`
    );
  };

  const handleSendLogsToAi = (logsText: string) => {
    setActiveDesk("chat");
    handleSendPrompt(
      `ช่วยวิเคราะห์ runtime error จาก Console ด้านล่างและเสนอ Diff แก้โค้ดให้หน่อย:\n\n\`\`\`\n${logsText}\n\`\`\``
    );
  };

  const handleNewSession = () => {
    const newId = `sess-${Date.now()}`;
    const nextSess: ReSessionItem = {
      id: newId,
      title: `RE Session (${activeFile.name})`,
      target: "target_app_v4.2.1.apk",
      ago: "ตอนนี้",
      door: doorMode,
      status: "idle",
    };
    setSessions((prev) => [nextSess, ...prev]);
    setActiveSessionId(newId);
    setActiveDesk("chat");
    setMessages([]);
  };

  const handleToggleMcpServer = (id: string) => {
    setMcpServers((prev) =>
      prev.map((srv) =>
        srv.id === id
          ? {
              ...srv,
              enabled: !srv.enabled,
              status: !srv.enabled ? "connected" : "disconnected",
            }
          : srv
      )
    );
  };

  const handleToggleSkill = (id: string) => {
    setReSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleLaunchSpecialist = (agent: ReSpecialistAgent) => {
    setActiveDesk("chat");
    handleSendPrompt(`[${agent.name}] ${agent.samplePrompt}`);
  };

  const handleUpdateMemoryDoc = (id: string, content: string) => {
    setMemoryDocs((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, content, updatedAt: nowTimestamp() } : d
      )
    );
  };

  const handleCreateMemoryDoc = (filename: string) => {
    const newDoc: ProjectMemoryDoc = {
      id: `mem-${Date.now()}`,
      filename,
      title: filename,
      updatedAt: nowTimestamp(),
      content: `# ${filename}\n\n- บันทึกข้อค้นพบของโปรเจกต์เป้าหมายที่นี่\n`,
    };
    setMemoryDocs((prev) => [...prev, newDoc]);
    setActiveMemoryId(newDoc.id);
  };

  const handleCyclePermission = () => {
    setPermissionMode((prev) =>
      prev === "request-review"
        ? "default"
        : prev === "default"
        ? "auto"
        : prev === "auto"
        ? "turbo"
        : "request-review"
    );
  };

  const handleUpdateProvider = (
    id: string,
    patch: Partial<ProviderCatalogEntry>
  ) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
    if (patch.defaultModel && externalMcpConfig.defaultProviderId === id) {
      setExternalMcpConfig((prev) => ({
        ...prev,
        defaultModelName: patch.defaultModel ?? prev.defaultModelName,
      }));
    }
  };

  const handleUseProviderRoute = (provider: ProviderCatalogEntry) => {
    const routeId = `provider-${provider.id}`;
    const privacyLevel: LlmEndpointConfig["privacyLevel"] =
      provider.category === "local" ? "Local Offline" : "Cloud API";
    const providerKind: LlmEndpointConfig["provider"] =
      provider.id === "ollama"
        ? "ollama"
        : provider.id === "lmstudio"
        ? "lmstudio"
        : "cloud";

    const nextEndpoint: LlmEndpointConfig = {
      id: routeId,
      name: provider.name,
      provider: providerKind,
      baseUrl: provider.baseUrl,
      modelName: provider.defaultModel,
      roleDescription: provider.authGuide,
      privacyLevel,
      guardrailPolicy: provider.guardrailPolicy,
    };

    setEndpoints((prev) => {
      const exists = prev.some((e) => e.id === routeId);
      return exists
        ? prev.map((e) => (e.id === routeId ? nextEndpoint : e))
        : [nextEndpoint, ...prev];
    });
    setSelectedEndpointId(routeId);
    setActiveDesk("chat");
    appendLog(
      "mcp",
      "success",
      `[LLM Hub] Active route switched -> ${provider.name} (${provider.defaultModel})`
    );
  };

  const handleUpdateFailoverConfig = (
    patch: Partial<GuardrailFailoverConfig>
  ) => {
    setFailoverConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleUpdateResourceConfig = (
    patch: Partial<ResourceGovernorConfig>
  ) => {
    setResourceConfig((prev) => {
      const next = { ...prev, ...patch };
      if (patch.consoleRingBufferLimit !== undefined) {
        setLogs((curr) => curr.slice(-next.consoleRingBufferLimit));
      }
      return next;
    });
  };

  const handleUpdateExternalMcpConfig = (
    patch: Partial<ExternalMcpBridgeConfig>
  ) => {
    setExternalMcpConfig((prev) => ({ ...prev, ...patch }));
  };

  const syncToolIndexDoc = (nextRoot: string, nextTools: ToolchainState["tools"]) => {
    const lines = nextTools.map(
      (t) =>
        `- **${t.id}** (${t.version}): ${
          t.installed
            ? `\`${nextRoot}\\${t.installSubdir}\\${t.binaryCheck}\` (Installed)`
            : "Missing"
        }`
    );
    setMemoryDocs((prev) =>
      prev.map((doc) =>
        doc.id === "mem-tool-index"
          ? {
              ...doc,
              updatedAt: nowTimestamp(),
              content: `# TOOL_INDEX (Auto-Maintained)\n\n- **Install Root**: \`${nextRoot}\`\n${lines.join("\n")}`,
            }
          : doc
      )
    );
  };

  const handleChangeInstallRoot = (root: string) => {
    const trimmed = root.trim();
    setToolchain((prev) => ({ ...prev, installRoot: trimmed }));
    if (/[^\x00-\x7F]/.test(trimmed)) {
      appendLog(
        "mcp",
        "warn",
        `[Path Guard] พบตัวอักษรภาษาไทย/Non-ASCII ในพาท "${trimmed}" — แนะนำให้สลับเป็น C:\\DeepTraceTools`
      );
    }
  };

  const handleScanToolchainOnly = () => {
    const ts = nowTimestamp();
    const hasNonAscii = /[^\x00-\x7F]/.test(toolchain.installRoot);
    const missing = toolchain.tools.filter((t) => !t.installed);
    setToolchain((prev) => ({
      ...prev,
      lastScanAt: ts,
      lastMode: "scan-only",
    }));
    appendLog(
      "mcp",
      missing.length > 0 ? "warn" : "success",
      `[Toolchain Scan] สแกนแบบ Scan-Only เสร็จสิ้น: พบ ${
        toolchain.tools.length - missing.length
      }/${toolchain.tools.length} ตัว · ขาด: ${
        missing.map((m) => m.id).join(", ") || "ครบแล้ว"
      }`
    );
    if (hasNonAscii) {
      appendLog(
        "mcp",
        "warn",
        `[Path Guard] คำเตือน: พาท "${toolchain.installRoot}" มีตัวอักษรที่ไม่ใช่ ASCII (Ghidra/jadx อาจไม่รองรับ)`
      );
    }
  };

  const handleCheckAndInstallToolchain = () => {
    const ts = nowTimestamp();
    const safeRoot = /[^\x00-\x7F]/.test(toolchain.installRoot) || !toolchain.installRoot
      ? "C:\\DeepTraceTools"
      : toolchain.installRoot;

    const updatedTools = toolchain.tools.map((t) =>
      t.recommended ? { ...t, installed: true } : t
    );

    if (safeRoot !== toolchain.installRoot) {
      appendLog(
        "mcp",
        "warn",
        `[Path Guard] เปลี่ยนโฟลเดอร์ติดตั้งเป็น "${safeRoot}" อัตโนมัติเพื่อหลีกเลี่ยงพาทภาษาไทย/Non-ASCII`
      );
    }

    setToolchain({
      installRoot: safeRoot,
      lastScanAt: ts,
      lastMode: "auto-setup",
      tools: updatedTools,
    });
    syncToolIndexDoc(safeRoot, updatedTools);
    appendLog(
      "mcp",
      "success",
      `[Toolchain Auto-Setup] สแกนและติดตั้งเครื่องมือ RE มาตรฐานครบทุกตัวลงใน ${safeRoot} + อัปเดต TOOL_INDEX.md เรียบร้อย`
    );
  };

  const handleInstallSingleTool = (toolId: string) => {
    const safeRoot = /[^\x00-\x7F]/.test(toolchain.installRoot) || !toolchain.installRoot
      ? "C:\\DeepTraceTools"
      : toolchain.installRoot;
    const nextTools = toolchain.tools.map((t) =>
      t.id === toolId ? { ...t, installed: true } : t
    );
    const target = nextTools.find((t) => t.id === toolId);
    setToolchain((prev) => ({
      ...prev,
      installRoot: safeRoot,
      lastScanAt: nowTimestamp(),
      tools: nextTools,
    }));
    syncToolIndexDoc(safeRoot, nextTools);
    appendLog(
      "mcp",
      "success",
      `[Toolchain] ติดตั้ง ${target?.name ?? toolId} ลงใน ${safeRoot}\\${target?.installSubdir ?? ""} และอัปเดต TOOL_INDEX.md แล้ว`
    );
  };

  const handleSimulateExternalMcpCall = () => {
    setActiveDesk("chat");
    const mcpProvider = providers.find(
      (p) => p.id === externalMcpConfig.defaultProviderId
    );
    const ready = Boolean(
      externalMcpConfig.enabled &&
        mcpProvider &&
        (mcpProvider.category === "local" || mcpProvider.apiKeyConfigured)
    );

    if (!ready) {
      const targetName =
        mcpProvider?.name ?? externalMcpConfig.defaultProviderId;
      appendLog(
        "mcp",
        "warn",
        `[External MCP Bridge] Antigravity called deeptrace_delegate_re_subtask -> Blocked (API Key not configured for ${targetName})`
      );
      const alertMsg: AgentMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        timestamp: nowTimestamp(),
        thinkingDurationSec: 0.3,
        model: "deeptrace-re-bridge (Preflight Alert)",
        routeKind: "cloud",
        toolCalls: [
          {
            id: `tc-${Date.now()}`,
            server: "deeptrace-re-bridge",
            toolName: "check_mcp_bridge_readiness",
            args: JSON.stringify({
              orchestrator: "Antigravity",
              route_id: externalMcpConfig.defaultProviderId,
            }),
            resultPreview: "MCP_MODEL_OR_API_KEY_MISSING",
            durationMs: 12,
            status: "error",
          },
        ],
        content:
          `**แจ้งเตือน External MCP Bridge**: โปรแกรมภายนอก (เช่น **Antigravity / Claude / Codex**) พยายามเข้ามาสั่งงาน \`deeptrace_delegate_re_subtask\`\n\n` +
          `- สถานะ: **${mcpProvider ? `โมเดลเริ่มต้น (${mcpProvider.name}) ยังไม่ได้ใส่ API Key` : "ยังไม่ได้เลือกโมเดลเริ่มต้นสำหรับ MCP"}**\n` +
          `- แนวทางแก้ไข: เปิดหน้า \`โมเดล & API\` (ไอคอนเกียร์ซ้ายล่าง) เพื่อใส่ API Key ของ **${targetName}** หรือกดเลือกโมเดลเริ่มต้นที่ตั้งค่า Key แล้ว (เช่น **DeepSeek**, **OpenRouter**, หรือ **Ollama**) จากนั้นลองสั่งจาก Antigravity อีกครั้งครับ`,
      };
      setMessages((prev) => [...prev, alertMsg]);
      return;
    }

    appendLog(
      "mcp",
      "success",
      `[External MCP Bridge] Antigravity orchestrated ${activeFile.name} -> sub-model ${mcpProvider?.name} (${externalMcpConfig.defaultModelName})`
    );
    const delegatedMsg: AgentMessage = {
      id: `msg-${Date.now()}`,
      role: "assistant",
      timestamp: nowTimestamp(),
      thinkingDurationSec: 1.1,
      model: `Antigravity -> ${externalMcpConfig.defaultModelName}`,
      routeKind: mcpProvider?.category === "local" ? "local" : "cloud",
      reasoningSteps: [
        `Antigravity (พี่ใหญ่) เรียก check_mcp_bridge_readiness(${externalMcpConfig.defaultProviderId}) -> READY`,
        `ส่งแผนวิเคราะห์ + ${sliceHops}-Hop Slice ให้ ${mcpProvider?.name} (${externalMcpConfig.defaultModelName}) ปฏิบัติการบน ${activeFile.name}`,
        "ดึงเฉพาะผลลัพธ์ JNI / Register ที่ยืนยันแล้วกลับไปให้ Antigravity ลดการใช้ Token ซ้ำซ้อน",
      ],
      toolCalls: [
        {
          id: `tc-${Date.now()}-1`,
          server: "deeptrace-re-bridge",
          toolName: "check_mcp_bridge_readiness",
          args: JSON.stringify({ route_id: externalMcpConfig.defaultProviderId }),
          resultPreview: `READY (${externalMcpConfig.defaultModelName})`,
          durationMs: 14,
          status: "success",
        },
        {
          id: `tc-${Date.now()}-2`,
          server: "deeptrace-re-bridge",
          toolName: "deeptrace_delegate_re_subtask",
          args: JSON.stringify({
            orchestrator: "Antigravity",
            target: activeFile.path,
            hops: sliceHops,
          }),
          resultPreview: "Delegated to GhidraMCP + re-local-mcp",
          durationMs: 62,
          status: "success",
          targetFileId: activeFile.id,
        },
      ],
      tokenUsage: {
        promptTokens: 640,
        completionTokens: 195,
        sliceHops,
      },
      content:
        `**External MCP Orchestration สำเร็จ**: โมเดลพี่ใหญ่ (**Antigravity**) เชื่อมต่อ \`deeptrace-re-bridge\` และสั่งงานโมเดลลูก **${mcpProvider?.name} (${externalMcpConfig.defaultModelName})** เรียบร้อยครับ\n\n` +
        `- ขั้นตอน: Antigravity วางกลยุทธ์ระดับสูง → DeepTrace ตัด Call Graph เหลือ ${sliceHops}-Hop และรันเครื่องมือ \`GhidraMCP\` + \`re-local-mcp\` บน **${activeFile.name}**\n` +
        `- ประโยชน์: ช่วยกลบจุดอ่อนของโมเดลย่อยที่ไม่เก่งด้านวางแผน ให้ทำงานตรงจุดตามสเปกโดยไม่หลงทาง`,
    };
    setMessages((prev) => [...prev, delegatedMsg]);
  };

  const handleTestFailover = () => {
    setActiveDesk("chat");
    handleSendPrompt(
      `วิเคราะห์ Xrefs ของ ${activeFile.name} พร้อมสร้าง Frida hook ตรวจสอบ SSL pinning & signature buffer`,
      true
    );
  };

  const handleApproveLearned = (msgId: string, overrideScope?: LearnedScope) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    const prop = targetMsg?.learnedProposal;
    if (!prop) return;
    const scope = overrideScope ?? prop.scope;
    const targetDocId = prop.ruleText.includes("[Evidence]")
      ? "mem-journal"
      : scope === "mode:re-playbook" || scope === "machine:toolchain"
      ? "mem-playbook"
      : "mem-target";

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.learnedProposal
          ? {
              ...m,
              learnedProposal: {
                ...m.learnedProposal,
                scope,
                state: "approved",
              },
            }
          : m
      )
    );

    setMemoryDocs((prev) =>
      prev.map((doc) =>
        doc.id === targetDocId
          ? {
              ...doc,
              updatedAt: nowTimestamp(),
              content: `${doc.content.trimEnd()}\n- [${scope}] ${prop.ruleText}`,
            }
          : doc
      )
    );

    const targetFilename =
      memoryDocs.find((d) => d.id === targetDocId)?.filename ?? "MEMORY.md";
    appendLog(
      "mcp",
      "success",
      `[Self-Learning] บันทึกบทเรียนลง ${targetFilename} (${scope}) — ประหยัด ~${prop.tokensSavedEst} tokens/รอบ`
    );
  };

  const handleRejectLearned = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.learnedProposal
          ? {
              ...m,
              learnedProposal: {
                ...m.learnedProposal,
                state: "rejected",
              },
            }
          : m
      )
    );
  };

  const rootStyle = {
    "--sidebar-width": `${sidebarWidth}px`,
    "--workbench-width": `${workbenchWidth}px`,
  } as React.CSSProperties;

  return (
    <div
      style={rootStyle}
      className={`cockpit-app ${isResizing ? "resizing" : ""} ${
        sidebarCollapsed ? "sidebar-collapsed" : ""
      } ${workbenchCollapsed ? "workbench-collapsed" : ""}`}
    >
      {/* Zone 1: Calm Left Rail */}
      <LeftSidebar
        activeDesk={activeDesk}
        onSelectDesk={setActiveDesk}
        doorMode={doorMode}
        onChangeDoorMode={handleChangeDoorMode}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={setActiveSessionId}
        onNewSession={handleNewSession}
        enabledToolsCount={enabledToolsCount}
        configuredProvidersCount={configuredProvidersCount}
        permissionMode={permissionMode}
        onCyclePermissionMode={handleCyclePermission}
      />

      {/* Left Resize Handle (Invisible until hover) */}
      <div
        onMouseDown={(e) => startDrag("left", e)}
        className={`resize-handle ${
          isResizing && dragRef.current.side === "left" ? "dragging" : ""
        }`}
      />

      {/* Zone 2: Center Rounded Card (Topbar + Main View) */}
      <CenterWorkspaceCard
        activeDesk={activeDesk}
        onSelectDesk={setActiveDesk}
        sessionTitle={activeSession?.title ?? "DeepTrace Session"}
        sidebarCollapsed={sidebarCollapsed}
        workbenchCollapsed={workbenchCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        onToggleWorkbench={() => setWorkbenchCollapsed((v) => !v)}
        onNewSession={handleNewSession}
        pendingDiffCount={pendingDiffCount}
        messages={messages}
        isStreaming={isStreaming}
        onSendPrompt={(prompt) => handleSendPrompt(prompt)}
        onRetryLastPrompt={handleRetryLastPrompt}
        onStopStreaming={handleStopStreaming}
        endpoints={endpoints}
        selectedEndpointId={selectedEndpointId}
        onSelectEndpoint={setSelectedEndpointId}
        permissionMode={permissionMode}
        onChangePermissionMode={setPermissionMode}
        sliceHops={sliceHops}
        onChangeSliceHops={setSliceHops}
        activeFile={activeFile}
        onInspectFileInWorkbench={handleInspectFileInWorkbench}
        mcpServers={mcpServers}
        onToggleMcpServer={handleToggleMcpServer}
        reSkills={reSkills}
        onToggleSkill={handleToggleSkill}
        specialists={specialists}
        onLaunchSpecialist={handleLaunchSpecialist}
        memoryDocs={memoryDocs}
        activeMemoryId={activeMemoryId}
        onSelectMemoryDoc={setActiveMemoryId}
        onUpdateMemoryDoc={handleUpdateMemoryDoc}
        onCreateMemoryDoc={handleCreateMemoryDoc}
        onApproveLearned={handleApproveLearned}
        onRejectLearned={handleRejectLearned}
        providers={providers}
        onUpdateProvider={handleUpdateProvider}
        onUseProviderRoute={handleUseProviderRoute}
        failoverConfig={failoverConfig}
        onUpdateFailoverConfig={handleUpdateFailoverConfig}
        onTestFailover={handleTestFailover}
        resourceConfig={resourceConfig}
        onUpdateResourceConfig={handleUpdateResourceConfig}
        externalMcpConfig={externalMcpConfig}
        onUpdateExternalMcpConfig={handleUpdateExternalMcpConfig}
        onSimulateExternalMcpCall={handleSimulateExternalMcpCall}
        toolchain={toolchain}
        onChangeInstallRoot={handleChangeInstallRoot}
        onScanToolchainOnly={handleScanToolchainOnly}
        onCheckAndInstallToolchain={handleCheckAndInstallToolchain}
        onInstallSingleTool={handleInstallSingleTool}
      />

      {/* Right Resize Handle (Invisible until hover) */}
      <div
        onMouseDown={(e) => startDrag("right", e)}
        className={`resize-handle ${
          isResizing && dragRef.current.side === "right" ? "dragging" : ""
        }`}
      />

      {/* Zone 3: Right RE Workbench */}
      <RightWorkbench
        activeTab={workbenchTab}
        onSelectTab={setWorkbenchTab}
        files={files}
        activeFile={activeFile}
        onSelectFile={setActiveFileId}
        onUpdateFileContent={handleUpdateFileContent}
        onAcceptPatch={handleAcceptPatch}
        onRejectPatch={handleRejectPatch}
        onRunFridaScript={handleRunFridaScript}
        onSyncSymbols={handleSyncSymbols}
        logs={logs}
        onExecuteCommand={handleExecuteCommand}
        onClearLogs={() => setLogs([])}
        onSendLogsToAi={handleSendLogsToAi}
        sliceHops={sliceHops}
      />
    </div>
  );
}

export default App;
