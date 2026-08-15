"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  WebSpeechDictationAdapter,
  useRemoteThreadListRuntime,
  Tools,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { AuiConfig } from "@assistant-ui/store";
import { McpLocalStorage, McpManagerResource, McpOAuthCallback } from "@assistant-ui/react-mcp";
import { lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { useRouter } from "next/navigation";
import { Thread } from "@/components/assistant-ui/thread";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import { WorkspaceHeader } from "@/components/workspace-header";
import { ChatSettingsProvider, useChatSettings } from "@/components/chat-settings";
import { PluginSettingsProvider, usePluginSettings } from "@/components/plugin-settings";
import { indexedDbThreadAdapter } from "@/lib/thread-adapter";
import { imageWorkspaceToolkit } from "@/components/image-workspace-tool";
import { IMAGE_WORKSPACE_TOOL_NAME } from "@/lib/image-workspace";

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

const assistantConfig = AuiConfig({
  tools: Tools({ toolkit: imageWorkspaceToolkit }),
  mcp: McpManagerResource({
    connectors: [],
    storage: McpLocalStorage({ keyPrefix: "sub2-chat-mcp" }),
    connectionTimeout: 15_000,
  }),
});

const shouldContinueAfterFrontendTool = ({ messages }: { messages: UIMessage[] }) => {
  if (!lastAssistantMessageIsCompleteWithToolCalls({ messages })) return false;
  const lastMessage = messages.at(-1);
  const usedImageWorkspace = lastMessage?.parts.some((part) => {
    if (part.type === `tool-${IMAGE_WORKSPACE_TOOL_NAME}`) return true;
    return "toolName" in part && part.toolName === IMAGE_WORKSPACE_TOOL_NAME;
  });
  return !usedImageWorkspace;
};

function ChatRuntime({ children }: { children: React.ReactNode }) {
  const { provider, apiKey, model, webSearch } = useChatSettings();
  const plugins = usePluginSettings();
  const imagePluginEnabled = plugins.isEnabled("image-workspace");
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
            imagePluginEnabled,
          },
        }),
      }),
    [provider, apiKey, model, webSearch, imagePluginEnabled],
  );

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () =>
      useChatRuntime({
        transport,
        sendAutomaticallyWhen: shouldContinueAfterFrontendTool,
        adapters: {
          attachments: attachmentAdapter,
          ...(dictationAdapter ? { dictation: dictationAdapter } : {}),
        },
      }),
    adapter: indexedDbThreadAdapter,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={assistantConfig}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="workspace-shell h-dvh overflow-hidden bg-background p-0 text-foreground md:p-5">
      <div className="workspace-frame mx-auto flex h-full max-w-[1720px] overflow-hidden">
        <WorkspaceSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
        />
        <div className="chat-panel-shell flex min-w-0 flex-1 flex-col overflow-hidden p-2 md:ps-0">
          <main className="chat-panel relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg bg-background">
            <WorkspaceHeader
              onOpenSidebar={() => setSidebarOpen(true)}
              sidebarCollapsed={sidebarCollapsed}
              onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
            />
            <div className="min-h-0 flex-1">
              <Thread />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export function Assistant() {
  return (
    <ChatSettingsProvider>
      <PluginSettingsProvider>
        <ChatRuntime>
          <Workspace />
        </ChatRuntime>
      </PluginSettingsProvider>
    </ChatSettingsProvider>
  );
}

function McpCallbackContent() {
  const router = useRouter();

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 text-foreground">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-sm">
        <McpOAuthCallback onComplete={() => router.replace("/")} onError={() => undefined}>
          {({ status, error }) => (
            <>
              <h1 className="text-base font-semibold">MCP 授权</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {status === "error"
                  ? "授权未完成，请返回聊天工作台检查服务配置。"
                  : status === "done"
                    ? "授权完成，正在返回聊天工作台。"
                    : "正在完成授权，请不要关闭此页面。"}
              </p>
              {error && (
                <p className="mt-4 rounded-lg border border-destructive/20 bg-destructive/8 px-3 py-2 text-xs text-destructive">
                  {error.message}
                </p>
              )}
              {status === "error" && (
                <button
                  type="button"
                  onClick={() => router.replace("/")}
                  className="mt-4 h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  返回聊天工作台
                </button>
              )}
            </>
          )}
        </McpOAuthCallback>
      </div>
    </main>
  );
}

export function AssistantMcpOAuthCallback() {
  return (
    <ChatSettingsProvider>
      <PluginSettingsProvider>
        <ChatRuntime>
          <McpCallbackContent />
        </ChatRuntime>
      </PluginSettingsProvider>
    </ChatSettingsProvider>
  );
}
