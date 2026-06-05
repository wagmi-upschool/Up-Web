import { NextRequest, NextResponse } from "next/server";
import {
  IS_YATIRIM_CLIENT,
  IS_YATIRIM_COMPETENCY_ID,
  normalizeIsYatirimSegment,
  normalizeLeadershipDashboardResponse,
} from "@/lib/isYatirimLeadershipDashboard";

type DashboardEnv = Record<string, string | undefined>;

export function getIsYatirimDashboardBaseUrl(env: DashboardEnv = process.env) {
  return (
    env.IS_YATIRIM_DASHBOARD_REMOTE_URL ||
    env.NEXT_PUBLIC_IS_YATIRIM_DASHBOARD_REMOTE_URL ||
    env.DASHBOARD_REMOTE_URL ||
    env.REMOTE_URL ||
    ""
  ).replace(/\/+$/, "");
}

export function buildIsYatirimDashboardUrl({
  baseUrl,
  segment,
}: {
  baseUrl: string;
  segment?: string | null;
}) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBase}/analytics/dashboard`);

  url.searchParams.set("client", IS_YATIRIM_CLIENT);
  url.searchParams.set("competencyId", IS_YATIRIM_COMPETENCY_ID);
  url.searchParams.set("segment", normalizeIsYatirimSegment(segment));

  return url;
}

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json(
    { errorCode: code, errorMessage: message },
    { status },
  );
}

export async function handleIsYatirimLeadershipDashboardRequest(
  request: NextRequest,
) {
  const baseUrl = getIsYatirimDashboardBaseUrl();

  if (!baseUrl) {
    return jsonError(
      "İş Yatırım dashboard backend URL is not configured.",
      500,
      "IS_YATIRIM_DASHBOARD_REMOTE_URL_MISSING",
    );
  }

  const segment = normalizeIsYatirimSegment(
    request.nextUrl.searchParams.get("segment"),
  );
  const upstreamUrl = buildIsYatirimDashboardUrl({ baseUrl, segment });

  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });
  } catch {
    return jsonError(
      "İş Yatırım dashboard data source is unavailable.",
      502,
      "IS_YATIRIM_DASHBOARD_UPSTREAM_UNAVAILABLE",
    );
  }

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        errorCode:
          json?.body?.errorCode ||
          json?.errorCode ||
          `UPSTREAM_${response.status}`,
        errorMessage:
          json?.body?.errorMessage ||
          json?.errorMessage ||
          response.statusText ||
          "İş Yatırım dashboard verisi alınamadı.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json(
    normalizeLeadershipDashboardResponse(json?.body ?? json),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
