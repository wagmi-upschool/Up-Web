"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  type ReadonlyURLSearchParams,
  useRouter,
  useSearchParams,
} from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
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
  applyIsYatirimWordPaginationToSearchParams,
  getDefaultIsYatirimDateFilter,
  getIsYatirimLeadershipDashboardQueryKey,
  getLeadershipDashboardWordTotalPages,
  getPreviousIsYatirimDateFilter,
  getTodayDateString,
  IS_YATIRIM_MOOD_STREAK_COMPARISON_QUERY_PARAM,
  IS_YATIRIM_MOOD_STREAKS_QUERY_PARAM,
  IS_YATIRIM_WORD_PAGINATION_QUERY_PARAM,
  normalizeIsYatirimDashboardToken,
  normalizeIsYatirimDateFilter,
  normalizeIsYatirimDateTimePickerFlag,
  normalizeIsYatirimMoodStreakComparisonFlag,
  normalizeIsYatirimMoodStreaksFlag,
  normalizeIsYatirimSegment,
  normalizeIsYatirimUnvan,
  normalizeIsYatirimUnvanFlag,
  normalizeIsYatirimWordPaginationFlag,
  isSingleCalendarDay,
  limitLeadershipDashboardWords,
  mergeLeadershipDashboardWordPages,
  resolveIsYatirimDateFilterByPickerFlag,
} from "@/lib/isYatirimLeadershipDashboard";

const BREAKDOWN_LOADING_STORAGE_KEY = "isYatirimBreakdownLoadingUntil";
const BREAKDOWN_LOADING_DURATION_MS = 900;

type OptimisticBreakdownSelection = {
  segment: string;
  selectedUnvan: string;
};

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
  wordsPage?: number,
) {
  const query = new URLSearchParams({
    segment,
  });
  const normalizedUnvan = normalizeIsYatirimUnvan(unvan);

  if (dateFilter) {
    applyIsYatirimDateFilterToSearchParams(query, dateFilter);
  }

  if (wordsPage !== undefined) {
    applyIsYatirimWordPaginationToSearchParams(query, dateFilter, wordsPage);
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
  const [optimisticBreakdown, setOptimisticBreakdown] =
    useState<OptimisticBreakdownSelection | null>(null);
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
  const isMoodStreaksEnabled = normalizeIsYatirimMoodStreaksFlag(
    searchParams.get(IS_YATIRIM_MOOD_STREAKS_QUERY_PARAM),
  );
  const isMoodStreakComparisonEnabled =
    normalizeIsYatirimMoodStreakComparisonFlag(
      searchParams.get(IS_YATIRIM_MOOD_STREAK_COMPARISON_QUERY_PARAM),
    );
  const isWordPaginationFeatureEnabled = normalizeIsYatirimWordPaginationFlag(
    searchParams.get(IS_YATIRIM_WORD_PAGINATION_QUERY_PARAM),
  );
  const segment = normalizeIsYatirimSegment(searchParams.get("segment"));
  const selectedUnvan = isUnvanComparisonEnabled
    ? normalizeIsYatirimUnvan(searchParams.get("unvan"))
    : "";
  const visibleSegment = optimisticBreakdown?.segment ?? segment;
  const visibleSelectedUnvan = isUnvanComparisonEnabled
    ? (optimisticBreakdown?.selectedUnvan ?? selectedUnvan)
    : "";
  const dailyToken = normalizeIsYatirimDashboardToken(
    searchParams.get("dailyToken") || searchParams.get("token"),
  );
  const weeklyToken = normalizeIsYatirimDashboardToken(
    searchParams.get("weeklyToken"),
  );
  const hasExplicitDateFilter =
    searchParams.has("dateMode") ||
    searchParams.has("startDate") ||
    searchParams.has("endDate");
  const todayDate = getTodayDateString();
  const dateFilter = hasExplicitDateFilter
    ? normalizeIsYatirimDateFilter(
        {
          dateMode: searchParams.get("dateMode"),
          startDate: searchParams.get("startDate"),
          endDate: searchParams.get("endDate"),
        },
        {
          todayDate,
        },
      )
    : getDefaultIsYatirimDateFilter(todayDate);
  const effectiveDateFilter = resolveIsYatirimDateFilterByPickerFlag(
    isDateTimePickerEnabled,
    dateFilter,
  );
  const previousDateFilter = useMemo(
    () =>
      isMoodStreaksEnabled &&
      isMoodStreakComparisonEnabled &&
      effectiveDateFilter
        ? getPreviousIsYatirimDateFilter(effectiveDateFilter)
        : null,
    [effectiveDateFilter, isMoodStreakComparisonEnabled, isMoodStreaksEnabled],
  );

  useEffect(() => {
    if (
      optimisticBreakdown &&
      optimisticBreakdown.segment === segment &&
      optimisticBreakdown.selectedUnvan === selectedUnvan
    ) {
      setOptimisticBreakdown(null);
    }
  }, [optimisticBreakdown, segment, selectedUnvan]);

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

  const isWordPaginationEnabled =
    isWordPaginationFeatureEnabled && isSingleCalendarDay(effectiveDateFilter);
  const dashboardQuery = useInfiniteQuery({
    queryKey: getIsYatirimLeadershipDashboardQueryKey({
      scope: "current",
      segment,
      unvan: selectedUnvan,
      token: dailyToken,
      dateFilter: effectiveDateFilter,
      isWordPaginationEnabled,
    }),
    queryFn: ({ pageParam }) =>
      getLeadershipDashboard(
        segment,
        dailyToken,
        effectiveDateFilter,
        selectedUnvan,
        isWordPaginationEnabled ? pageParam : undefined,
      ),
    initialPageParam: 1,
    getNextPageParam: (
      _lastPage: LeadershipDashboardResponse,
      allPages: LeadershipDashboardResponse[],
    ) => {
      if (!isWordPaginationEnabled) {
        return undefined;
      }

      const totalPages = getLeadershipDashboardWordTotalPages(allPages[0]);
      const nextPage = allPages.length + 1;
      return nextPage <= totalPages ? nextPage : undefined;
    },
    refetchOnWindowFocus: false,
  });
  const dashboardResponse = useMemo(() => {
    const mergedResponse = mergeLeadershipDashboardWordPages(
      dashboardQuery.data?.pages || [],
    );

    if (!mergedResponse || isWordPaginationFeatureEnabled) {
      return mergedResponse;
    }

    return limitLeadershipDashboardWords(mergedResponse);
  }, [dashboardQuery.data?.pages, isWordPaginationFeatureEnabled]);
  const {
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
  } = dashboardQuery;

  useEffect(() => {
    if (
      !isWordPaginationEnabled ||
      !hasNextPage ||
      isFetchingNextPage ||
      isFetchNextPageError
    ) {
      return;
    }

    void fetchNextPage();
  }, [
    fetchNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    isWordPaginationEnabled,
  ]);

  const previousPeriodQuery = useQuery({
    queryKey: getIsYatirimLeadershipDashboardQueryKey({
      scope: "previous",
      segment,
      unvan: selectedUnvan,
      token: dailyToken,
      dateFilter: previousDateFilter || undefined,
    }),
    queryFn: () =>
      getLeadershipDashboard(
        segment,
        dailyToken,
        previousDateFilter as IsYatirimDateFilter,
        selectedUnvan,
      ),
    enabled: Boolean(previousDateFilter),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isDateTimePickerEnabled) {
      return;
    }

    const backendDateFilter = dashboardResponse?.meta.dateFilter;

    if (
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
    dashboardResponse?.meta.dateFilter,
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
    isDateTimePickerEnabled && dashboardResponse?.meta.dateFilter
      ? dashboardResponse.meta.dateFilter
      : dateFilter;

  const handleSegmentSelect = (selectedSegment: string) => {
    const normalizedSegment = normalizeIsYatirimSegment(selectedSegment);

    if (selectedUnvan || normalizedSegment !== segment) {
      setOptimisticBreakdown({
        segment: normalizedSegment,
        selectedUnvan: "",
      });
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
      setOptimisticBreakdown({
        segment: DEFAULT_IS_YATIRIM_SEGMENT,
        selectedUnvan: normalizedUnvan,
      });
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

    const isNextWordPaginationEnabled =
      isWordPaginationFeatureEnabled && isSingleCalendarDay(nextDateFilter);

    void queryClient.prefetchInfiniteQuery({
      queryKey: getIsYatirimLeadershipDashboardQueryKey({
        scope: "current",
        segment,
        unvan: selectedUnvan,
        token: dailyToken,
        dateFilter: nextDateFilter,
        isWordPaginationEnabled: isNextWordPaginationEnabled,
      }),
      queryFn: ({ pageParam }) =>
        getLeadershipDashboard(
          segment,
          dailyToken,
          nextDateFilter,
          selectedUnvan,
          isNextWordPaginationEnabled ? pageParam : undefined,
        ),
      initialPageParam: 1,
      getNextPageParam: (
        _lastPage: LeadershipDashboardResponse,
        allPages: LeadershipDashboardResponse[],
      ) => {
        if (!isNextWordPaginationEnabled) {
          return undefined;
        }

        const totalPages = getLeadershipDashboardWordTotalPages(allPages[0]);
        const nextPage = allPages.length + 1;
        return nextPage <= totalPages ? nextPage : undefined;
      },
    });

    const nextPreviousDateFilter =
      isMoodStreaksEnabled && isMoodStreakComparisonEnabled
        ? getPreviousIsYatirimDateFilter(nextDateFilter)
        : null;

    if (nextPreviousDateFilter) {
      void queryClient.prefetchQuery({
        queryKey: getIsYatirimLeadershipDashboardQueryKey({
          scope: "previous",
          segment,
          unvan: selectedUnvan,
          token: dailyToken,
          dateFilter: nextPreviousDateFilter,
        }),
        queryFn: () =>
          getLeadershipDashboard(
            segment,
            dailyToken,
            nextPreviousDateFilter,
            selectedUnvan,
          ),
      });
    }

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
        dashboardQuery.error && !dashboardResponse
          ? formatApiError(dashboardQuery.error)
          : null
      }
      isLoading={dashboardQuery.isLoading}
      isPreviousPeriodLoading={
        Boolean(previousDateFilter) && previousPeriodQuery.isFetching
      }
      isMoodStreaksEnabled={isMoodStreaksEnabled}
      isMoodStreakComparisonEnabled={isMoodStreakComparisonEnabled}
      isUpdating={
        dashboardQuery.isFetching &&
        !dashboardQuery.isLoading &&
        !dashboardQuery.isFetchingNextPage
      }
      isBreakdownUpdating={isBreakdownUpdating}
      isDateTimePickerEnabled={isDateTimePickerEnabled}
      isUnvanComparisonEnabled={isUnvanComparisonEnabled}
      onDateFilterChange={handleDateFilterChange}
      onSegmentSelect={handleSegmentSelect}
      onUnvanSelect={handleUnvanSelect}
      previousDateFilter={previousDateFilter}
      previousPeriodErrorMessage={
        previousPeriodQuery.error
          ? formatApiError(previousPeriodQuery.error)
          : null
      }
      previousPeriodResponse={previousPeriodQuery.data}
      response={dashboardResponse}
      selectedSegment={visibleSegment}
      selectedUnvan={visibleSelectedUnvan}
      dailyToken={dailyToken}
      isWeeklyToggleEnabled={isWeeklyToggleEnabled}
      weeklyToken={weeklyToken}
      wordLoadingPage={
        dashboardQuery.isFetchingNextPage
          ? (dashboardQuery.data?.pages.length || 0) + 1
          : null
      }
      wordPaginationErrorMessage={
        dashboardQuery.isFetchNextPageError && dashboardQuery.error
          ? formatApiError(dashboardQuery.error)
          : null
      }
      onRetryWordPagination={() => {
        void dashboardQuery.fetchNextPage();
      }}
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
