import { NextRequest, NextResponse } from "next/server";
import {
  IS_YATIRIM_CLIENT,
  IS_YATIRIM_COMPETENCY_ID,
  normalizeIsYatirimDateFilter,
  normalizeIsYatirimDashboardToken,
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
  token,
  dateFilter,
}: {
  baseUrl: string;
  segment?: string | null;
  token?: string | null;
  dateFilter?: {
    mode: "single" | "range";
    startDate: string;
    endDate: string;
  };
}) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBase}/analytics/dashboard`);
  const normalizedToken = normalizeIsYatirimDashboardToken(token);

  url.searchParams.set("client", IS_YATIRIM_CLIENT);
  url.searchParams.set("competencyId", IS_YATIRIM_COMPETENCY_ID);
  url.searchParams.set("segment", normalizeIsYatirimSegment(segment));
  if (dateFilter) {
    url.searchParams.set("dateMode", dateFilter.mode);
    url.searchParams.set("startDate", dateFilter.startDate);
    url.searchParams.set("endDate", dateFilter.endDate);
  }
  if (normalizedToken) {
    url.searchParams.set("token", normalizedToken);
  }

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
  const token = normalizeIsYatirimDashboardToken(
    request.nextUrl.searchParams.get("token"),
  );
  const hasExplicitDateFilter =
    request.nextUrl.searchParams.has("dateMode") ||
    request.nextUrl.searchParams.has("startDate") ||
    request.nextUrl.searchParams.has("endDate");
  const dateFilter = hasExplicitDateFilter
    ? normalizeIsYatirimDateFilter(
        {
          dateMode: request.nextUrl.searchParams.get("dateMode"),
          startDate: request.nextUrl.searchParams.get("startDate"),
          endDate: request.nextUrl.searchParams.get("endDate"),
        },
        {
          todayDate: request.nextUrl.searchParams.get("startDate") || undefined,
        },
      )
    : undefined;
  const upstreamUrl = buildIsYatirimDashboardUrl({
    baseUrl,
    segment,
    token,
    dateFilter,
  });

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
    normalizeLeadershipDashboardResponse(json?.body ?? json, {
      fallbackDateFilter: dateFilter,
    }),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
