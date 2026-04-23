import { NextRequest, NextResponse } from "next/server";
import {
  normalizeAnalyticsDashboardResponse,
  type AnalyticsDashboardResponse,
} from "@/lib/analyticsDashboard";
import {
  buildMockAnalyticsDashboard,
} from "@/lib/analyticsDashboardMock";
import { isValidAnalyticsCompetencyId } from "@/lib/analyticsCompetencies";

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

function buildFallbackDashboard(
  competencyId: string,
  period?: string | null,
  company?: string | null,
) {
  return normalizeAnalyticsDashboardResponse(
    buildMockAnalyticsDashboard({
      competencyId,
      period,
      company,
    }),
    competencyId,
  );
}

export async function handleAnalyticsDashboardRequest(request: NextRequest) {
  const competencyId = request.nextUrl.searchParams.get("competencyId");
  const period = request.nextUrl.searchParams.get("period");
  const company = request.nextUrl.searchParams.get("company");

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
    return NextResponse.json(
      buildFallbackDashboard(competencyId.trim(), period, company),
    );
  }

  const query = new URLSearchParams({
    competencyId: competencyId.trim(),
  });

  if (period?.trim()) {
    query.set("period", period.trim());
  }

  if (company?.trim()) {
    query.set("company", company.trim());
  }

  const response = await fetch(
    `${analyticsBase}/analytics/dashboard?${query.toString()}`,
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
    if (response.status === 404) {
      return NextResponse.json(
        buildFallbackDashboard(competencyId.trim(), period, company),
      );
    }

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

  return NextResponse.json(
    normalizeAnalyticsDashboardResponse(
      (json?.body ?? json) as AnalyticsDashboardResponse,
      competencyId.trim(),
    ),
  );
}
