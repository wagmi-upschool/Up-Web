"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import IsYatirimLeadershipDashboard from "@/components/is-yatirim-leadership-dashboard/dashboard-page";
import type { LeadershipDashboardResponse } from "@/lib/isYatirimLeadershipDashboard";
import {
  normalizeIsYatirimDashboardToken,
  normalizeIsYatirimSegment,
} from "@/lib/isYatirimLeadershipDashboard";

async function getLeadershipDashboard(segment: string, token: string) {
  const query = new URLSearchParams({
    segment,
  });

  if (token) {
    query.set("token", token);
  }

  const response = await fetch(
    `/api/is-yatirim/leadership-dashboard?${query.toString()}`,
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
      json?.errorMessage ||
      response.statusText ||
      "İş Yatırım dashboard verisi alınamadı.";
    throw new Error(`${code}: ${message}`);
  }

  return json as LeadershipDashboardResponse;
}

function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [, ...messageParts] = raw.split(":");
  return messageParts.join(":").trim() || raw;
}

function IsYatirimLeadershipDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const segment = normalizeIsYatirimSegment(searchParams.get("segment"));
  const token = normalizeIsYatirimDashboardToken(searchParams.get("token"));

  const dashboardQuery = useQuery({
    queryKey: ["isYatirimLeadershipDashboard", segment, token],
    queryFn: () => getLeadershipDashboard(segment, token),
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });

  const handleSegmentSelect = (selectedSegment: string) => {
    const normalizedSegment = normalizeIsYatirimSegment(selectedSegment);
    const query = new URLSearchParams(searchParams.toString());

    if (normalizedSegment === "all") {
      query.delete("segment");
    } else {
      query.set("segment", normalizedSegment);
    }

    const suffix = query.toString();

    startTransition(() => {
      router.replace(
        `/is-yatirim/leadership-dashboard${suffix ? `?${suffix}` : ""}`,
      );
    });
  };

  return (
    <IsYatirimLeadershipDashboard
      errorMessage={
        dashboardQuery.error ? formatApiError(dashboardQuery.error) : null
      }
      isLoading={dashboardQuery.isLoading}
      isUpdating={dashboardQuery.isFetching && !dashboardQuery.isLoading}
      onSegmentSelect={handleSegmentSelect}
      response={dashboardQuery.data}
      selectedSegment={segment}
    />
  );
}

export default function IsYatirimLeadershipDashboardPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <IsYatirimLeadershipDashboardContent />
    </QueryClientProvider>
  );
}
