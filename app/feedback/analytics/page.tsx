"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import PulseDashboard from "@/components/analytics/pulse-dashboard";
import { parseDashboardReceiverFilters } from "@/lib/dashboardSummary";
import { getDashboardSummary } from "@/lib/dashboardSummaryClient";

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
  const filters = parseDashboardReceiverFilters(searchParams);
  const hasRequestedFilters = filters.receiverIds.length > 0;
  const hasInvalidFilters = filters.invalidReceiverIds.length > 0;

  const summaryQuery = useQuery({
    queryKey: ["dashboardSummary", filters.receiverIds.join(",")],
    queryFn: () => getDashboardSummary(filters.receiverIds),
    enabled: hasRequestedFilters && !hasInvalidFilters,
    refetchOnWindowFocus: false,
  });

  return (
    <PulseDashboard
      badgeLabel="UP Pulse"
      companyName="Eczacıbaşı"
      errorMessage={summaryQuery.error ? formatApiError(summaryQuery.error) : null}
      hasRequestedData={hasRequestedFilters && !hasInvalidFilters}
      isLoading={summaryQuery.isLoading}
      missingDataDescription="En az bir `feedbackReceiverId` veya `feedbackReceiverIds` parametresi olmadan API çağrısı yapılmaz."
      missingDataTitle="Receiver seç ve dashboardu çalıştır"
      summary={summaryQuery.data}
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
