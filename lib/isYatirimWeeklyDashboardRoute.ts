import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_IS_YATIRIM_WEEK_MODE,
  IS_YATIRIM_WEEKLY_CLIENT,
  applyIsYatirimWeekFilterToSearchParams,
  normalizeIsYatirimWeekFilter,
  normalizeIsYatirimWeeklySegment,
  normalizeIsYatirimWeeklyToken,
  normalizeWeeklyDashboardResponse,
  type IsYatirimWeekFilter,
} from "@/lib/isYatirimWeeklyDashboard";
import { getIsYatirimDashboardBaseUrl } from "@/lib/isYatirimLeadershipDashboardRoute";

export function buildIsYatirimWeeklyDashboardUrl({
  baseUrl,
  segment,
  token,
  weekFilter,
}: {
  baseUrl: string;
  segment?: string | null;
  token?: string | null;
  weekFilter?: IsYatirimWeekFilter;
}) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${normalizedBase}/analytics/dashboard`);
  const normalizedToken = normalizeIsYatirimWeeklyToken(token);
  const normalizedWeekFilter = normalizeIsYatirimWeekFilter({
    weekMode: weekFilter?.mode || DEFAULT_IS_YATIRIM_WEEK_MODE,
    weekStartDate: weekFilter?.weekStartDate,
  });

  url.searchParams.set("client", IS_YATIRIM_WEEKLY_CLIENT);
  url.searchParams.set("isWeekly", "true");
  url.searchParams.set("segment", normalizeIsYatirimWeeklySegment(segment));

  if (normalizedWeekFilter.mode !== DEFAULT_IS_YATIRIM_WEEK_MODE) {
    applyIsYatirimWeekFilterToSearchParams(url.searchParams, normalizedWeekFilter);
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

export async function handleIsYatirimWeeklyDashboardRequest(
  request: NextRequest,
) {
  const baseUrl = getIsYatirimDashboardBaseUrl();

  if (!baseUrl) {
    return jsonError(
      "İş Yatırım weekly dashboard backend URL is not configured.",
      500,
      "IS_YATIRIM_WEEKLY_DASHBOARD_REMOTE_URL_MISSING",
    );
  }

  const segment = normalizeIsYatirimWeeklySegment(
    request.nextUrl.searchParams.get("segment"),
  );
  const token = normalizeIsYatirimWeeklyToken(
    request.nextUrl.searchParams.get("token"),
  );
  const weekFilter = normalizeIsYatirimWeekFilter({
    weekMode: request.nextUrl.searchParams.get("weekMode"),
    weekStartDate: request.nextUrl.searchParams.get("weekStartDate"),
  });
  const upstreamUrl = buildIsYatirimWeeklyDashboardUrl({
    baseUrl,
    segment,
    token,
    weekFilter,
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
      "İş Yatırım weekly dashboard data source is unavailable.",
      502,
      "IS_YATIRIM_WEEKLY_DASHBOARD_UPSTREAM_UNAVAILABLE",
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
          "İş Yatırım weekly dashboard verisi alınamadı.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json(
    normalizeWeeklyDashboardResponse(json?.body ?? json, {
      fallbackWeekFilter: weekFilter,
      selectedSegment: segment,
    }),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
