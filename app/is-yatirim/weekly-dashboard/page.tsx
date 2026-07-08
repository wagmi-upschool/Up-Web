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
import IsYatirimWeeklyDashboard from "@/components/is-yatirim-weekly-dashboard/dashboard-page";
import {
  applyIsYatirimBreakdownSelectionToSearchParams,
  normalizeIsYatirimUnvan,
  normalizeIsYatirimUnvanFlag,
} from "@/lib/isYatirimLeadershipDashboard";
import {
  DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT,
  IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE,
  IS_YATIRIM_WEEKLY_ROUTE,
  applyIsYatirimWeekFilterToSearchParams,
  isIsYatirimExcludedWeeklyStartDate,
  normalizeIsYatirimWeekFilter,
  normalizeIsYatirimWeeklySegment,
  normalizeIsYatirimWeeklyToken,
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
) {
  const query = new URLSearchParams({
    segment,
  });
  const normalizedUnvan = normalizeIsYatirimUnvan(unvan);

  applyIsYatirimWeekFilterToSearchParams(query, weekFilter);

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

function getWeeklyDashboardQueryKey(
  segment: string,
  unvan: string,
  token: string,
  weekFilter: IsYatirimWeekFilter,
) {
  return [
    "isYatirimWeeklyDashboard",
    segment,
    unvan,
    token,
    weekFilter.mode,
    weekFilter.weekStartDate || "",
  ] as const;
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

function getTodayIsoDate() {
  const now = new Date();
  return formatIsoDate(
    new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())),
  );
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

function getPreviousParticipationWeekFilter(
  weekFilter: IsYatirimWeekFilter,
): IsYatirimWeekFilter | null {
  if (weekFilter.mode === "last_4_weeks") {
    return null;
  }

  const currentWeekStart = normalizeIsYatirimWeekFilter({
    weekMode: "week",
    weekStartDate: getTodayIsoDate(),
  }).weekStartDate;
  let selectedWeekStart = "";

  if (weekFilter.mode === "week") {
    selectedWeekStart = weekFilter.weekStartDate || "";
  } else if (weekFilter.mode === "last_week") {
    selectedWeekStart = currentWeekStart
      ? addDaysToIsoDate(currentWeekStart, -7)
      : "";
  } else {
    selectedWeekStart = currentWeekStart || "";
  }

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
  const nextSearchParams = buildWeeklyDashboardSearchParams(currentSearchParams, {
    segment,
    selectedUnvan,
    isUnvanComparisonEnabled,
    weekFilter,
  });
  const nextSearch = nextSearchParams.toString();
  const currentSearch = currentSearchParams.toString();

  if (nextSearch === currentSearch) {
    return;
  }

  startTransition(() => {
    router.replace(`${IS_YATIRIM_WEEKLY_ROUTE}${nextSearch ? `?${nextSearch}` : ""}`);
  });
}

function IsYatirimWeeklyDashboardContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
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
  const dailyToken = normalizeIsYatirimWeeklyToken(searchParams.get("dailyToken"));
  const weekFilter = normalizeIsYatirimWeekFilter({
    weekMode: searchParams.get("weekMode"),
    weekStartDate: searchParams.get("weekStartDate"),
  });

  useEffect(() => {
    if (
      optimisticBreakdown &&
      optimisticBreakdown.segment === segment &&
      optimisticBreakdown.selectedUnvan === selectedUnvan
    ) {
      setOptimisticBreakdown(null);
    }
  }, [optimisticBreakdown, segment, selectedUnvan]);

  const dashboardQuery = useQuery({
    queryKey: getWeeklyDashboardQueryKey(
      segment,
      selectedUnvan,
      weeklyToken,
      weekFilter,
    ),
    queryFn: () =>
      getWeeklyDashboard(segment, weeklyToken, weekFilter, selectedUnvan),
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
  });
  const previousParticipationWeekFilter =
    getPreviousParticipationWeekFilter(weekFilter);
  const previousParticipationQuery = useQuery({
    queryKey: previousParticipationWeekFilter
      ? getWeeklyDashboardQueryKey(
          segment,
          selectedUnvan,
          weeklyToken,
          previousParticipationWeekFilter,
        )
      : [
          "isYatirimWeeklyDashboardPreviousParticipation",
          segment,
          selectedUnvan,
          weeklyToken,
          "",
        ],
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
      weekFilter,
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
      weekFilter,
    });
  };

  const handleWeekFilterChange = (nextWeekFilter: IsYatirimWeekFilter) => {
    void queryClient.prefetchQuery({
      queryKey: getWeeklyDashboardQueryKey(
        segment,
        selectedUnvan,
        weeklyToken,
        nextWeekFilter,
      ),
      queryFn: () =>
        getWeeklyDashboard(
          segment,
          weeklyToken,
          nextWeekFilter,
          selectedUnvan,
        ),
    });

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
        dashboardQuery.error ? formatApiError(dashboardQuery.error) : null
      }
      isLoading={dashboardQuery.isLoading}
      isUpdating={dashboardQuery.isFetching && !dashboardQuery.isLoading}
      onSegmentSelect={handleSegmentSelect}
      onUnvanSelect={handleUnvanSelect}
      onWeekFilterChange={handleWeekFilterChange}
      previousParticipationResponse={previousParticipationQuery.data}
      response={dashboardQuery.data}
      selectedSegment={visibleSegment}
      selectedUnvan={visibleSelectedUnvan}
      dailyToken={dailyToken}
      isUnvanComparisonEnabled={isUnvanComparisonEnabled}
      weeklyToken={weeklyToken}
      weekFilter={weekFilter}
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
