"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import AnalyticsDashboardPage from "@/components/analytics-dashboard/dashboard-page";
import type { AnalyticsDashboardResponse } from "@/lib/analyticsDashboard";

async function getAnalyticsDashboard(
  competencyId: string,
  period: string,
  company: string,
) {
  const query = new URLSearchParams({
    competencyId,
  });

  if (period) {
    query.set("period", period);
  }

  if (company && company !== "all") {
    query.set("company", company);
  }

  const response = await fetch(
    `/analytics/dashboard?${query.toString()}`,
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
    const code = json?.errorCode || response.status;
    const message =
      json?.errorMessage || response.statusText || "Dashboard verisi alınamadı.";
    throw new Error(`${code}: ${message}`);
  }

  return json as AnalyticsDashboardResponse;
}

function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [, ...messageParts] = raw.split(":");
  return messageParts.join(":").trim() || raw;
}

function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCompetencyId = searchParams.get("competencyId") || "";
  const competencyId = rawCompetencyId.trim();
  const period = (searchParams.get("period") || "").trim();
  const company = (searchParams.get("company") || "all").trim() || "all";
  const hasCompetencyId = competencyId.length > 0;

  const dashboardQuery = useQuery({
    queryKey: ["analyticsDashboard", competencyId, period, company],
    queryFn: () => getAnalyticsDashboard(competencyId, period, company),
    enabled: hasCompetencyId,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });

  const handleCompanySelect = (slug: string) => {
    const query = new URLSearchParams(searchParams.toString());

    if (slug === "all") {
      query.delete("company");
    } else {
      query.set("company", slug);
    }

    startTransition(() => {
      router.replace(`/analytics?${query.toString()}`);
    });
  };

  return (
    <AnalyticsDashboardPage
      errorMessage={
        dashboardQuery.error ? formatApiError(dashboardQuery.error) : null
      }
      hasCompetencyId={hasCompetencyId}
      isLoading={dashboardQuery.isLoading}
      isUpdating={dashboardQuery.isFetching && !dashboardQuery.isLoading}
      onCompanySelect={handleCompanySelect}
      response={dashboardQuery.data}
    />
  );
}

export default function AnalyticsPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsPageContent />
    </QueryClientProvider>
  );
}
