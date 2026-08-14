export const PROVIDERS = {
  hhl: {
    id: "hhl",
    name: "HHL 中转站",
    baseUrl: "https://sub2.hhlai.xyz",
    shortUrl: "sub2.hhlai.xyz",
  },
  xiaoxin: {
    id: "xiaoxin",
    name: "小新中转站",
    baseUrl: "https://xiaoxin8.com",
    shortUrl: "xiaoxin8.com",
  },
} as const;

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
