"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { PROVIDERS, type ProviderId } from "@/lib/providers";
import {
  clampReasoningEffort,
  DEFAULT_REASONING_EFFORT,
  normalizeReasoningEffort,
  reasoningEffortsForModel,
  type ReasoningEffort,
} from "@/lib/reasoning";

type LoadState = "idle" | "loading" | "success" | "error";

type ChatSettingsValue = {
  provider: ProviderId;
  setProvider: (provider: ProviderId) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  rememberKey: boolean;
  setRememberKey: (remember: boolean) => void;
  model: string;
  setModel: (model: string) => void;
  models: string[];
  loadModels: () => Promise<void>;
  loadState: LoadState;
  loadError: string;
  webSearch: boolean;
  setWebSearch: (enabled: boolean) => void;
  reasoningEffort: ReasoningEffort;
  setReasoningEffort: (effort: ReasoningEffort) => void;
};

const ChatSettingsContext = createContext<ChatSettingsValue | null>(null);

const keyName = (provider: ProviderId) => `sub2chat:key:${provider}`;
const rememberName = (provider: ProviderId) => `sub2chat:remember:${provider}`;
const modelName = (provider: ProviderId) => `sub2chat:model:${provider}`;

export function ChatSettingsProvider({ children }: { children: React.ReactNode }) {
  const [provider, setProviderState] = useState<ProviderId>("hhl");
  const [apiKey, setApiKeyState] = useState("");
  const [rememberKey, setRememberKeyState] = useState(false);
  const [model, setModelState] = useState("");
  const [modelsByProvider, setModelsByProvider] = useState<Partial<Record<ProviderId, string[]>>>(
    {},
  );
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [loadError, setLoadError] = useState("");
  const [webSearch, setWebSearchState] = useState(false);
  const [reasoningEffort, setReasoningEffortState] =
    useState<ReasoningEffort>(DEFAULT_REASONING_EFFORT);

  const hydrateProvider = useCallback((next: ProviderId) => {
    const remembered = localStorage.getItem(rememberName(next)) === "true";
    const storedKey = remembered
      ? localStorage.getItem(keyName(next))
      : sessionStorage.getItem(keyName(next));
    setApiKeyState(storedKey ?? "");
    setRememberKeyState(remembered);
    setModelState(localStorage.getItem(modelName(next)) ?? "");
    setLoadState("idle");
    setLoadError("");
  }, []);

  useEffect(() => {
    const storedProvider = localStorage.getItem("sub2chat:provider");
    const next =
      storedProvider && storedProvider in PROVIDERS ? (storedProvider as ProviderId) : "hhl";
    setProviderState(next);
    hydrateProvider(next);
    setWebSearchState(localStorage.getItem("sub2chat:web-search") === "true");
    const storedReasoningEffort = localStorage.getItem("sub2chat:reasoning-effort");
    setReasoningEffortState(
      normalizeReasoningEffort(storedReasoningEffort) ?? DEFAULT_REASONING_EFFORT,
    );
  }, [hydrateProvider]);

  useEffect(() => {
    const available = reasoningEffortsForModel(model);
    if (available.length === 0 || available.includes(reasoningEffort)) return;

    const next = available.at(-1) ?? DEFAULT_REASONING_EFFORT;
    setReasoningEffortState(next);
    localStorage.setItem("sub2chat:reasoning-effort", next);
  }, [model, reasoningEffort]);

  const setProvider = (next: ProviderId) => {
    setProviderState(next);
    localStorage.setItem("sub2chat:provider", next);
    hydrateProvider(next);
  };

  const setApiKey = (key: string) => {
    setApiKeyState(key);
    if (rememberKey) localStorage.setItem(keyName(provider), key);
    else sessionStorage.setItem(keyName(provider), key);
  };

  const setRememberKey = (remember: boolean) => {
    setRememberKeyState(remember);
    localStorage.setItem(rememberName(provider), String(remember));
    if (remember) {
      localStorage.setItem(keyName(provider), apiKey);
      sessionStorage.removeItem(keyName(provider));
    } else {
      sessionStorage.setItem(keyName(provider), apiKey);
      localStorage.removeItem(keyName(provider));
    }
  };

  const setModel = (next: string) => {
    setModelState(next);
    localStorage.setItem(modelName(provider), next);
  };

  const setWebSearch = (enabled: boolean) => {
    setWebSearchState(enabled);
    localStorage.setItem("sub2chat:web-search", String(enabled));
  };

  const setReasoningEffort = (effort: ReasoningEffort) => {
    const next = clampReasoningEffort(model, effort) ?? effort;
    setReasoningEffortState(next);
    localStorage.setItem("sub2chat:reasoning-effort", next);
  };

  const loadModels = async () => {
    if (!apiKey.trim()) {
      setLoadState("error");
      setLoadError("请先填写 API Key");
      return;
    }
    setLoadState("loading");
    setLoadError("");
    try {
      const response = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key: apiKey }),
      });
      const data = (await response.json()) as { models?: string[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "获取模型失败");
      const nextModels = data.models ?? [];
      setModelsByProvider((current) => ({ ...current, [provider]: nextModels }));
      if (nextModels.length > 0 && !nextModels.includes(model)) {
        setModel(nextModels[0]!);
      }
      setLoadState("success");
    } catch (error) {
      setLoadState("error");
      setLoadError(error instanceof Error ? error.message : "获取模型失败");
    }
  };

  const value = useMemo<ChatSettingsValue>(
    () => ({
      provider,
      setProvider,
      apiKey,
      setApiKey,
      rememberKey,
      setRememberKey,
      model,
      setModel,
      models: modelsByProvider[provider] ?? [],
      loadModels,
      loadState,
      loadError,
      webSearch,
      setWebSearch,
      reasoningEffort,
      setReasoningEffort,
    }),
    [
      provider,
      apiKey,
      rememberKey,
      model,
      modelsByProvider,
      loadState,
      loadError,
      webSearch,
      reasoningEffort,
    ],
  );

  return <ChatSettingsContext.Provider value={value}>{children}</ChatSettingsContext.Provider>;
}

export function useChatSettings() {
  const value = useContext(ChatSettingsContext);
  if (!value) throw new Error("useChatSettings must be used inside provider");
  return value;
}
