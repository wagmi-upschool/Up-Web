"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import PulseDashboard from "@/components/analytics/pulse-dashboard";
import type {
  AnalyticsSummaryResponse,
  CompanySummaryData,
} from "@/lib/analyticsCompetencies";
import { isValidAnalyticsCompetencyId } from "@/lib/analyticsCompetencies";

async function getAnalyticsSummary(competencyId: string) {
  const query = new URLSearchParams({
    competencyId,
  });

  const response = await fetch(
    `/analytics/summary?${query.toString()}`,
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
  const [codePart, ...rest] = raw.split(":");
  const code = codePart?.trim();
  const message = rest.join(":").trim();

  if (code === "VAL_002") {
    return (
      message ||
      "Receiver ID formatını kontrol et. Yalnızca geçerli UUID değerleri kullanılabilir."
    );
  }

  return message || raw || "Dashboard verileri şu anda yüklenemedi.";
}

function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const [selectedCompany, setSelectedCompany] = useState("all");
  const rawCompetencyId = searchParams.get("competencyId") || "";
  const competencyId = rawCompetencyId.trim();
  const hasRequestedData = isValidAnalyticsCompetencyId(competencyId);

  const summaryQuery = useQuery({
    queryKey: ["analyticsSummary", competencyId],
    queryFn: () => getAnalyticsSummary(competencyId),
    enabled: hasRequestedData,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });

  const response = summaryQuery.data;
  const availableCompanies = response?.availableCompanies ?? [];

  useEffect(() => {
    setSelectedCompany("all");
  }, [competencyId]);

  useEffect(() => {
    const companyList = response?.availableCompanies ?? [];

    if (
      selectedCompany !== "all" &&
      !companyList.includes(selectedCompany)
    ) {
      setSelectedCompany("all");
    }
  }, [response, selectedCompany]);

  const activeSummary = (() => {
    if (!response) {
      return undefined;
    }

    const activeSlice: CompanySummaryData =
      response.byCompany[selectedCompany] ?? response.byCompany.all;

    return {
      ...activeSlice,
      maxRating: response.maxRating,
      hourlyRatings: activeSlice.hourlyRatings.map((rating) => ({
        ...rating,
        hour: rating.hour.endsWith("Z") ? rating.hour : `${rating.hour}Z`,
      })),
    };
  })();

  return (
    <PulseDashboard
      availableCompanies={availableCompanies}
      badgeLabel="UP Pulse"
      companyName="Eczacıbaşı"
      errorMessage={summaryQuery.error ? formatApiError(summaryQuery.error) : null}
      hasRequestedData={hasRequestedData}
      isLoading={summaryQuery.isLoading}
      missingDataDescription="Geçerli bir `competencyId` parametresi olmadan API çağrısı yapılmaz."
      missingDataTitle="Yetkinlik seç ve dashboardu çalıştır"
      onCompanySelect={setSelectedCompany}
      selectedCompany={selectedCompany}
      summary={activeSummary}
      subtitle="Pulse Dashboard"
    />
  );
}

export default function FeedbackAnalyticsPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsPageContent />
    </QueryClientProvider>
  );
}
