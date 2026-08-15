export const REASONING_EFFORTS = ["none", "low", "medium", "high", "xhigh", "max"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export const REASONING_EFFORT_LABELS: Record<ReasoningEffort, string> = {
  none: "最低",
  low: "较低",
  medium: "中等",
  high: "高级",
  xhigh: "极高",
  max: "最大",
};

export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium";

export const isReasoningEffort = (value: unknown): value is ReasoningEffort =>
  typeof value === "string" && REASONING_EFFORTS.includes(value as ReasoningEffort);

const THROUGH_HIGH = REASONING_EFFORTS.slice(0, 4);
const THROUGH_XHIGH = REASONING_EFFORTS.slice(0, 5);

export const reasoningEffortsForModel = (model: string): readonly ReasoningEffort[] => {
  const normalized = model.trim().toLowerCase();

  if (/^gpt-5\.6(?:-|$)/.test(normalized)) return REASONING_EFFORTS;
  if (/^gpt-5\.5(?:-|$)/.test(normalized)) return THROUGH_XHIGH;
  if (/^gpt-5\.4-mini(?:-|$)/.test(normalized)) return THROUGH_XHIGH;
  if (/^gpt-5\.4(?:-|$)/.test(normalized)) return THROUGH_HIGH;

  return [];
};

export const normalizeReasoningEffort = (value: unknown): ReasoningEffort | null => {
  if (value === "minimal") return "none";
  return isReasoningEffort(value) ? value : null;
};

export const clampReasoningEffort = (
  model: string,
  effort: ReasoningEffort,
): ReasoningEffort | null => {
  const available = reasoningEffortsForModel(model);
  if (available.length === 0) return null;
  if (available.includes(effort)) return effort;
  return available.at(-1) ?? DEFAULT_REASONING_EFFORT;
};
