"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  WebSpeechDictationAdapter,
  useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "@/components/assistant-ui/thread";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspaceHeader } from "@/components/workspace-header";
import { ChatSettingsProvider, useChatSettings } from "@/components/chat-settings";
import { indexedDbThreadAdapter } from "@/lib/thread-adapter";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const baseAttachmentAdapter = new CompositeAttachmentAdapter([
  new SimpleImageAttachmentAdapter(),
  new SimpleTextAttachmentAdapter(),
]);

const attachmentAdapter = {
  accept: baseAttachmentAdapter.accept,
  add: ({ file }: { file: File }) => {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("单个附件不能超过 10 MB");
    }
    return baseAttachmentAdapter.add({ file });
  },
  send: baseAttachmentAdapter.send.bind(baseAttachmentAdapter),
  remove: baseAttachmentAdapter.remove.bind(baseAttachmentAdapter),
};

function ChatRuntime({ children }: { children: React.ReactNode }) {
  const { provider, apiKey, model, webSearch, tavilyApiKey } = useChatSettings();
  const [dictationAdapter, setDictationAdapter] = useState<WebSpeechDictationAdapter | undefined>(
    undefined,
  );

  useEffect(() => {
    if (WebSpeechDictationAdapter.isSupported()) {
      setDictationAdapter(
        new WebSpeechDictationAdapter({
          language: "zh-CN",
          continuous: true,
          interimResults: true,
        }),
      );
    }
  }, []);

  const transport = useMemo(
    () =>
      new AssistantChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: async (options) => ({
          body: {
            ...(options.body as Record<string, unknown> | undefined),
            id: options.id,
            messages: options.messages,
            trigger: options.trigger,
            messageId: options.messageId,
            metadata: options.requestMetadata,
            provider,
            key: apiKey,
            model,
            webSearch,
            tavilyApiKey,
          },
        }),
      }),
    [provider, apiKey, model, webSearch, tavilyApiKey],
  );

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () =>
      useChatRuntime({
        transport,
        adapters: {
          attachments: attachmentAdapter,
          ...(dictationAdapter ? { dictation: dictationAdapter } : {}),
        },
      }),
    adapter: indexedDbThreadAdapter,
  });

  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="workspace-shell h-dvh overflow-hidden bg-background p-0 text-foreground md:p-5">
      <div className="workspace-frame mx-auto flex h-full max-w-[1720px] overflow-hidden">
        <WorkspaceSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="chat-panel relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <WorkspaceHeader onOpenSidebar={() => setSidebarOpen(true)} />
          <div className="min-h-0 flex-1">
            <Thread />
          </div>
        </main>
      </div>
    </div>
  );
}

export function Assistant() {
  return (
    <ChatSettingsProvider>
      <ChatRuntime>
        <Workspace />
      </ChatRuntime>
    </ChatSettingsProvider>
  );
}
