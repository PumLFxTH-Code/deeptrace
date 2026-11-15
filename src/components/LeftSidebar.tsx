import React, { useMemo, useState } from "react";
import {
  Bot,
  BookOpen,
  Cpu,
  FolderGit2,
  KeyRound,
  MessageSquare,
  Plug,
  Plus,
  Search,
  Settings,
  Shield,
} from "lucide-react";
import {
  DeskId,
  PermissionMode,
  ReDoorMode,
  ReSessionItem,
} from "../types/workspace";

interface LeftSidebarProps {
  activeDesk: DeskId;
  onSelectDesk: (desk: DeskId) => void;
  doorMode: ReDoorMode;
  onChangeDoorMode: (door: ReDoorMode) => void;
  sessions: ReSessionItem[];
  activeSessionId: string;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
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
  doorMode,
  onChangeDoorMode,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  enabledToolsCount,
  configuredProvidersCount,
  permissionMode,
  onCyclePermissionMode,
}) => {
  const [search, setSearch] = useState("");

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.target.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const navItems: {
    id: DeskId;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }[] = [
    {
      id: "chat",
      label: "ห้องวิเคราะห์",
      icon: <MessageSquare className="w-4 h-4" />,
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
      label: "ความจำโปรเจกต์",
      icon: <BookOpen className="w-4 h-4" />,
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
  ];

  return (
    <aside className="left-rail h-full bg-[#16161a] flex flex-col select-none overflow-hidden transition-opacity duration-150">
      {/* Brand + Two-Door Mode Switch */}
      <div className="px-3.5 pt-3.5 pb-2.5 flex flex-col gap-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1f1f23] border border-[#2a2a2e] flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#35d0e0]" />
            </div>
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

      {/* Desk Navigation */}
      <nav className="px-3 pb-2.5 border-b border-[#2a2a2e] flex flex-col gap-0.5 shrink-0">
        {navItems.map((item) => {
          const isActive = activeDesk === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectDesk(item.id)}
              className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[13.5px] transition-colors border ${
                isActive
                  ? "bg-[#132033] border-[#2a2a2e] text-[#cfe0ff] font-medium"
                  : "border-transparent text-[#b0b3b8] hover:bg-[#1c1c20] hover:text-[#f2f2f3]"
              }`}
            >
              <span className={isActive ? "text-[#35d0e0]" : "text-[#7d8087]"}>
                {item.icon}
              </span>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.badge && (
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                    isActive
                      ? "bg-[#0f0f11] border-[#2a2a2e] text-[#35d0e0]"
                      : "bg-[#0f0f11] border-[#222226] text-[#7d8087]"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
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
          <div className="flex items-center gap-2 px-1.5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#56585f]">
            <FolderGit2 className="w-3.5 h-3.5 text-[#35d0e0]" />
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
                return (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => {
                      onSelectSession(sess.id);
                      onSelectDesk("chat");
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors flex flex-col gap-0.5 ${
                      isActive
                        ? "bg-[#132033] text-[#cfe0ff]"
                        : "text-[#b0b3b8] hover:bg-[#1c1c20] hover:text-[#f2f2f3]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          sess.status === "done"
                            ? "bg-[#3fb950]"
                            : sess.status === "asking"
                            ? "bg-[#35d0e0]"
                            : "bg-[#56585f]"
                        }`}
                      />
                      <span className="text-[12.5px] font-medium truncate">
                        {sess.title}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pl-3.5 text-[11px] text-[#56585f]">
                      <span className="font-mono truncate">{sess.target}</span>
                      <span className="shrink-0 ml-2">{sess.ago}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
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
            <Shield className="w-3.5 h-3.5 text-[#35d0e0]" />
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
          onClick={() => onSelectDesk("models")}
          title="ตั้งค่าโมเดล, API ค่ายทั่วโลก & ระบบกันติดการ์ด"
          className="w-8 h-8 rounded-lg hover:bg-[#26262b] text-[#7d8087] hover:text-[#f2f2f3] flex items-center justify-center transition-colors shrink-0"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
