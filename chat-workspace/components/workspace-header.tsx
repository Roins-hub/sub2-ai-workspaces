"use client";

import { Home, ImageIcon, Menu, Moon, Settings2, Sun } from "lucide-react";
import { useAuiState } from "@assistant-ui/react";
import { ConnectionSettingsDialog } from "@/components/connection-settings-dialog";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { useTheme } from "@/components/theme-provider";

export function WorkspaceHeader({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const threadTitle = useAuiState((state) => {
    const activeThread = state.threads.threadItems.find(
      (thread) => thread.id === state.threads.mainThreadId,
    );
    return activeThread?.title?.trim() || "新聊天";
  });

  return (
    <header className="workspace-header flex h-16 shrink-0 items-center justify-between px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <TooltipIconButton tooltip="打开会话列表" className="md:hidden" onClick={onOpenSidebar}>
          <Menu />
        </TooltipIconButton>
        <span className="hidden size-5 rounded-[5px] border-2 border-foreground/70 md:block" />
        <h1 className="truncate text-sm font-semibold" title={threadTitle}>
          {threadTitle}
        </h1>
      </div>

      <nav className="flex items-center gap-1" aria-label="工作台导航">
        <TooltipIconButton
          tooltip="返回首页"
          onClick={() => window.location.assign("https://first.sub2image.cc.cd")}
        >
          <Home />
        </TooltipIconButton>
        <TooltipIconButton
          tooltip="生图工作台"
          onClick={() => window.location.assign("https://sub2image.cc.cd")}
        >
          <ImageIcon />
        </TooltipIconButton>
        <TooltipIconButton
          tooltip={theme === "dark" ? "切换到浅色" : "切换到深色"}
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun /> : <Moon />}
        </TooltipIconButton>
        <ConnectionSettingsDialog
          trigger={
            <button
              type="button"
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="连接设置"
              title="连接设置"
            >
              <Settings2 className="size-4" />
            </button>
          }
        />
      </nav>
    </header>
  );
}
