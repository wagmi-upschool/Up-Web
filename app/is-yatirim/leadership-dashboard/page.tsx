"use client";

import { startTransition, useEffect, useRef, useState } from "react";
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
  DEFAULT_IS_YATIRIM_SEGMENT,
  applyIsYatirimBreakdownSelectionToSearchParams,
  applyIsYatirimDateFilterToSearchParams,
  getTodayDateString,
  normalizeIsYatirimDashboardToken,
  normalizeIsYatirimDateFilter,
  normalizeIsYatirimDateTimePickerFlag,
  normalizeIsYatirimSegment,
  normalizeIsYatirimUnvan,
  normalizeIsYatirimUnvanFlag,
  resolveIsYatirimDateFilterByPickerFlag,
} from "@/lib/isYatirimLeadershipDashboard";

const BREAKDOWN_LOADING_STORAGE_KEY = "isYatirimBreakdownLoadingUntil";
const BREAKDOWN_LOADING_DURATION_MS = 900;

function getStoredBreakdownLoadingUntil() {
  if (typeof window === "undefined") {
    return 0;
  }

  const value = Number(
    window.sessionStorage.getItem(BREAKDOWN_LOADING_STORAGE_KEY),
  );
  return Number.isFinite(value) ? value : 0;
}

async function getLeadershipDashboard(
  segment: string,
  token: string,
  dateFilter?: IsYatirimDateFilter,
  unvan?: string,
) {
  const query = new URLSearchParams({
    segment,
  });
  const normalizedUnvan = normalizeIsYatirimUnvan(unvan);

  if (dateFilter) {
    applyIsYatirimDateFilterToSearchParams(query, dateFilter);
  }

  if (normalizedUnvan) {
    query.set("unvan", normalizedUnvan);
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
  unvan: string,
  token: string,
  dateFilter?: IsYatirimDateFilter,
) {
  return [
    "isYatirimLeadershipDashboard",
    segment,
    unvan,
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
    selectedUnvan,
    isUnvanComparisonEnabled,
    dateFilter,
    isDateTimePickerEnabled,
  }: {
    segment: string;
    selectedUnvan?: string;
    isUnvanComparisonEnabled: boolean;
    dateFilter?: IsYatirimDateFilter;
    isDateTimePickerEnabled: boolean;
  },
) {
  const nextSearchParams = new URLSearchParams(currentSearchParams.toString());

  if (isUnvanComparisonEnabled && selectedUnvan) {
    applyIsYatirimBreakdownSelectionToSearchParams(nextSearchParams, {
      type: "unvan",
      unvan: selectedUnvan,
      isUnvanEnabled: true,
    });
  } else {
    applyIsYatirimBreakdownSelectionToSearchParams(nextSearchParams, {
      type: "gmy",
      segment,
    });
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
    selectedUnvan,
    isUnvanComparisonEnabled,
    dateFilter,
    isDateTimePickerEnabled,
  }: {
    segment: string;
    selectedUnvan?: string;
    isUnvanComparisonEnabled: boolean;
    dateFilter?: IsYatirimDateFilter;
    isDateTimePickerEnabled: boolean;
  },
) {
  const nextSearchParams = buildDashboardSearchParams(currentSearchParams, {
    segment,
    selectedUnvan,
    isUnvanComparisonEnabled,
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
  const [isBreakdownUpdating, setIsBreakdownUpdating] = useState(
    () => getStoredBreakdownLoadingUntil() > Date.now(),
  );
  const breakdownUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isDateTimePickerEnabled = normalizeIsYatirimDateTimePickerFlag(
    searchParams.get("isDateTimePicker"),
  );
  const isUnvanComparisonEnabled = normalizeIsYatirimUnvanFlag(
    searchParams.get("isUnvan"),
  );
  const isWeeklyToggleEnabled = searchParams.get("isWeeklyToggle") !== "false";
  const segment = normalizeIsYatirimSegment(searchParams.get("segment"));
  const selectedUnvan = isUnvanComparisonEnabled
    ? normalizeIsYatirimUnvan(searchParams.get("unvan"))
    : "";
  const dailyToken = normalizeIsYatirimDashboardToken(
    searchParams.get("dailyToken") || searchParams.get("token"),
  );
  const weeklyToken = normalizeIsYatirimDashboardToken(
    searchParams.get("weeklyToken"),
  );
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
    return () => {
      if (breakdownUpdateTimerRef.current) {
        clearTimeout(breakdownUpdateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isBreakdownUpdating) {
      return;
    }

    if (breakdownUpdateTimerRef.current) {
      clearTimeout(breakdownUpdateTimerRef.current);
    }

    const loadingUntil = getStoredBreakdownLoadingUntil();
    const timeoutMs = Math.max(160, loadingUntil - Date.now());

    breakdownUpdateTimerRef.current = setTimeout(() => {
      setIsBreakdownUpdating(false);
      window.sessionStorage.removeItem(BREAKDOWN_LOADING_STORAGE_KEY);
      breakdownUpdateTimerRef.current = null;
    }, timeoutMs);
  }, [isBreakdownUpdating, selectedUnvan, segment]);

  const beginBreakdownUpdate = () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        BREAKDOWN_LOADING_STORAGE_KEY,
        `${Date.now() + BREAKDOWN_LOADING_DURATION_MS}`,
      );
    }

    setIsBreakdownUpdating(true);
  };

  useEffect(() => {
    if (!isDateTimePickerEnabled) {
      if (
        searchParams.has("dateMode") ||
        searchParams.has("startDate") ||
        searchParams.has("endDate")
      ) {
        replaceDashboardRoute(router, searchParams, {
          segment,
          selectedUnvan,
          isUnvanComparisonEnabled,
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
        selectedUnvan,
        isUnvanComparisonEnabled,
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
    isUnvanComparisonEnabled,
    router,
    searchParams,
    segment,
    selectedUnvan,
  ]);

  const dashboardQuery = useQuery({
    queryKey: getLeadershipDashboardQueryKey(
      segment,
      selectedUnvan,
      dailyToken,
      effectiveDateFilter,
    ),
    queryFn: () =>
      getLeadershipDashboard(
        segment,
        dailyToken,
        effectiveDateFilter,
        selectedUnvan,
      ),
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
      selectedUnvan,
      isUnvanComparisonEnabled,
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
    isUnvanComparisonEnabled,
    router,
    searchParams,
    segment,
    selectedUnvan,
  ]);

  const activeDateFilter =
    isDateTimePickerEnabled &&
    !dashboardQuery.isPlaceholderData &&
    dashboardQuery.data?.meta.dateFilter
      ? dashboardQuery.data.meta.dateFilter
      : dateFilter;

  const handleSegmentSelect = (selectedSegment: string) => {
    const normalizedSegment = normalizeIsYatirimSegment(selectedSegment);

    if (selectedUnvan || normalizedSegment !== segment) {
      beginBreakdownUpdate();
    }

    replaceDashboardRoute(router, searchParams, {
      segment: normalizedSegment,
      selectedUnvan: "",
      isUnvanComparisonEnabled,
      dateFilter: effectiveDateFilter,
      isDateTimePickerEnabled,
    });
  };

  const handleUnvanSelect = (nextUnvan: string) => {
    if (!isUnvanComparisonEnabled) {
      return;
    }

    const normalizedUnvan = normalizeIsYatirimUnvan(nextUnvan);

    if (normalizedUnvan !== selectedUnvan) {
      beginBreakdownUpdate();
    }

    replaceDashboardRoute(router, searchParams, {
      segment: DEFAULT_IS_YATIRIM_SEGMENT,
      selectedUnvan: normalizedUnvan,
      isUnvanComparisonEnabled,
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
        selectedUnvan,
        dailyToken,
        nextDateFilter,
      ),
      queryFn: () =>
        getLeadershipDashboard(
          segment,
          dailyToken,
          nextDateFilter,
          selectedUnvan,
        ),
    });

    replaceDashboardRoute(router, searchParams, {
      segment,
      selectedUnvan,
      isUnvanComparisonEnabled,
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
      isBreakdownUpdating={isBreakdownUpdating}
      isDateTimePickerEnabled={isDateTimePickerEnabled}
      isUnvanComparisonEnabled={isUnvanComparisonEnabled}
      onDateFilterChange={handleDateFilterChange}
      onSegmentSelect={handleSegmentSelect}
      onUnvanSelect={handleUnvanSelect}
      response={dashboardQuery.data}
      selectedSegment={segment}
      selectedUnvan={selectedUnvan}
      dailyToken={dailyToken}
      isWeeklyToggleEnabled={isWeeklyToggleEnabled}
      weeklyToken={weeklyToken}
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
