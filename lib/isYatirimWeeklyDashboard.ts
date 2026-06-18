export const IS_YATIRIM_WEEKLY_CLIENT = "is-yatirim";
export const DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT = "all";
export const DEFAULT_IS_YATIRIM_WEEK_MODE = "this_week";
export const IS_YATIRIM_WEEKLY_PICKER_MIN_DATE = "2026-05-20";
export const IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE = "2026-05-18";

export const IS_YATIRIM_WEEKLY_ROUTE = "/is-yatirim/weekly-dashboard";
export const IS_YATIRIM_DAILY_ROUTE = "/is-yatirim/leadership-dashboard";

export const WEEKLY_PARTICIPATION_DAYS = [
  "Cuma",
  "Cumartesi",
  "Pazar",
  "Pazartesi",
] as const;

export type IsYatirimWeekMode =
  | "this_week"
  | "last_week"
  | "last_4_weeks"
  | "last_8_weeks"
  | "week";

export type IsYatirimWeekFilter = {
  mode: IsYatirimWeekMode;
  weekStartDate?: string;
  label?: string;
  periodLabel?: string;
  weekLabel?: string;
};

export type WeeklySegmentOption = {
  id: string;
  label: string;
  type?: string;
  respondentCount?: number;
  targetEmployeeCount?: number;
};

export type WeeklyCategory = {
  id: string;
  label: string;
  shortLabel?: string;
};

export type WeeklyKpiMetric = {
  label: string;
  value: number | string;
  subtitle: string;
  delta?: number;
  deltaUnit?: "pp" | "percent";
  deltaLabel?: string;
};

export type WeeklyDashboardKpis = {
  participant: WeeklyKpiMetric;
  noneOnly: WeeklyKpiMetric;
  topExpectationGap: WeeklyKpiMetric;
};

export type WeeklyFeelingBarItem = {
  id: string;
  label: string;
  current: number;
  previous: number;
  delta?: number;
};

export type WeeklyExpectationBalanceItem = {
  id: string;
  label: string;
  value: number;
  previous?: number;
  trend?: number;
};

export type WeeklyParticipationDay = {
  day: (typeof WEEKLY_PARTICIPATION_DAYS)[number];
  value: number;
};

export type WeeklyParticipationSeries = {
  id: string;
  label: string;
  days: WeeklyParticipationDay[];
};

export type WeeklyParticipation = {
  days: WeeklyParticipationDay[];
  weeklySeries: WeeklyParticipationSeries[];
};

export type WeeklyTableRow = {
  id: string;
  feeling: string;
  experienced: number | null;
  change: number | null;
  desired: number | null;
  balance: number | null;
  trend: string;
};

export type WeeklyDashboardResponse = {
  meta: {
    periodLabel: string;
    weekFilter: IsYatirimWeekFilter;
    previousWeekFilter?: IsYatirimWeekFilter;
    segments: WeeklySegmentOption[];
    categories: WeeklyCategory[];
    selectedSegmentId: string;
    generatedAt: string;
  };
  selectedSegment: {
    kpis: WeeklyDashboardKpis;
    experiencedFeelings: WeeklyFeelingBarItem[];
    desiredFeelings: WeeklyFeelingBarItem[];
    expectationBalance: WeeklyExpectationBalanceItem[];
    participation: WeeklyParticipation;
    weeklySeries: WeeklyParticipationSeries[];
    table: {
      rows: WeeklyTableRow[];
    };
  };
};

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replace("%", "").replace("pp", "").replace(",", "."));
    return Number.isFinite(normalized) ? normalized : fallback;
  }

  return fallback;
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "" || value === "-") {
    return null;
  }

  return asNumber(value);
}

function asArray<T>(value: unknown, mapper: (item: unknown, index: number) => T): T[] {
  return Array.isArray(value) ? value.map(mapper) : [];
}

function parseIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function getMondayForIsoDate(value: string) {
  const date = parseIsoDate(value);

  if (!date) {
    return "";
  }

  const dayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayOffset);
  return formatIsoDate(date);
}

export function normalizeIsYatirimWeeklySegment(value: string | null | undefined) {
  const segment = value?.trim();
  return segment || DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT;
}

export function normalizeIsYatirimWeeklyToken(value: string | null | undefined) {
  return value?.trim() || "";
}

export function normalizeIsYatirimWeekMode(
  value: string | null | undefined,
): IsYatirimWeekMode {
  const normalized = value?.trim();

  if (
    normalized === "last_week" ||
    normalized === "last_4_weeks" ||
    normalized === "last_8_weeks" ||
    normalized === "week" ||
    normalized === "this_week"
  ) {
    return normalized;
  }

  return DEFAULT_IS_YATIRIM_WEEK_MODE;
}

export function normalizeIsYatirimWeekFilter({
  weekMode,
  weekStartDate,
}: {
  weekMode?: string | null;
  weekStartDate?: string | null;
}): IsYatirimWeekFilter {
  const mode = normalizeIsYatirimWeekMode(weekMode);

  if (mode !== "week") {
    return { mode };
  }

  const normalizedWeekStartDate = getMondayForIsoDate(weekStartDate?.trim() || "");

  if (!normalizedWeekStartDate) {
    return { mode: DEFAULT_IS_YATIRIM_WEEK_MODE };
  }

  return {
    mode,
    weekStartDate:
      normalizedWeekStartDate < IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE
        ? IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE
        : normalizedWeekStartDate,
  };
}

export function applyIsYatirimWeekFilterToSearchParams(
  searchParams: URLSearchParams,
  weekFilter: IsYatirimWeekFilter,
) {
  if (weekFilter.mode === DEFAULT_IS_YATIRIM_WEEK_MODE) {
    searchParams.delete("weekMode");
    searchParams.delete("weekStartDate");
    return;
  }

  searchParams.set("weekMode", weekFilter.mode);

  if (weekFilter.mode === "week" && weekFilter.weekStartDate) {
    searchParams.set("weekStartDate", weekFilter.weekStartDate);
  } else {
    searchParams.delete("weekStartDate");
  }
}

function normalizeWeekFilterLike(value: unknown, fallback: IsYatirimWeekFilter) {
  const input = asObject(value);
  const normalized = normalizeIsYatirimWeekFilter({
    weekMode: asString(input.mode || input.weekMode, fallback.mode),
    weekStartDate: asString(input.weekStartDate || fallback.weekStartDate),
  });

  if (normalized.mode === "week" && !normalized.weekStartDate) {
    return fallback;
  }

  return {
    ...normalized,
    ...(input.label ? { label: asString(input.label) } : {}),
    ...(input.periodLabel ? { periodLabel: asString(input.periodLabel) } : {}),
    ...(input.weekLabel ? { weekLabel: asString(input.weekLabel) } : {}),
  };
}

function normalizeSegmentOption(value: unknown, index: number): WeeklySegmentOption {
  const input = asObject(value);
  const id = asString(input.id || input.segmentId, index === 0 ? "all" : "");

  return {
    id: id || `segment-${index + 1}`,
    label: asString(input.label || input.segmentLabel || input.name, id || "Segment"),
    ...(input.type ? { type: asString(input.type) } : {}),
    ...(input.respondentCount !== undefined
      ? { respondentCount: asNumber(input.respondentCount) }
      : {}),
    ...(input.targetEmployeeCount !== undefined
      ? { targetEmployeeCount: asNumber(input.targetEmployeeCount) }
      : {}),
  };
}

function normalizeCategory(value: unknown, index: number): WeeklyCategory {
  const input = asObject(value);
  const label = asString(input.label || input.name || value, `Kategori ${index + 1}`);
  return {
    id: asString(input.id || input.category || input.categoryId || input.key, label),
    label,
    ...(input.shortLabel ? { shortLabel: asString(input.shortLabel) } : {}),
  };
}

function firstDefined(...values: unknown[]) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeKpiMetric(value: unknown, fallbackLabel: string): WeeklyKpiMetric {
  const input = asObject(value);
  const primitiveValue =
    typeof value === "string" || typeof value === "number" ? value : undefined;
  const metricValue = firstDefined(
    primitiveValue,
    input.value,
    input.percentage,
    input.rate,
    input.total,
    input.count,
    input.gap,
    input.gapPp,
    input.balancePp,
    input.pp,
  );
  const label = asString(
    input.label || input.feeling || input.emotion || input.category || input.name,
    fallbackLabel,
  );
  const subtitle = asString(
    input.subtitle ||
      input.description ||
      input.detail ||
      input.trendLabel ||
      (input.desiredPercentage !== undefined && input.experiencedPercentage !== undefined
        ? `İstenen %${asNumber(input.desiredPercentage).toLocaleString("tr-TR")} · Deneyimlenen %${asNumber(input.experiencedPercentage).toLocaleString("tr-TR")}`
        : ""),
  );
  const percentageDelta = firstDefined(
    input.deltaPercentage,
    input.changePercentage,
    input.percentChange,
    input.percentageChange,
  );
  const pointDelta = firstDefined(input.delta, input.deltaPp, input.change, input.changePp);
  const delta = firstDefined(percentageDelta, pointDelta);
  const previousTotal = firstDefined(input.previousTotal, input.previousCount);
  const fallbackDeltaLabel =
    delta === undefined && previousTotal !== undefined
      ? asNumber(previousTotal) === 0
        ? "Önceki hafta yok"
        : `Önceki hafta ${new Intl.NumberFormat("tr-TR").format(asNumber(previousTotal))}`
      : "";

  return {
    label,
    value:
      typeof metricValue === "string"
        ? metricValue
        : asNumber(metricValue, typeof value === "number" ? value : 0),
    subtitle,
    ...(delta !== undefined
      ? {
          delta: asNumber(delta),
          deltaUnit: percentageDelta !== undefined ? "percent" : "pp",
        }
      : {}),
    ...(input.deltaLabel || input.changeLabel || fallbackDeltaLabel
      ? { deltaLabel: asString(input.deltaLabel || input.changeLabel || fallbackDeltaLabel) }
      : {}),
  };
}

function normalizeChartItems(value: unknown): WeeklyFeelingBarItem[] {
  const input = asObject(value);
  const rawItems = Array.isArray(value)
    ? value
    : input.items || input.rows || input.data || input.categories || [];

  return asArray(rawItems, (item, index) => {
    const raw = asObject(item);
    const label = asString(
      raw.label || raw.feeling || raw.emotion || raw.category || raw.name,
      `Duygu ${index + 1}`,
    );

    return {
      id: asString(raw.id || raw.key || raw.categoryId, label),
      label,
      current: asNumber(
        firstDefined(
          raw.current,
          raw.currentValue,
          raw.currentPercent,
          raw.percentage,
          raw.rate,
          raw.value,
          raw.average,
        ),
      ),
      previous: asNumber(
        firstDefined(
          raw.previous,
          raw.previousValue,
          raw.previousPercent,
          raw.previousPercentage,
          raw.comparisonValue,
        ),
      ),
      ...(firstDefined(raw.delta, raw.deltaPp, raw.change, raw.changePp) !== undefined
        ? { delta: asNumber(firstDefined(raw.delta, raw.deltaPp, raw.change, raw.changePp)) }
        : {}),
    };
  });
}

function normalizeExpectationBalance(value: unknown): WeeklyExpectationBalanceItem[] {
  const input = asObject(value);
  const rawItems = Array.isArray(value)
    ? value
    : input.items || input.rows || input.data || input.categories || [];

  return asArray(rawItems, (item, index) => {
    const raw = asObject(item);
    const label = asString(
      raw.label || raw.feeling || raw.emotion || raw.category || raw.name,
      `Duygu ${index + 1}`,
    );

    return {
      id: asString(raw.id || raw.key || raw.category || raw.categoryId, label),
      label,
      value: asNumber(
        firstDefined(
          raw.value,
          raw.balance,
          raw.balancePp,
          raw.gap,
          raw.difference,
          raw.current,
          raw.currentValue,
        ),
      ),
      ...(firstDefined(raw.previous, raw.previousValue, raw.previousBalancePp) !== undefined
        ? { previous: asNumber(firstDefined(raw.previous, raw.previousValue, raw.previousBalancePp)) }
        : {}),
      ...(firstDefined(raw.deltaPp, raw.delta, raw.change) !== undefined
        ? { trend: asNumber(firstDefined(raw.deltaPp, raw.delta, raw.change)) }
        : {}),
    };
  });
}

function normalizeParticipationDay(value: unknown, fallbackDay: WeeklyParticipationDay["day"]) {
  const input = asObject(value);
  return {
    day: normalizeParticipationDayLabel(input.day || input.label || input.name, fallbackDay),
    value: asNumber(firstDefined(input.value, input.count, input.total, input.respondentCount)),
  };
}

function normalizeParticipationDayLabel(
  value: unknown,
  fallbackDay: WeeklyParticipationDay["day"],
): WeeklyParticipationDay["day"] {
  const normalized = asString(value).trim().toLocaleLowerCase("tr-TR");
  const match = WEEKLY_PARTICIPATION_DAYS.find(
    (day) => day.toLocaleLowerCase("tr-TR") === normalized,
  );
  return match || fallbackDay;
}

function sortFixedParticipationDays(days: WeeklyParticipationDay[]) {
  const dayMap = new Map(days.map((day) => [day.day, day.value]));

  return WEEKLY_PARTICIPATION_DAYS.map((day) => ({
    day,
    value: dayMap.get(day) || 0,
  }));
}

function normalizeParticipationSeries(value: unknown, index: number): WeeklyParticipationSeries {
  const input = asObject(value);
  const rawDays = input.days || input.data || input.points || [];
  const days = sortFixedParticipationDays(
    asArray(rawDays, (dayItem, dayIndex) =>
      normalizeParticipationDay(
        dayItem,
        WEEKLY_PARTICIPATION_DAYS[dayIndex] || WEEKLY_PARTICIPATION_DAYS[0],
      ),
    ),
  );

  return {
    id: asString(input.id || input.key, `week-${index + 1}`),
    label: asString(input.label || input.name || input.weekLabel, `Hafta ${index + 1}`),
    days,
  };
}

function normalizeParticipation(value: unknown): WeeklyParticipation {
  const input = asObject(value);
  const days = sortFixedParticipationDays(
    asArray(input.days, (dayItem, index) =>
      normalizeParticipationDay(dayItem, WEEKLY_PARTICIPATION_DAYS[index]),
    ),
  );
  const weeklySeries = asArray(
    input.weeklySeries || input.series,
    normalizeParticipationSeries,
  );

  return {
    days,
    weeklySeries: weeklySeries.length
      ? weeklySeries
      : [{ id: "current", label: "Seçili dönem", days }],
  };
}

function normalizeTableRow(value: unknown, index: number): WeeklyTableRow {
  const input = asObject(value);
  const feeling = asString(
    input.feeling || input.label || input.emotion || input.category || input.name,
    `Duygu ${index + 1}`,
  );

  return {
    id: asString(input.id || input.key || input.categoryId, feeling),
    feeling,
    experienced: asNullableNumber(
      firstDefined(
        input.experienced,
        input.experience,
        input.experiencePercentage,
        input.currentExperience,
        input.averageExperience,
      ),
    ),
    change: asNullableNumber(firstDefined(input.change, input.delta, input.deltaPp, input.changePp, input.experienceChangePp)),
    desired: asNullableNumber(
      firstDefined(
        input.desired,
        input.desiredPercentage,
        input.wanted,
        input.currentDesired,
        input.averageDesired,
      ),
    ),
    balance: asNullableNumber(
      firstDefined(input.balance, input.balancePp, input.gap, input.difference, input.averageBalance),
    ),
    trend: asString(
      asObject(input.trend).label || input.trendLabel || input.range || input.balanceLabel,
    ),
  };
}

export function normalizeWeeklyDashboardResponse(
  value: unknown,
  {
    fallbackWeekFilter,
    selectedSegment,
  }: {
    fallbackWeekFilter?: IsYatirimWeekFilter;
    selectedSegment?: string;
  } = {},
): WeeklyDashboardResponse {
  const input = asObject(value);
  const meta = asObject(input.meta);
  const selectedSegmentInput = asObject(input.selectedSegment);
  const kpis = asObject(selectedSegmentInput.kpis);
  const participation = normalizeParticipation(selectedSegmentInput.participation);
  const weeklySeries = asArray(
    selectedSegmentInput.weeklySeries,
    normalizeParticipationSeries,
  );
  const resolvedWeekFilter = normalizeWeekFilterLike(
    meta.weekFilter,
    fallbackWeekFilter || { mode: DEFAULT_IS_YATIRIM_WEEK_MODE },
  );

  return {
    meta: {
      periodLabel: asString(meta.periodLabel, "Bu Hafta"),
      weekFilter: resolvedWeekFilter,
      previousWeekFilter: meta.previousWeekFilter
        ? normalizeWeekFilterLike(meta.previousWeekFilter, resolvedWeekFilter)
        : undefined,
      segments: asArray(meta.segments, normalizeSegmentOption),
      categories: Array.isArray(meta.categories)
        ? asArray(meta.categories, normalizeCategory)
        : [
            ...asArray(asObject(meta.categories).experienced, normalizeCategory),
            ...asArray(asObject(meta.categories).desired, normalizeCategory),
          ],
      selectedSegmentId: asString(
        meta.selectedSegmentId || selectedSegmentInput.segmentId,
        selectedSegment || DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT,
      ),
      generatedAt: asString(meta.generatedAt),
    },
    selectedSegment: {
      kpis: {
        participant: normalizeKpiMetric(kpis.participant, "Katılımcı"),
        noneOnly: normalizeKpiMetric(kpis.noneOnly, "Hiçbiri"),
        topExpectationGap: normalizeKpiMetric(
          kpis.topExpectationGap,
          "Tek beklenti açığı",
        ),
      },
      experiencedFeelings: normalizeChartItems(selectedSegmentInput.experiencedFeelings),
      desiredFeelings: normalizeChartItems(selectedSegmentInput.desiredFeelings),
      expectationBalance: normalizeExpectationBalance(
        selectedSegmentInput.expectationBalance,
      ),
      participation,
      weeklySeries: weeklySeries.length ? weeklySeries : participation.weeklySeries,
      table: {
        rows: asArray(asObject(selectedSegmentInput.table).rows, normalizeTableRow),
      },
    },
  };
}

export function formatWeeklyPercent(value: number | null, fractionDigits = 1) {
  if (value === null) {
    return "-";
  }

  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

export function formatWeeklyPp(value: number | null, fractionDigits = 1) {
  if (value === null) {
    return "-";
  }

  const formatted = new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    signDisplay: "always",
  }).format(value);

  return `${formatted}pp`;
}

export function formatWeeklyCount(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}
