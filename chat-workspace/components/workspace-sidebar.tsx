"use client";

import { useRef, useState } from "react";
import { Download, FileUp, MessageSquare, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import {
  ThreadListItemPrimitive,
  ThreadListPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { clearChatHistory, exportChatBackup, importChatBackup } from "@/lib/indexed-db-storage";
import { cn } from "@/lib/utils";

function ThreadItem({ query }: { query: string }) {
  const aui = useAui();
  const title = useAuiState((state) => state.threadListItem.title ?? "新聊天");
  const isMain = useAuiState((state) => state.threads.mainThreadId === state.threadListItem.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);

  if (query && !title.toLowerCase().includes(query.toLowerCase())) return null;

  const submitRename = async () => {
    const next = draft.trim();
    if (next) await aui.threadListItem.rename(next);
    setEditing(false);
  };

  return (
    <ThreadListItemPrimitive.Root
      className={cn("thread-item group relative flex items-center", isMain && "thread-item-active")}
    >
      {editing ? (
        <form
          className="flex w-full items-center px-2 py-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            void submitRename();
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            autoFocus
            onBlur={() => void submitRename()}
            className="min-w-0 flex-1 rounded-md border bg-background px-2 py-1.5 text-sm outline-none"
          />
        </form>
      ) : (
        <>
          <ThreadListItemPrimitive.Trigger className="min-w-0 flex-1 truncate px-3 py-2.5 pr-16 text-left text-sm">
            <ThreadListItemPrimitive.Title fallback="新聊天" />
          </ThreadListItemPrimitive.Trigger>
          <div className="absolute right-1.5 flex opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => {
                setDraft(title);
                setEditing(true);
              }}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
              title="重命名"
            >
              <Pencil className="size-3.5" />
            </button>
            <ThreadListItemPrimitive.Delete
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-destructive"
              title="删除"
            >
              <Trash2 className="size-3.5" />
            </ThreadListItemPrimitive.Delete>
          </div>
        </>
      )}
    </ThreadListItemPrimitive.Root>
  );
}

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

export function WorkspaceSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");

  return (
    <>
      {open && (
        <button
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={onClose}
          aria-label="关闭侧栏"
        />
      )}
      <aside
        className={cn(
          "workspace-sidebar fixed inset-y-0 left-0 z-40 flex w-[300px] shrink-0 flex-col transition-transform md:relative md:z-0 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <a href="https://first.sub2image.cc.cd" className="flex items-center gap-2.5">
            <MessageSquare className="size-5" strokeWidth={2.2} />
            <strong className="text-sm font-semibold">SUB2 聊天</strong>
          </a>
          <button
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
            onClick={onClose}
            aria-label="关闭侧栏"
          >
            <X className="size-4" />
          </button>
        </div>

        <ThreadListPrimitive.Root className="flex min-h-0 flex-1 flex-col px-3">
          <ThreadListPrimitive.New className="new-thread-button mb-3 flex w-full items-center gap-2 px-3 py-3 text-sm font-medium">
            <Plus className="size-4" />
            新聊天
          </ThreadListPrimitive.New>

          <div className="sidebar-search mb-2 flex items-center px-2.5">
            <Search className="size-3.5 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索聊天"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs outline-none"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            <ThreadListPrimitive.Items>
              {() => <ThreadItem query={query} />}
            </ThreadListPrimitive.Items>
          </div>
          <HistoryTools />
        </ThreadListPrimitive.Root>
      </aside>
    </>
  );
}
