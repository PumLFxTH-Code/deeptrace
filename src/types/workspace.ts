export type ArtifactCategory = "smali" | "java" | "native-c" | "arm64" | "frida";

export type EditorLanguage = "smali" | "java" | "c" | "arm64" | "javascript";

export type DeskId = "chat" | "capabilities" | "specialists" | "memory" | "models";

export type SettingsModalTab = Exclude<DeskId, "chat"> | "toolchain";

export type WorkbenchTabId = "editor" | "diff" | "symbols" | "files" | "terminal";

export type PermissionMode = "request-review" | "default" | "auto" | "turbo";

export type ReDoorMode = "assistant" | "workbench";

export type LearnedScope =
  | "project:target_app"
  | "mode:re-playbook"
  | "user:profile"
  | "machine:toolchain";

export interface SymbolInfo {
  name: string;
  address?: string;
  kind: "function" | "method" | "jni" | "export" | "hook";
  xrefs: string[];
  syncStatus: "synced" | "pending" | "unsynced";
}

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  folderLabel: string;
  category: ArtifactCategory;
  language: EditorLanguage;
  content: string;
  modifiedContent?: string;
  patchSummary?: string;
  symbols: SymbolInfo[];
}

export interface McpServerStatus {
  id: string;
  name: string;
  transport: "stdio" | "sse";
  status: "connected" | "disconnected" | "connecting";
  enabled: boolean;
  toolsCount: number;
  tokenCost: number;
  endpoint: string;
  description: string;
  why: string;
  group: "static" | "dynamic" | "network";
}

export interface ReSkillPreset {
  id: string;
  name: string;
  category: "bypass" | "native" | "network" | "game";
  summary: string;
  triggers: string[];
  tokenCost: number;
  enabled: boolean;
}

export interface ReSpecialistAgent {
  id: string;
  name: string;
  role: string;
  modelPreference: string;
  tools: string[];
  description: string;
  samplePrompt: string;
}

export interface ProjectMemoryDoc {
  id: string;
  filename: string;
  title: string;
  updatedAt: string;
  content: string;
}

export interface ReSessionItem {
  id: string;
  title: string;
  target: string;
  ago: string;
  door: ReDoorMode;
  status: "idle" | "done" | "asking";
}

export interface McpToolCall {
  id: string;
  server: string;
  toolName: string;
  args: string;
  resultPreview: string;
  durationMs: number;
  status: "success" | "error";
  targetFileId?: string;
}

export interface LearnedProposal {
  id: string;
  scope: LearnedScope;
  scopeLabel: string;
  audience: string;
  ruleText: string;
  reason: string;
  tokensSavedEst: number;
  state: "pending" | "approved" | "rejected";
}

export interface FailoverNotice {
  fromModel: string;
  toModel: string;
  reason: string;
}

export interface RefusalAdvisory {
  blockedModel: string;
  reason: string;
  suggestedProviders: {
    id: string;
    name: string;
    modelName: string;
    vramNote: string;
  }[];
}

export interface AgentMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  model: string;
  sourcePrompt?: string;
  thinkingDurationSec?: number;
  routeKind?: "cloud" | "local";
  reasoningSteps?: string[];
  toolCalls?: McpToolCall[];
  failoverNotice?: FailoverNotice;
  refusalAdvisory?: RefusalAdvisory;
  learnedProposal?: LearnedProposal;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    sliceHops: number;
  };
}

export type ConsoleTab = "frida" | "adb" | "mcp" | "terminal";

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  source: ConsoleTab;
  level: "info" | "warn" | "error" | "success";
  text: string;
}

export interface LlmEndpointConfig {
  id: string;
  name: string;
  provider: "cloud" | "ollama" | "lmstudio";
  baseUrl: string;
  modelName: string;
  roleDescription: string;
  privacyLevel: "Cloud API" | "Local Offline";
  guardrailPolicy: "uncensored-local" | "re-friendly" | "strict-cloud";
}

export interface ProviderCatalogEntry {
  id: string;
  name: string;
  category: "local" | "aggregator" | "cloud";
  baseUrl: string;
  defaultModel: string;
  models: string[];
  apiKeyConfigured: boolean;
  apiKeyHint: string;
  guardrailPolicy: "uncensored-local" | "re-friendly" | "strict-cloud";
  authGuide: string;
  vramRequirement?: string;
}

export interface GuardrailFailoverConfig {
  autoFailoverOnRefusal: boolean;
  neutralAuditFraming: boolean;
  fallbackProviderId: string;
  fallbackModelName: string;
}

export type ResourceMode = "eco-low-vram" | "balanced" | "performance";

export interface ResourceGovernorConfig {
  mode: ResourceMode;
  maxCpuThreads: number;
  maxRamMb: number;
  maxConcurrentMcpJobs: number;
  consoleRingBufferLimit: number;
  preferCloudForLowVram: boolean;
}

export interface ExternalMcpBridgeConfig {
  enabled: boolean;
  defaultProviderId: string;
  defaultModelName: string;
  allowExternalSubtaskDelegation: boolean;
  requireApiKeyPreflight: boolean;
}

export interface ReToolPackage {
  id: string;
  name: string;
  description: string;
  version: string;
  recommended: boolean;
  installed: boolean;
  installSubdir: string;
  sizeMb: number;
  binaryCheck: string;
}

export interface ToolchainState {
  installRoot: string;
  lastScanAt: string | null;
  lastMode: "idle" | "scan-only" | "auto-setup";
  tools: ReToolPackage[];
}
