import { isProviderId, normalizeApiKey, PROVIDERS } from "@/lib/providers";

export const runtime = "nodejs";

const errorResponse = (message: string, status: number) =>
  Response.json({ error: message }, { status });

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("请求内容不是有效的 JSON。", 400);
  }

  const input = body as { provider?: unknown; key?: unknown };
  if (!isProviderId(input.provider)) {
    return errorResponse("不支持的中转站。", 400);
  }

  const apiKey = normalizeApiKey(input.key);
  if (!apiKey || apiKey.length > 4096) {
    return errorResponse("请填写有效的 API Key。", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const upstream = await fetch(`${PROVIDERS[input.provider].baseUrl}/v1/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const raw = await upstream.text();
    if (!upstream.ok) {
      let detail = raw.slice(0, 300);
      try {
        const parsed = JSON.parse(raw) as {
          error?: { message?: string } | string;
          message?: string;
        };
        detail =
          (typeof parsed.error === "string" ? parsed.error : parsed.error?.message) ??
          parsed.message ??
          detail;
      } catch {}

      return errorResponse(
        `中转站返回 ${upstream.status}${detail ? `：${detail}` : ""}`,
        upstream.status === 401 || upstream.status === 403 ? 401 : 502,
      );
    }

    const payload = JSON.parse(raw) as { data?: Array<{ id?: unknown }> };
    const models = Array.from(
      new Set(
        (payload.data ?? [])
          .map((item) => item.id)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return Response.json({ models }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse("连接中转站超时，请稍后重试。", 504);
    }
    return errorResponse("无法连接中转站，请检查其服务状态。", 502);
  } finally {
    clearTimeout(timeout);
  }
}
