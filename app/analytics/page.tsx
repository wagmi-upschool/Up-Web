"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import PulseDashboard from "@/components/analytics/pulse-dashboard";
import type { AnalyticsSummaryResponse } from "@/lib/analyticsCompetencies";

async function getAnalyticsSummary(competencyId: string) {
  const response = await fetch(
    `/analytics/summary?competencyId=${encodeURIComponent(competencyId)}`,
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

  return json as AnalyticsSummaryResponse;
}
function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [, ...messageParts] = raw.split(":");
  return messageParts.join(":").trim() || raw;
}

function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const rawCompetencyId = searchParams.get("competencyId") || "";
  const competencyId = rawCompetencyId.trim();
  const hasCompetencyId = competencyId.length > 0;

  const summaryQuery = useQuery({
    queryKey: ["analyticsSummary", competencyId],
    queryFn: () => getAnalyticsSummary(competencyId),
    enabled: hasCompetencyId,
    refetchOnWindowFocus: false,
  });

  const summary = summaryQuery.data;

  return (
    <PulseDashboard
      badgeLabel={summary?.competency.periodLabel || "UP Pulse"}
      companyName={summary?.competency.displayName || "Eczacıbaşı"}
      errorMessage={summaryQuery.error ? formatApiError(summaryQuery.error) : null}
      hasRequestedData={hasCompetencyId}
      isLoading={summaryQuery.isLoading}
      missingDataDescription="Bu sayfa `/analytics?competencyId=<uuid>` formatıyla çalışır."
      missingDataTitle="competencyId gerekli"
      summary={summary}
      subtitle="Pulse Dashboard"
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
