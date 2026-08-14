"use client";

import { useState, type ReactElement } from "react";
import { Check, ExternalLink, Eye, EyeOff, KeyRound, RefreshCw, Wifi } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useChatSettings } from "@/components/chat-settings";
import { ModelSelect } from "@/components/model-select";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import { cn } from "@/lib/utils";

export function ConnectionSettingsDialog({ trigger }: { trigger: ReactElement }) {
  const settings = useChatSettings();
  const [showKey, setShowKey] = useState(false);
  const [showTavilyKey, setShowTavilyKey] = useState(false);

  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent className="settings-dialog max-h-[min(760px,calc(100dvh-2rem))] w-full overflow-y-auto p-0 sm:max-w-[560px]">
        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-lg font-semibold">连接设置</DialogTitle>
          <DialogDescription>
            Key 只用于转发请求，可选择仅在本次浏览器会话中保存。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 py-5">
          <section className="space-y-2.5">
            <div className="text-sm font-medium">中转站</div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PROVIDERS) as ProviderId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => settings.setProvider(id)}
                  className={cn(
                    "provider-choice relative flex min-w-0 items-center gap-2 px-3 py-3 text-left text-sm",
                    settings.provider === id && "provider-choice-active",
                  )}
                >
                  <span className="flex size-5 items-center justify-center">
                    {settings.provider === id && <Check className="size-4" />}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate font-medium">{PROVIDERS[id].name}</strong>
                    <small className="block truncate text-muted-foreground">
                      {PROVIDERS[id].shortUrl}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <label className="flex items-center gap-2 text-sm font-medium" htmlFor="api-key">
              <KeyRound className="size-4" /> API Key
            </label>
            <div className="settings-input flex items-center">
              <input
                id="api-key"
                value={settings.apiKey}
                onChange={(event) => settings.setApiKey(event.target.value)}
                type={showKey ? "text" : "password"}
                placeholder="sk-..."
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey((current) => !current)}
                className="mr-1.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label={showKey ? "隐藏 Key" : "显示 Key"}
                title={showKey ? "隐藏 Key" : "显示 Key"}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <label className="flex cursor-pointer items-center justify-between gap-4 py-1 text-sm">
              <span>
                <span className="block">记住 Key</span>
                <span className="text-xs text-muted-foreground">
                  关闭后将写入此浏览器的本地存储
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.rememberKey}
                onChange={(event) => settings.setRememberKey(event.target.checked)}
                className="switch-control"
              />
            </label>
          </section>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">聊天模型</span>
              <button
                type="button"
                onClick={() => void settings.loadModels()}
                disabled={settings.loadState === "loading"}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-60"
              >
                <RefreshCw
                  className={cn("size-3.5", settings.loadState === "loading" && "animate-spin")}
                />
                {settings.loadState === "loading" ? "获取中" : "获取模型"}
              </button>
            </div>
            <div className="relative">
              {settings.models.length > 0 ? (
                <ModelSelect
                  models={settings.models}
                  value={settings.model}
                  onValueChange={settings.setModel}
                />
              ) : (
                <div className="settings-input">
                  <input
                    value={settings.model}
                    onChange={(event) => settings.setModel(event.target.value)}
                    placeholder="获取模型，或手动填写模型名称"
                    className="w-full bg-transparent px-3.5 py-3 text-sm outline-none"
                  />
                </div>
              )}
            </div>
            {settings.loadError && (
              <p className="text-xs leading-relaxed text-destructive">{settings.loadError}</p>
            )}
            {settings.loadState === "success" && (
              <p className="text-xs text-muted-foreground">
                已从 {PROVIDERS[settings.provider].shortUrl} 获取 {settings.models.length} 个模型
              </p>
            )}
          </section>

          <section className="space-y-3 border-t pt-5">
            <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2">
                <Wifi className="size-4" />
                <span>
                  <span className="block">联网搜索</span>
                  <span className="text-xs text-muted-foreground">使用 Tavily 搜索，再由当前模型整理回答</span>
                </span>
              </span>
              <input
                type="checkbox"
                checked={settings.webSearch}
                onChange={(event) => settings.setWebSearch(event.target.checked)}
                className="switch-control"
              />
            </label>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="tavily-api-key">
                  Tavily API Key
                </label>
                <a
                  href="https://app.tavily.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  申请 API Key <ExternalLink className="size-3" />
                </a>
              </div>
              <div className="settings-input flex items-center">
                <input
                  id="tavily-api-key"
                  value={settings.tavilyApiKey}
                  onChange={(event) => settings.setTavilyApiKey(event.target.value)}
                  type={showTavilyKey ? "text" : "password"}
                  placeholder="tvly-..."
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowTavilyKey((current) => !current)}
                  className="mr-1.5 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={showTavilyKey ? "隐藏 Tavily Key" : "显示 Tavily Key"}
                  title={showTavilyKey ? "隐藏 Tavily Key" : "显示 Tavily Key"}
                >
                  {showTavilyKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                仅保存在当前浏览器会话，关闭浏览器后自动清除。
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
