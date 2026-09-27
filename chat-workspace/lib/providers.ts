export const PROVIDERS = {
  tangzhi: {
    id: "tangzhi",
    name: "Tangzhi 中转站",
    baseUrl: "https://new.tangzhi.org",
    shortUrl: "new.tangzhi.org",
  },
} as const;

/** 默认中转站;本地保存的旧中转站(已移除)会回落到这里 */
export const DEFAULT_PROVIDER_ID: ProviderId = "tangzhi";

export type ProviderId = keyof typeof PROVIDERS;

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}

export function providerApiBase(provider: ProviderId) {
  return `${PROVIDERS[provider].baseUrl}/v1`;
}

export function normalizeApiKey(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeModel(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
