import { NextRequest, NextResponse } from "next/server";
import { type DashboardSummaryResponse } from "@/lib/dashboardSummary";
import {
  buildAnalyticsCompetencyDashboardQuery,
  isValidAnalyticsCompetencyId,
  type AnalyticsSummaryResponse,
  resolveAnalyticsCompetency,
} from "@/lib/analyticsCompetencies";

const dashboardBase =
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
  const competency = resolveAnalyticsCompetency(competencyId);

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

  if (!competency) {
    return jsonError(
      "Unknown analytics competency. Use a configured competencyId value.",
      404,
      "COMPETENCY_NOT_FOUND",
    );
  }

  if (!dashboardBase) {
    return jsonError(
      "Dashboard remote URL is not configured.",
      500,
      "DASHBOARD_URL_MISSING",
    );
  }

  const query = buildAnalyticsCompetencyDashboardQuery(competency.competencyId);
  if (!query) {
    return jsonError(
      "Analytics competency is not mapped to a dashboard query.",
      500,
      "COMPETENCY_QUERY_MISSING",
    );
  }

  const response = await fetch(`${dashboardBase}/dashboard/summary?${query}`, {
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

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

  const summary = (json?.body ?? json) as DashboardSummaryResponse;
  const { feedbackReceiverIds: _feedbackReceiverIds, ...publicSummary } =
    summary;
  const payload: AnalyticsSummaryResponse = {
    ...publicSummary,
    competency: {
      competencyId: competency.competencyId,
      displayName: competency.displayName,
      periodLabel: competency.periodLabel,
    },
  };

  return NextResponse.json(payload);
}
