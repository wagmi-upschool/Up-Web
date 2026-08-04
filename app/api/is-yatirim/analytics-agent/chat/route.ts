import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

function upstreamUrl() {
  const explicit = process.env.IS_YATIRIM_AGENT_STREAM_URL?.trim();
  if (explicit) return explicit;

  const baseUrl = (
    process.env.REMOTE_URL || process.env.NEXT_PUBLIC_REMOTE_URL || ""
  )
    .trim()
    .replace(/\/+$/, "");
  if (!baseUrl) return "";
  return `${baseUrl}/agent/isy/chat`;
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  const idTokenHeader = request.headers.get("x-id-token")?.trim() || "";
  const idToken = idTokenHeader.replace(/^Bearer\s+/i, "");
  if (!idToken) {
    return jsonError(401, "UNAUTHORIZED", "Authentication is required.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_REQUEST", "A valid JSON body is required.");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError(400, "INVALID_REQUEST", "A JSON object is required.");
  }

  const streamUrl = upstreamUrl();
  if (!streamUrl) {
    return jsonError(
      500,
      "CONFIGURATION_ERROR",
      "The analytics agent is unavailable.",
    );
  }

  try {
    const upstream = await fetch(streamUrl, {
      method: "POST",
      headers: {
        Authorization: idToken,
        Accept: "application/x-ndjson",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: request.signal,
    });

    if (!upstream.body) {
      return jsonError(
        upstream.ok ? 502 : upstream.status,
        "UPSTREAM_EMPTY_RESPONSE",
        "The analytics agent returned no response body.",
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("Content-Type") ||
          (upstream.ok
            ? "application/x-ndjson; charset=utf-8"
            : "application/json; charset=utf-8"),
        "Cache-Control": "no-store, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return jsonError(499, "CLIENT_CANCELLED", "The request was cancelled.");
    }
    console.error("is_yatirim_agent_proxy_failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError(
      502,
      "UPSTREAM_UNAVAILABLE",
      "The analytics agent could not be reached.",
    );
  }
}
