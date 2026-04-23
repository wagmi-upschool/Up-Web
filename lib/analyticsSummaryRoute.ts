import { NextRequest, NextResponse } from "next/server";
import {
  type AnalyticsSummaryResponse,
  isValidAnalyticsCompetencyId,
} from "@/lib/analyticsCompetencies";

const analyticsBase =
  process.env.DASHBOARD_REMOTE_URL ||
  process.env.NEXT_PUBLIC_DASHBOARD_REMOTE_URL ||
  process.env.REMOTE_URL ||
  process.env.NEXT_PUBLIC_REMOTE_URL;

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json(
    { errorCode: code, errorMessage: message },
    { status },
  );
}

export async function handleAnalyticsSummaryRequest(request: NextRequest) {
  const competencyId = request.nextUrl.searchParams.get("competencyId");

  if (!competencyId?.trim()) {
    return jsonError(
      "competencyId query parameter is required.",
      400,
      "COMPETENCY_ID_REQUIRED",
    );
  }

  if (!isValidAnalyticsCompetencyId(competencyId)) {
    return jsonError(
      "competencyId must be a valid UUID.",
      400,
      "COMPETENCY_ID_INVALID",
    );
  }

  if (!analyticsBase) {
    return jsonError(
      "Analytics remote URL is not configured.",
      500,
      "ANALYTICS_URL_MISSING",
    );
  }

  const query = new URLSearchParams({
    competencyId: competencyId.trim(),
  });
  const response = await fetch(
    `${analyticsBase}/analytics/summary?${query.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    return NextResponse.json(
      {
        errorCode: json?.body?.errorCode || json?.errorCode || response.status,
        errorMessage:
          json?.body?.errorMessage ||
          json?.errorMessage ||
          response.statusText ||
          "Dashboard data could not be loaded.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json((json?.body ?? json) as AnalyticsSummaryResponse);
}
