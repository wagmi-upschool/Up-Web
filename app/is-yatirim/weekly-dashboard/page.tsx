"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
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
} from "@tanstack/react-query";
import IsYatirimWeeklyDashboard from "@/components/is-yatirim-weekly-dashboard/dashboard-page";
import {
  applyIsYatirimBreakdownSelectionToSearchParams,
  normalizeIsYatirimUnvan,
  normalizeIsYatirimUnvanFlag,
} from "@/lib/isYatirimLeadershipDashboard";
import {
  DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT,
  IS_YATIRIM_WEEKLY_WORD_PAGINATION_QUERY_PARAM,
  IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE,
  IS_YATIRIM_WEEKLY_ROUTE,
  applyIsYatirimWeekFilterToSearchParams,
  applyIsYatirimWeeklyWordPaginationToSearchParams,
  getCurrentIsYatirimWeekStart,
  getIsYatirimWeeklyDashboardQueryKey,
  getIsYatirimWeeklyQuestionModel,
  getResolvedIsYatirimWeekStart,
  getIsYatirimWeeklyWordNextPage,
  isSingleIsYatirimCalendarWeek,
  isIsYatirimExcludedWeeklyStartDate,
  mergeIsYatirimWeeklyWordPages,
  normalizeIsYatirimWeekFilter,
  normalizeIsYatirimWeeklySegment,
  normalizeIsYatirimWeeklyToken,
  normalizeIsYatirimWeeklyWordPaginationFlag,
  type IsYatirimWeekFilter,
  type WeeklyDashboardResponse,
} from "@/lib/isYatirimWeeklyDashboard";

type OptimisticWeeklyBreakdownSelection = {
  segment: string;
  selectedUnvan: string;
};

async function getWeeklyDashboard(
  segment: string,
  token: string,
  weekFilter: IsYatirimWeekFilter,
  unvan?: string,
  wordPagination?: { enabled: boolean; page: number },
) {
  const query = new URLSearchParams({
    segment,
  });
  const normalizedUnvan = normalizeIsYatirimUnvan(unvan);

  applyIsYatirimWeekFilterToSearchParams(query, weekFilter);

  if (wordPagination) {
    applyIsYatirimWeeklyWordPaginationToSearchParams(query, {
      isFeatureEnabled: wordPagination.enabled,
      weekFilter,
      page: wordPagination.page,
    });
    if (wordPagination.enabled) {
      query.set(IS_YATIRIM_WEEKLY_WORD_PAGINATION_QUERY_PARAM, "true");
    }
  }

  if (normalizedUnvan) {
    query.set("unvan", normalizedUnvan);
  }

  if (token) {
    query.set("token", token);
  }

  const response = await fetch(
    `/api/is-yatirim/weekly-dashboard?${query.toString()}`,
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
      "İş Yatırım weekly dashboard verisi alınamadı.";
    throw new Error(`${code}: ${message}`);
  }

  return json as WeeklyDashboardResponse;
}

function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [, ...messageParts] = raw.split(":");
  return messageParts.join(":").trim() || raw;
}

function formatIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function parseIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function addDaysToIsoDate(value: string, days: number) {
  const date = parseIsoDate(value);

  if (!date) {
    return "";
  }

  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

function getPreviousIncludedWeekStartDate(value: string) {
  let previousWeekStart = addDaysToIsoDate(value, -7);

  while (
    previousWeekStart >= IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE &&
    isIsYatirimExcludedWeeklyStartDate(previousWeekStart)
  ) {
    previousWeekStart = addDaysToIsoDate(previousWeekStart, -7);
  }

  return previousWeekStart;
}

function resolveWeekFilterForActivePeriod(
  weekFilter: IsYatirimWeekFilter,
  currentCalendarWeekStart: string,
): IsYatirimWeekFilter {
  if (!currentCalendarWeekStart) {
    return weekFilter;
  }

  if (weekFilter.mode === "this_week") {
    return {
      mode: "week",
      weekStartDate: currentCalendarWeekStart,
    };
  }

  if (weekFilter.mode === "last_week") {
    return {
      mode: "week",
      weekStartDate: getPreviousIncludedWeekStartDate(currentCalendarWeekStart),
    };
  }

  if (weekFilter.mode === "last_4_weeks") {
    return {
      ...weekFilter,
      endWeek: currentCalendarWeekStart,
    };
  }

  return weekFilter;
}

function getPreviousParticipationWeekFilter(
  weekFilter: IsYatirimWeekFilter,
): IsYatirimWeekFilter | null {
  if (weekFilter.mode === "last_4_weeks") {
    return null;
  }

  const selectedWeekStart = getResolvedIsYatirimWeekStart(weekFilter);

  const previousWeekStart = selectedWeekStart
    ? getPreviousIncludedWeekStartDate(selectedWeekStart)
    : "";

  if (
    !previousWeekStart ||
    previousWeekStart < IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE
  ) {
    return null;
  }

  return {
    mode: "week",
    weekStartDate: previousWeekStart,
  };
}

function buildWeeklyDashboardSearchParams(
  currentSearchParams: ReadonlyURLSearchParams,
  {
    segment,
    selectedUnvan,
    isUnvanComparisonEnabled,
    weekFilter,
  }: {
    segment: string;
    selectedUnvan?: string;
    isUnvanComparisonEnabled: boolean;
    weekFilter: IsYatirimWeekFilter;
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

  applyIsYatirimWeekFilterToSearchParams(nextSearchParams, weekFilter);

  return nextSearchParams;
}

function replaceWeeklyDashboardRoute(
  router: ReturnType<typeof useRouter>,
  currentSearchParams: ReadonlyURLSearchParams,
  {
    segment,
    selectedUnvan,
    isUnvanComparisonEnabled,
    weekFilter,
  }: {
    segment: string;
    selectedUnvan?: string;
    isUnvanComparisonEnabled: boolean;
    weekFilter: IsYatirimWeekFilter;
  },
) {
  const nextSearchParams = buildWeeklyDashboardSearchParams(
    currentSearchParams,
    {
      segment,
      selectedUnvan,
      isUnvanComparisonEnabled,
      weekFilter,
    },
  );
  const nextSearch = nextSearchParams.toString();
  const currentSearch = currentSearchParams.toString();

  if (nextSearch === currentSearch) {
    return;
  }

  startTransition(() => {
    router.replace(
      `${IS_YATIRIM_WEEKLY_ROUTE}${nextSearch ? `?${nextSearch}` : ""}`,
    );
  });
}

function IsYatirimWeeklyDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [optimisticBreakdown, setOptimisticBreakdown] =
    useState<OptimisticWeeklyBreakdownSelection | null>(null);
  const isUnvanComparisonEnabled = normalizeIsYatirimUnvanFlag(
    searchParams.get("isUnvan"),
  );
  const segment = normalizeIsYatirimWeeklySegment(searchParams.get("segment"));
  const selectedUnvan = isUnvanComparisonEnabled
    ? normalizeIsYatirimUnvan(searchParams.get("unvan"))
    : "";
  const visibleSegment = optimisticBreakdown?.segment ?? segment;
  const visibleSelectedUnvan = isUnvanComparisonEnabled
    ? (optimisticBreakdown?.selectedUnvan ?? selectedUnvan)
    : "";
  const weeklyToken = normalizeIsYatirimWeeklyToken(
    searchParams.get("weeklyToken") || searchParams.get("token"),
  );
  const dailyToken = normalizeIsYatirimWeeklyToken(
    searchParams.get("dailyToken"),
  );
  const requestedWeekFilter = normalizeIsYatirimWeekFilter({
    weekMode: searchParams.get("weekMode"),
    weekStartDate: searchParams.get("weekStartDate"),
  });
  const isWordPaginationFeatureEnabled =
    normalizeIsYatirimWeeklyWordPaginationFlag(
      searchParams.get(IS_YATIRIM_WEEKLY_WORD_PAGINATION_QUERY_PARAM),
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

  const activePeriodQuery = useQuery({
    queryKey: ["isYatirimWeeklyDashboardActivePeriod", weeklyToken],
    queryFn: () =>
      getWeeklyDashboard(DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT, weeklyToken, {
        mode: "this_week",
      }),
    refetchOnWindowFocus: true,
  });
  const currentCalendarWeekStart = getCurrentIsYatirimWeekStart();
  const resolvedWeekFilter = resolveWeekFilterForActivePeriod(
    requestedWeekFilter,
    currentCalendarWeekStart,
  );
  const canLoadDashboard = Boolean(currentCalendarWeekStart);
  const isWordPaginationEnabled =
    isWordPaginationFeatureEnabled &&
    isSingleIsYatirimCalendarWeek(resolvedWeekFilter) &&
    getIsYatirimWeeklyQuestionModel({
      weekFilter: resolvedWeekFilter,
    }) === "free_text";
  const dashboardQuery = useInfiniteQuery({
    queryKey: getIsYatirimWeeklyDashboardQueryKey({
      scope: "dashboard",
      segment,
      unvan: selectedUnvan,
      token: weeklyToken,
      weekFilter: resolvedWeekFilter,
      isWordPaginationEnabled,
    }),
    queryFn: ({ pageParam }) =>
      getWeeklyDashboard(
        segment,
        weeklyToken,
        resolvedWeekFilter,
        selectedUnvan,
        { enabled: isWordPaginationEnabled, page: pageParam },
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      isWordPaginationEnabled
        ? getIsYatirimWeeklyWordNextPage(lastPage)
        : undefined,
    enabled: canLoadDashboard,
    refetchOnWindowFocus: false,
  });
  const dashboardResponse = useMemo(
    () => mergeIsYatirimWeeklyWordPages(dashboardQuery.data?.pages || []),
    [dashboardQuery.data?.pages],
  );
  const previousParticipationWeekFilter = getPreviousParticipationWeekFilter(
    dashboardResponse?.meta.weekFilter || resolvedWeekFilter,
  );
  const previousParticipationQuery = useQuery({
    queryKey: getIsYatirimWeeklyDashboardQueryKey({
      scope: "previousParticipation",
      segment,
      unvan: selectedUnvan,
      token: weeklyToken,
      weekFilter: previousParticipationWeekFilter || undefined,
    }),
    queryFn: () =>
      getWeeklyDashboard(
        segment,
        weeklyToken,
        previousParticipationWeekFilter || { mode: "this_week" },
        selectedUnvan,
      ),
    enabled: Boolean(previousParticipationWeekFilter && weeklyToken),
    refetchOnWindowFocus: false,
  });

  const handleSegmentSelect = (selectedSegment: string) => {
    const normalizedSegment = normalizeIsYatirimWeeklySegment(selectedSegment);

    if (selectedUnvan || normalizedSegment !== segment) {
      setOptimisticBreakdown({
        segment: normalizedSegment,
        selectedUnvan: "",
      });
    }

    replaceWeeklyDashboardRoute(router, searchParams, {
      segment: normalizedSegment,
      selectedUnvan: "",
      isUnvanComparisonEnabled,
      weekFilter: requestedWeekFilter,
    });
  };

  const handleUnvanSelect = (nextUnvan: string) => {
    if (!isUnvanComparisonEnabled) {
      return;
    }
    const normalizedUnvan = normalizeIsYatirimUnvan(nextUnvan);

    if (normalizedUnvan !== selectedUnvan) {
      setOptimisticBreakdown({
        segment: DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT,
        selectedUnvan: normalizedUnvan,
      });
    }

    replaceWeeklyDashboardRoute(router, searchParams, {
      segment: DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT,
      selectedUnvan: normalizedUnvan,
      isUnvanComparisonEnabled,
      weekFilter: requestedWeekFilter,
    });
  };

  const handleWeekFilterChange = (nextWeekFilter: IsYatirimWeekFilter) => {
    replaceWeeklyDashboardRoute(router, searchParams, {
      segment,
      selectedUnvan,
      isUnvanComparisonEnabled,
      weekFilter: nextWeekFilter,
    });
  };

  return (
    <IsYatirimWeeklyDashboard
      errorMessage={
        activePeriodQuery.error
          ? formatApiError(activePeriodQuery.error)
          : dashboardQuery.error && !dashboardQuery.isFetchNextPageError
            ? formatApiError(dashboardQuery.error)
            : null
      }
      isLoading={activePeriodQuery.isLoading || dashboardQuery.isLoading}
      isUpdating={
        (activePeriodQuery.isFetching ||
          (dashboardQuery.isFetching && !dashboardQuery.isFetchingNextPage)) &&
        !activePeriodQuery.isLoading &&
        !dashboardQuery.isLoading
      }
      latestAvailableWeekStart={currentCalendarWeekStart}
      onSegmentSelect={handleSegmentSelect}
      onUnvanSelect={handleUnvanSelect}
      onWeekFilterChange={handleWeekFilterChange}
      previousParticipationResponse={previousParticipationQuery.data}
      response={dashboardResponse}
      selectedSegment={visibleSegment}
      selectedUnvan={visibleSelectedUnvan}
      dailyToken={dailyToken}
      isUnvanComparisonEnabled={isUnvanComparisonEnabled}
      weeklyToken={weeklyToken}
      weekFilter={requestedWeekFilter}
      isWordPaginationEnabled={isWordPaginationEnabled}
      isFetchingNextWordPage={dashboardQuery.isFetchingNextPage}
      wordPaginationErrorMessage={
        dashboardQuery.isFetchNextPageError && dashboardQuery.error
          ? formatApiError(dashboardQuery.error)
          : null
      }
      onLoadMoreWords={() => {
        void dashboardQuery.fetchNextPage();
      }}
    />
  );
}

export default function IsYatirimWeeklyDashboardPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <IsYatirimWeeklyDashboardContent />
    </QueryClientProvider>
  );
}
