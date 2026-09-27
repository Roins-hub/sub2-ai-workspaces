export const PROVIDERS = {
  hhl: {
    id: "hhl",
    name: "HHL 中转站",
    baseUrl: "https://sub2.hhlai.xyz",
    shortUrl: "sub2.hhlai.xyz",
  },
  ssszhuo: {
    id: "ssszhuo",
    name: "SSSZHUO 中转站",
    baseUrl: "https://ssszhuo.com",
    shortUrl: "ssszhuo.com",
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
