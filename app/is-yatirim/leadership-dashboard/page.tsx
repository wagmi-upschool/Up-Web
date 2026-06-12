"use client";

import { startTransition, useEffect, useState } from "react";
import {
  type ReadonlyURLSearchParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import IsYatirimLeadershipDashboard from "@/components/is-yatirim-leadership-dashboard/dashboard-page";
import type {
  IsYatirimDateFilter,
  LeadershipDashboardResponse,
} from "@/lib/isYatirimLeadershipDashboard";
import {
  applyIsYatirimDateFilterToSearchParams,
  getTodayDateString,
  normalizeIsYatirimDashboardToken,
  normalizeIsYatirimDateFilter,
  normalizeIsYatirimDateTimePickerFlag,
  normalizeIsYatirimSegment,
  resolveIsYatirimDateFilterByPickerFlag,
} from "@/lib/isYatirimLeadershipDashboard";

async function getLeadershipDashboard(
  segment: string,
  token: string,
  dateFilter?: IsYatirimDateFilter,
) {
  const query = new URLSearchParams({
    segment,
  });

  if (dateFilter) {
    applyIsYatirimDateFilterToSearchParams(query, dateFilter);
  }

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

function getLeadershipDashboardQueryKey(
  segment: string,
  token: string,
  dateFilter?: IsYatirimDateFilter,
) {
  return [
    "isYatirimLeadershipDashboard",
    segment,
    token,
    dateFilter?.mode || "legacy",
    dateFilter?.startDate || "",
    dateFilter?.endDate || "",
  ] as const;
}

function buildDashboardSearchParams(
  currentSearchParams: ReadonlyURLSearchParams,
  {
    segment,
    dateFilter,
    isDateTimePickerEnabled,
  }: {
    segment: string;
    dateFilter?: IsYatirimDateFilter;
    isDateTimePickerEnabled: boolean;
  },
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams.toString());

  if (segment === "all") {
    nextSearchParams.delete("segment");
  } else {
    nextSearchParams.set("segment", segment);
  }

  if (isDateTimePickerEnabled && dateFilter) {
    applyIsYatirimDateFilterToSearchParams(nextSearchParams, dateFilter);
  } else {
    nextSearchParams.delete("dateMode");
    nextSearchParams.delete("startDate");
    nextSearchParams.delete("endDate");
  }

  return nextSearchParams;
}

function replaceDashboardRoute(
  router: ReturnType<typeof useRouter>,
  currentSearchParams: ReadonlyURLSearchParams,
  {
    segment,
    dateFilter,
    isDateTimePickerEnabled,
  }: {
    segment: string;
    dateFilter?: IsYatirimDateFilter;
    isDateTimePickerEnabled: boolean;
  },
) {
  const nextSearchParams = buildDashboardSearchParams(currentSearchParams, {
    segment,
    dateFilter,
    isDateTimePickerEnabled,
  });
  const nextSearch = nextSearchParams.toString();
  const currentSearch = currentSearchParams.toString();

  if (nextSearch === currentSearch) {
    return;
  }

  startTransition(() => {
    router.replace(
      `/is-yatirim/leadership-dashboard${nextSearch ? `?${nextSearch}` : ""}`,
    );
  });
}

function IsYatirimLeadershipDashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const isDateTimePickerEnabled = normalizeIsYatirimDateTimePickerFlag(
    searchParams.get("isDateTimePicker"),
  );
  const segment = normalizeIsYatirimSegment(searchParams.get("segment"));
  const token = normalizeIsYatirimDashboardToken(searchParams.get("token"));
  const dateFilter = normalizeIsYatirimDateFilter(
    {
      dateMode: searchParams.get("dateMode"),
      startDate: searchParams.get("startDate"),
      endDate: searchParams.get("endDate"),
    },
    {
      todayDate: getTodayDateString(),
    },
  );
  const effectiveDateFilter = resolveIsYatirimDateFilterByPickerFlag(
    isDateTimePickerEnabled,
    dateFilter,
  );

  useEffect(() => {
    if (!isDateTimePickerEnabled) {
      if (
        searchParams.has("dateMode") ||
        searchParams.has("startDate") ||
        searchParams.has("endDate")
      ) {
        replaceDashboardRoute(router, searchParams, {
          segment,
          dateFilter: undefined,
          isDateTimePickerEnabled: false,
        });
      }
      return;
    }

    if (
      searchParams.get("dateMode") !== dateFilter.mode ||
      searchParams.get("startDate") !== dateFilter.startDate ||
      searchParams.get("endDate") !== dateFilter.endDate
    ) {
      replaceDashboardRoute(router, searchParams, {
        segment,
        dateFilter,
        isDateTimePickerEnabled: true,
      });
    }
  }, [
    dateFilter,
    dateFilter.endDate,
    dateFilter.mode,
    dateFilter.startDate,
    isDateTimePickerEnabled,
    router,
    searchParams,
    segment,
  ]);

  const dashboardQuery = useQuery({
    queryKey: getLeadershipDashboardQueryKey(
      segment,
      token,
      effectiveDateFilter,
    ),
    queryFn: () => getLeadershipDashboard(segment, token, effectiveDateFilter),
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isDateTimePickerEnabled) {
      return;
    }

    const backendDateFilter = dashboardQuery.data?.meta.dateFilter;

    if (
      dashboardQuery.isPlaceholderData ||
      !backendDateFilter ||
      (backendDateFilter.mode === dateFilter.mode &&
        backendDateFilter.startDate === dateFilter.startDate &&
        backendDateFilter.endDate === dateFilter.endDate &&
        backendDateFilter.dayCount === dateFilter.dayCount)
    ) {
      return;
    }

    replaceDashboardRoute(router, searchParams, {
      segment,
      dateFilter: backendDateFilter,
      isDateTimePickerEnabled: true,
    });
  }, [
    dashboardQuery.data?.meta.dateFilter,
    dashboardQuery.isPlaceholderData,
    dateFilter.dayCount,
    dateFilter.endDate,
    dateFilter.mode,
    dateFilter.startDate,
    isDateTimePickerEnabled,
    router,
    searchParams,
    segment,
  ]);

  const activeDateFilter =
    isDateTimePickerEnabled &&
    !dashboardQuery.isPlaceholderData &&
    dashboardQuery.data?.meta.dateFilter
      ? dashboardQuery.data.meta.dateFilter
      : dateFilter;

  const handleSegmentSelect = (selectedSegment: string) => {
    replaceDashboardRoute(router, searchParams, {
      segment: normalizeIsYatirimSegment(selectedSegment),
      dateFilter: effectiveDateFilter,
      isDateTimePickerEnabled,
    });
  };

  const handleDateFilterChange = (nextDateFilter: IsYatirimDateFilter) => {
    if (!isDateTimePickerEnabled) {
      return;
    }

    void queryClient.prefetchQuery({
      queryKey: getLeadershipDashboardQueryKey(
        segment,
        token,
        nextDateFilter,
      ),
      queryFn: () => getLeadershipDashboard(segment, token, nextDateFilter),
    });

    replaceDashboardRoute(router, searchParams, {
      segment,
      dateFilter: nextDateFilter,
      isDateTimePickerEnabled: true,
    });
  };

  return (
    <IsYatirimLeadershipDashboard
      dateFilter={activeDateFilter}
      errorMessage={
        dashboardQuery.error ? formatApiError(dashboardQuery.error) : null
      }
      isLoading={dashboardQuery.isLoading}
      isUpdating={dashboardQuery.isFetching && !dashboardQuery.isLoading}
      isDateTimePickerEnabled={isDateTimePickerEnabled}
      onDateFilterChange={handleDateFilterChange}
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
