"use client";

import { useRef, useState, type MouseEvent } from "react";
import { Download, FileUp, MessageSquare, Trash2, X } from "lucide-react";
import {
  ThreadListItems,
  ThreadListNew,
  ThreadListRoot,
} from "@/components/assistant-ui/thread-list";
import { clearChatHistory, exportChatBackup, importChatBackup } from "@/lib/indexed-db-storage";
import { cn } from "@/lib/utils";

function HistoryTools() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const exportHistory = async () => {
    setBusy(true);
    try {
      const json = await exportChatBackup();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `sub2-chat-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const importHistory = async (file: File) => {
    setBusy(true);
    try {
      await importChatBackup(await file.text());
      location.reload();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "导入失败");
    } finally {
      setBusy(false);
    }
  };

  const clearHistory = async () => {
    if (!window.confirm("确定清空此浏览器中的全部聊天记录吗？此操作无法撤销。")) return;
    setBusy(true);
    await clearChatHistory();
    location.reload();
  };

  return (
    <div className="sidebar-tools grid grid-cols-3 gap-1 p-2">
      <button className="history-tool" onClick={() => void exportHistory()} disabled={busy}>
        <Download /> 导出
      </button>
      <button className="history-tool" onClick={() => inputRef.current?.click()} disabled={busy}>
        <FileUp /> 导入
      </button>
      <button className="history-tool" onClick={() => void clearHistory()} disabled={busy}>
        <Trash2 /> 清空
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importHistory(file);
        }}
      />
    </div>
  );
}

type WorkspaceSidebarProps = {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
};

export function WorkspaceSidebar({ open, onClose, collapsed }: WorkspaceSidebarProps) {
  const closeMobileSidebarAfterNavigation = (event: MouseEvent<HTMLDivElement>) => {
    if (!(event.target instanceof Element)) return;
    if (
      event.target.closest(
        '[data-slot="aui_thread-list-item-trigger"], [data-slot="aui_thread-list-new"]',
      )
    ) {
      onClose();
    }
  };

  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/25 backdrop-blur-[1px] md:hidden"
          onClick={onClose}
          aria-label="关闭侧栏"
        />
      )}
      <aside
        className={cn(
          "workspace-sidebar fixed inset-y-0 start-0 z-40 flex w-65 shrink-0 flex-col overflow-hidden border-e transition-[width,transform] duration-200 md:relative md:z-0 md:translate-x-0",
          collapsed ? "md:w-12" : "md:w-65",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between px-2">
          <a
            href="https://first.sub2image.cc.cd"
            className="flex min-w-0 items-center gap-2 overflow-hidden px-2 text-sm font-medium"
          >
            <MessageSquare className="size-5 shrink-0" strokeWidth={2.15} />
            <span className="whitespace-nowrap text-foreground/90">SUB2 聊天</span>
          </a>
          <button
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
            onClick={onClose}
            aria-label="关闭侧栏"
          >
            <X className="size-4" />
          </button>
        </div>

        <ThreadListRoot
          className={cn(
            "relative min-h-0 flex-1 transition-[padding,width] duration-200",
            collapsed ? "md:w-12 md:overflow-hidden md:px-2 md:pt-1" : "w-65 overflow-y-auto p-3",
          )}
          onClick={closeMobileSidebarAfterNavigation}
        >
          <ThreadListNew
            className={cn(
              "overflow-hidden transition-all duration-200",
              collapsed
                ? "md:w-8 md:gap-0 md:px-2 md:has-[>svg]:px-2"
                : "w-full gap-2 px-2.5 has-[>svg]:px-2.5",
            )}
            labelClassName={cn(
              "overflow-hidden transition-all duration-200",
              collapsed ? "md:max-w-0 md:opacity-0" : "max-w-24 opacity-100",
            )}
            title={collapsed ? "新聊天" : undefined}
          />
          <ThreadListItems
            aria-hidden={collapsed}
            inert={collapsed}
            className={cn(
              "transition-[opacity,transform] duration-150",
              collapsed ? "md:pointer-events-none md:opacity-0" : "translate-x-0 opacity-100",
            )}
          />
        </ThreadListRoot>

        <div
          aria-hidden={collapsed}
          inert={collapsed}
          className={cn(
            "transition-opacity duration-150",
            collapsed && "md:pointer-events-none md:opacity-0",
          )}
        >
          <HistoryTools />
        </div>
      </aside>
    </>
  );
}
