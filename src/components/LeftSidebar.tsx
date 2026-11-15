import React, { useMemo, useState } from "react";
import {
  Bot,
  BookOpen,
  Check,
  Copy,
  FolderGit2,
  KeyRound,
  MessageSquare,
  Pin,
  Plug,
  Plus,
  Search,
  Settings,
  Shield,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  DeskId,
  PermissionMode,
  ReDoorMode,
  ReSessionItem,
  SettingsModalTab,
} from "../types/workspace";

interface LeftSidebarProps {
  activeDesk: DeskId;
  onSelectDesk: (desk: DeskId) => void;
  settingsModalTab: SettingsModalTab | null;
  onOpenSettingsModal: (tab: SettingsModalTab) => void;
  doorMode: ReDoorMode;
  onChangeDoorMode: (door: ReDoorMode) => void;
  sessions: ReSessionItem[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  onCopySelfMcpPayload?: () => void;
  enabledToolsCount: number;
  configuredProvidersCount?: number;
  permissionMode: PermissionMode;
  onCyclePermissionMode: () => void;
}

const PERMISSION_LABEL: Record<PermissionMode, string> = {
  "request-review": "Request Review",
  default: "Default",
  auto: "Auto",
  turbo: "Turbo",
};

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeDesk,
  onSelectDesk,
  settingsModalTab,
  onOpenSettingsModal,
  doorMode,
  onChangeDoorMode,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onCopySelfMcpPayload,
  enabledToolsCount,
  configuredProvidersCount,
  permissionMode,
  onCyclePermissionMode,
}) => {
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedSidebarMcp, setCopiedSidebarMcp] = useState(false);
  const [pinnedIds, setPinnedIds] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(
        localStorage.getItem("deeptrace_pinned_sessions_v1") || "{}"
      );
    } catch {
      return {};
    }
  });

  const togglePin = (id: string) => {
    setPinnedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(
          "deeptrace_pinned_sessions_v1",
          JSON.stringify(next)
        );
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? [...sessions]
      : sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.target.toLowerCase().includes(q)
        );
    return list.sort(
      (a, b) => (pinnedIds[b.id] ? 1 : 0) - (pinnedIds[a.id] ? 1 : 0)
    );
  }, [sessions, search, pinnedIds]);

  const settingsPopupItems: {
    id: SettingsModalTab;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: "toolchain",
      label: "เช็ค & ติดตั้งเครื่องมือ RE",
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      id: "models",
      label: "โมเดล & API",
      icon: <KeyRound className="w-4 h-4" />,
      badge:
        configuredProvidersCount !== undefined
          ? String(configuredProvidersCount)
          : undefined,
    },
    {
      id: "capabilities",
      label: "ความสามารถ & MCP",
      icon: <Plug className="w-4 h-4" />,
      badge: String(enabledToolsCount),
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
  ];

  return (
    <aside className="left-rail h-full bg-[#16161a] flex flex-col select-none overflow-hidden transition-opacity duration-150">
      {/* Brand + Two-Door Mode Switch */}
      <div className="px-3.5 pt-3.5 pb-2.5 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="DeepTrace"
              className="w-7 h-7 rounded-lg shrink-0 border border-[#2a2a2e]"
            />
            <div className="leading-tight">
              <div className="text-[14px] font-semibold text-[#f2f2f3] tracking-tight">
                DeepTrace
              </div>
              <div className="text-[11px] text-[#7d8087]">RE Harness</div>
            </div>
          </div>
        </div>

        {/* Two Doors (Assistant vs Workbench) */}
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[#0f0f11] border border-[#222226]">
          <button
            type="button"
            onClick={() => onChangeDoorMode("assistant")}
            className={`py-1.5 px-2 rounded-md text-[12px] font-medium transition-colors text-center ${
              doorMode === "assistant"
                ? "bg-[#1f1f23] text-[#f2f2f3] border border-[#2a2a2e]"
                : "text-[#7d8087] hover:text-[#b0b3b8] border border-transparent"
            }`}
          >
            RE Assistant
          </button>
          <button
            type="button"
            onClick={() => onChangeDoorMode("workbench")}
            className={`py-1.5 px-2 rounded-md text-[12px] font-medium transition-colors text-center ${
              doorMode === "workbench"
                ? "bg-[#1f1f23] text-[#f2f2f3] border border-[#2a2a2e]"
                : "text-[#7d8087] hover:text-[#b0b3b8] border border-transparent"
            }`}
          >
            RE Workbench
          </button>
        </div>
      </div>

      {/* Desk Navigation: Prominent "+ แชทใหม่" above ห้องวิเคราะห์ + Popup Settings Triggers */}
      <nav className="px-3 pb-2.5 border-b border-[#26262b] flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={onNewSession}
          className="w-full py-2 px-3 rounded-lg bg-[#e4e4e7] hover:bg-[#f4f4f5] text-[#111113] font-medium text-[13px] flex items-center justify-center gap-2 transition-colors mb-1"
        >
          <Plus className="w-4 h-4" />
          <span>แชทใหม่</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectDesk("chat")}
          className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13px] transition-colors border ${
            activeDesk === "chat" && settingsModalTab === null
              ? "bg-[#242429] border-[#34343c] text-[#f4f4f5] font-medium"
              : "border-transparent text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5]"
          }`}
        >
          <span
            className={
              activeDesk === "chat" && settingsModalTab === null
                ? "text-[#f4f4f5]"
                : "text-[#7d8087]"
            }
          >
            <MessageSquare className="w-4 h-4" />
          </span>
          <span className="flex-1 text-left truncate">ห้องวิเคราะห์</span>
        </button>

        <div className="pt-2 mt-1 border-t border-[#222226] space-y-0.5">
          <div className="px-2 pb-1 text-[10.5px] font-medium uppercase tracking-wider text-[#6e7178]">
            ตั้งค่า & เครื่องมือ (Popup)
          </div>
          {settingsPopupItems.map((item) => {
            const isActive = settingsModalTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenSettingsModal(item.id)}
                className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors border ${
                  isActive
                    ? "bg-[#242429] border-[#34343c] text-[#f4f4f5] font-medium"
                    : "border-transparent text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5]"
                }`}
              >
                <span className={isActive ? "text-[#f4f4f5]" : "text-[#7d8087]"}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10.5px] font-mono px-1.5 py-0.5 rounded border ${
                      isActive
                        ? "bg-[#16161a] border-[#34343c] text-[#f4f4f5]"
                        : "bg-[#121215] border-[#242429] text-[#7d8087]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Search & New Session */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-1.5 shrink-0">
        <div className="flex-1 flex items-center gap-2 px-2.5 h-8 rounded-lg bg-[#131316] border border-[#222226] focus-within:border-[#3a3a40]">
          <Search className="w-3.5 h-3.5 text-[#56585f] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาเซสชัน..."
            className="w-full bg-transparent text-[12.5px] text-[#f2f2f3] placeholder:text-[#7d8087] outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onNewSession}
          title="เริ่มงานวิเคราะห์ใหม่"
          className="w-8 h-8 rounded-lg bg-[#131316] hover:bg-[#26262b] border border-[#222226] text-[#b0b3b8] hover:text-[#f2f2f3] flex items-center justify-center transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Grouped Target & Sessions */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        <div>
          <div className="flex items-center gap-2 px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#6e7178]">
            <FolderGit2 className="w-3.5 h-3.5 text-[#a1a1aa]" />
            <span className="truncate">target_app_v4.2.1.apk</span>
          </div>

          <div className="space-y-0.5">
            {filteredSessions.length === 0 ? (
              <div className="px-2 py-2 text-[12px] text-[#56585f]">
                ไม่พบเซสชันที่ค้นหา
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isActive =
                  sess.id === activeSessionId && activeDesk === "chat";
                const isPinned = Boolean(pinnedIds[sess.id]);
                const isConfirmingDelete = confirmDeleteId === sess.id;

                return (
                  <div
                    key={sess.id}
                    onMouseLeave={() => {
                      if (isConfirmingDelete) setConfirmDeleteId(null);
                    }}
                    className={`group relative w-full rounded-lg transition-colors flex items-center gap-1 pr-1.5 border ${
                      isActive
                        ? "bg-[#242429] text-[#f4f4f5] border-[#34343c]"
                        : "text-[#a1a1aa] hover:bg-[#1c1c20] hover:text-[#f4f4f5] border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteId(null);
                        onSelectSession(sess.id);
                        onSelectDesk("chat");
                      }}
                      className="flex-1 min-w-0 text-left px-2.5 py-2 flex flex-col gap-0.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            sess.status === "idle"
                              ? "bg-[#52525b]"
                              : "bg-[#d4d4d8]"
                          }`}
                        />
                        {isPinned && (
                          <Pin className="w-3 h-3 text-[#d4d4d8] shrink-0" />
                        )}
                        <span className="text-[12.5px] font-medium truncate">
                          {sess.title}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-3.5 text-[11px] text-[#56585f]">
                        <span className="font-mono truncate">
                          {sess.target}
                        </span>
                        <span className="shrink-0 ml-2 group-hover:hidden">
                          {sess.ago}
                        </span>
                      </div>
                    </button>

                    {/* Native Hover Actions: Pin + 2-Step Delete (Aetox-Harness Pattern) */}
                    <div
                      className={`flex items-center gap-1 shrink-0 ${
                        isConfirmingDelete
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                      } transition-opacity`}
                    >
                      {!isConfirmingDelete && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePin(sess.id);
                          }}
                          title={isPinned ? "เลิกปักหมุด" : "ปักหมุดไว้ด้านบน"}
                          className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                            isPinned
                              ? "text-[#f4f4f5] bg-[#2c2c34]"
                              : "text-[#7d8087] hover:text-[#f4f4f5] hover:bg-[#2c2c34]"
                          }`}
                        >
                          <Pin className="w-3 h-3" />
                        </button>
                      )}

                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(sess.id);
                              setConfirmDeleteId(null);
                            }}
                            title="คลิกอีกครั้งเพื่อยืนยันการลบแชทนี้"
                            className="px-1.5 py-0.5 rounded bg-[#27272c] hover:bg-[#34343c] border border-[#52525b] text-[10.5px] font-medium text-[#f4f4f5] whitespace-nowrap"
                          >
                            ยืนยัน?
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            title="ยกเลิก"
                            className="w-5 h-5 rounded hover:bg-[#2c2c34] text-[#7d8087] hover:text-[#f4f4f5] flex items-center justify-center"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(sess.id);
                          }}
                          title="ลบแชทนี้"
                          className="w-6 h-6 rounded hover:bg-[#2c2c34] text-[#7d8087] hover:text-[#f4f4f5] flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick One-Click Copy Own MCP Config for External AI Clients */}
      <div className="px-2.5 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            if (onCopySelfMcpPayload) {
              onCopySelfMcpPayload();
            } else {
              navigator.clipboard?.writeText(
                JSON.stringify(
                  {
                    mcpServers: {
                      "deeptrace-re-bridge": {
                        command: "python",
                        args: ["-m", "backend.mcp_servers.deeptrace_bridge_mcp"],
                      },
                    },
                  },
                  null,
                  2
                )
              );
            }
            setCopiedSidebarMcp(true);
            window.setTimeout(() => setCopiedSidebarMcp(false), 1800);
          }}
          title="คัดลอกข้อมูล MCP ของ DeepTrace ไปวางให้ AI เจ้าอื่นเชื่อมต่อได้ทันที"
          className="w-full px-2.5 py-1.5 rounded-lg bg-[#141417] hover:bg-[#1e1e23] border border-[#27272c] text-[11.5px] text-[#d4d4d8] hover:text-[#f4f4f5] flex items-center justify-between gap-2 transition-colors"
        >
          <span className="truncate flex items-center gap-1.5">
            <Plug className="w-3.5 h-3.5 text-[#a1a1aa] shrink-0" />
            <span className="truncate">
              {copiedSidebarMcp
                ? "คัดลอกข้อมูล MCP แล้ว ✓"
                : "คัดลอก MCP เชื่อม AI เจ้าอื่น"}
            </span>
          </span>
          {copiedSidebarMcp ? (
            <Check className="w-3.5 h-3.5 text-[#f4f4f5] shrink-0" />
          ) : (
            <Copy className="w-3 h-3 text-[#7d8087] shrink-0" />
          )}
        </button>
      </div>

      {/* Calm Footer */}
      <div className="p-2.5 border-t border-[#222226] flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={onCyclePermissionMode}
          title="สลับระดับสิทธิ์การสั่งงาน ADB / Frida / แก้ไฟล์"
          className="flex items-center gap-2 min-w-0 px-2 py-1.5 rounded-lg hover:bg-[#26262b] transition-colors text-left flex-1"
        >
          <div className="w-6 h-6 rounded-full bg-[#1f1f23] border border-[#2a2a2e] flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-[#a1a1aa]" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[12px] font-medium text-[#f2f2f3] truncate">
              RE Analyst
            </div>
            <div className="text-[11px] text-[#7d8087] truncate">
              {PERMISSION_LABEL[permissionMode]}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenSettingsModal("toolchain")}
          title="ตั้งค่าโปรแกรม, เครื่องมือ RE และ API"
          className="w-8 h-8 rounded-lg hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3] flex items-center justify-center transition-colors shrink-0"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
