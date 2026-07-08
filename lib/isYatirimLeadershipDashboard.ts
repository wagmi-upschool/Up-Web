export const IS_YATIRIM_CLIENT = "is-yatirim";
export const IS_YATIRIM_COMPETENCY_ID = "9bb629ad-afd3-4cae-9744-a3faf5729174";
export const DEFAULT_IS_YATIRIM_SEGMENT = "all";
export const DEFAULT_IS_YATIRIM_FALLBACK_DATE = "1970-01-01";
export const IS_YATIRIM_DATE_PICKER_MIN_DATE = "2026-05-20";
export const IS_YATIRIM_UNVAN_QUERY_PARAM = "unvan";

export type IsYatirimDateFilterMode = "single" | "range";
export type IsYatirimDateFilter = {
  mode: IsYatirimDateFilterMode;
  startDate: string;
  endDate: string;
  dayCount: number;
};

export type MoodCategory = "bad" | "meh" | "good" | "great";
export type EngagementAnswer = "yes" | "partial" | "no";

export type SegmentOption = {
  id: string;
  label: string;
  type: "all" | "gmy" | "department" | "management";
  respondentCount: number;
  targetEmployeeCount: number;
};

export type WordItem = {
  text: string;
  count: number;
  normalizedText?: string;
  category?: MoodCategory;
};

export type MoodDistributionItem = {
  category: MoodCategory;
  label: string;
  emoji: string;
  percentage: number;
  respondentCount: number;
};

export type SurveyTrendPoint = {
  surveyDate: string;
  surveyDateLabel: string;
  respondentCount: number;
  participationRate: number;
  averageMoodScore: number;
  badRate: number;
  mehRate: number;
  goodRate: number;
  greatRate: number;
};

export type SurveyDateComparisonItem = SurveyTrendPoint;

export type EngagementAnswerMetric = {
  label: "Evet" | "Kısmen" | "Hayır";
  percentage: number;
  respondentCount: number;
};

export type EngagementByMood = {
  mood: MoodCategory;
  respondentCount: number;
  answers: Record<EngagementAnswer, EngagementAnswerMetric>;
  workLinkedRate: number;
};

export type SurveyMetricSnapshot = {
  surveyDate: string;
  surveyDateLabel: string;
  startDate: string;
  endDate: string;
  dateMode: IsYatirimDateFilterMode;
  dayCount: number;
  respondentCount: number;
  targetEmployeeCount: number;
  participationRate: number;
  averageMoodScore: number;
  workLinkedLowMoodRate: number;
  mostFrequentWord: WordItem | null;
  moodDistribution: Record<MoodCategory, MoodDistributionItem>;
  derived: {
    lowMoodRate: number;
    goodGreatRate: number;
  };
};

export type SegmentDashboardData = {
  segmentId: string;
  segmentLabel: string;
  latest: SurveyMetricSnapshot;
  trend: SurveyTrendPoint[];
  engagementByMood: Record<MoodCategory, EngagementByMood>;
  wordClouds: Record<MoodCategory, WordItem[]>;
  allWords: WordItem[];
};

export type GmyRankingItem = {
  segmentId: string;
  label: string;
  rank: number;
  averageMoodScore: number;
  respondentCount: number;
  participationRate: number;
};

export type GmyScoreChangeItem = {
  segmentId: string;
  label: string;
  previousSurveyDate: string;
  previousStartDate: string;
  previousEndDate: string;
  previousAverageMoodScore: number;
  currentSurveyDate: string;
  currentStartDate: string;
  currentEndDate: string;
  currentAverageMoodScore: number;
  mode: IsYatirimDateFilterMode;
  delta: number;
  respondentCount: number;
};

export type GmyExtremeItem = {
  segmentId: string;
  label: string;
  badRate: number;
  greatRate: number;
  respondentCount: number;
};

export type UnvanRankingItem = GmyRankingItem;
export type UnvanScoreChangeItem = GmyScoreChangeItem;
export type UnvanExtremeItem = GmyExtremeItem;

export type DashboardComparisons = {
  gmyRanking: GmyRankingItem[];
  gmyScoreChanges: GmyScoreChangeItem[];
  gmyExtremes: GmyExtremeItem[];
  unvanRanking: UnvanRankingItem[];
  unvanScoreChanges: UnvanScoreChangeItem[];
  unvanExtremes: UnvanExtremeItem[];
  dateComparison: SurveyDateComparisonItem[];
};

export type IsYatirimComparisonBreakdown = "gmy" | "unvan";

export type LeadershipDashboardResponse = {
  meta: {
    organizationId: string;
    organizationName: string;
    dashboardTitle: string;
    surveyId: string;
    surveyName: string;
    latestSurveyDate: string;
    latestSurveyDateLabel: string;
    generatedAt: string;
    trendWindowLabel: string;
    dateFilter: IsYatirimDateFilter;
    maxMoodScore: 4;
    selectedSegmentId: string;
    selectedUnvanId?: string | null;
    segments: SegmentOption[];
  };
  selectedSegment: SegmentDashboardData;
  selectedUnvan?: SegmentDashboardData | null;
  comparisons: DashboardComparisons;
};

export function hasIsYatirimUnvanComparisons(
  comparisons?: Partial<DashboardComparisons> | null,
) {
  return Boolean(
    comparisons &&
      ((comparisons.unvanRanking?.length || 0) > 0 ||
        (comparisons.unvanScoreChanges?.length || 0) > 0 ||
        (comparisons.unvanExtremes?.length || 0) > 0),
  );
}

export function resolveIsYatirimComparisonBreakdown({
  comparisons,
  isUnvanComparisonEnabled,
  selectedUnvan,
}: {
  comparisons?: Partial<DashboardComparisons> | null;
  isUnvanComparisonEnabled: boolean;
  selectedUnvan: string;
}): IsYatirimComparisonBreakdown {
  if (
    isUnvanComparisonEnabled &&
    normalizeIsYatirimUnvan(selectedUnvan) &&
    hasIsYatirimUnvanComparisons(comparisons)
  ) {
    return "unvan";
  }

  return "gmy";
}

export function getIsYatirimComparisonItems(
  comparisons: DashboardComparisons | undefined,
  breakdown: IsYatirimComparisonBreakdown,
) {
  if (breakdown === "unvan") {
    return {
      rankingItems: comparisons?.unvanRanking || [],
      scoreChangeItems: comparisons?.unvanScoreChanges || [],
      extremeItems: comparisons?.unvanExtremes || [],
    };
  }

  return {
    rankingItems: comparisons?.gmyRanking || [],
    scoreChangeItems: comparisons?.gmyScoreChanges || [],
    extremeItems: comparisons?.gmyExtremes || [],
  };
}

export const MOOD_ORDER: MoodCategory[] = ["bad", "meh", "good", "great"];

export const MOOD_TOKENS: Record<
  MoodCategory,
  { label: string; emoji: string; color: string }
> = {
  bad: { label: "Kötü", emoji: "😞", color: "#E03030" },
  meh: { label: "Eh İşte", emoji: "😐", color: "#FC7700" },
  good: { label: "İyi", emoji: "🙂", color: "#0057FF" },
  great: { label: "Harika", emoji: "🤩", color: "#00D9C0" },
};

export const ENGAGEMENT_ANSWER_LABELS: Record<
  EngagementAnswer,
  "Evet" | "Kısmen" | "Hayır"
> = {
  yes: "Evet",
  partial: "Kısmen",
  no: "Hayır",
};

const EMPTY_DISTRIBUTION = MOOD_ORDER.reduce(
  (acc, mood) => {
    acc[mood] = {
      category: mood,
      label: MOOD_TOKENS[mood].label,
      emoji: MOOD_TOKENS[mood].emoji,
      percentage: 0,
      respondentCount: 0,
    };
    return acc;
  },
  {} as Record<MoodCategory, MoodDistributionItem>,
);

const EMPTY_ENGAGEMENT = MOOD_ORDER.reduce(
  (acc, mood) => {
    acc[mood] = {
      mood,
      respondentCount: 0,
      answers: {
        yes: { label: "Evet", percentage: 0, respondentCount: 0 },
        partial: { label: "Kısmen", percentage: 0, respondentCount: 0 },
        no: { label: "Hayır", percentage: 0, respondentCount: 0 },
      },
      workLinkedRate: 0,
    };
    return acc;
  },
  {} as Record<MoodCategory, EngagementByMood>,
);

const EMPTY_WORD_CLOUDS = MOOD_ORDER.reduce(
  (acc, mood) => {
    acc[mood] = [];
    return acc;
  },
  {} as Record<MoodCategory, WordItem[]>,
);

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object"
    ? (value as Record<string, any>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asArray<T>(value: unknown, mapper: (item: unknown) => T): T[] {
  return Array.isArray(value) ? value.map(mapper) : [];
}

function createUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function parseIsoDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    return null;
  }

  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const date = createUtcDate(year, month - 1, day);

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function formatIsoDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getInclusiveDayCount(startDate: string, endDate: string) {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start || !end) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
}

export function normalizeIsYatirimSegment(value: string | null | undefined) {
  const segment = value?.trim();
  return segment || DEFAULT_IS_YATIRIM_SEGMENT;
}

export function normalizeIsYatirimDashboardToken(
  value: string | null | undefined,
) {
  return value?.trim() || "";
}

export function normalizeIsYatirimUnvan(value: string | null | undefined) {
  return value?.trim() || "";
}

export function normalizeIsYatirimUnvanFlag(value: string | null | undefined) {
  return value?.trim() === "true";
}

export function normalizeIsYatirimDateTimePickerFlag(
  value: string | null | undefined,
) {
  return value?.trim() !== "false";
}

export function getTodayDateString(now = new Date()) {
  return formatIsoDate(
    createUtcDate(now.getFullYear(), now.getMonth(), now.getDate()),
  );
}

export function normalizeIsYatirimDateFilter(
  {
    dateMode,
    startDate,
    endDate,
  }: {
    dateMode?: string | null | undefined;
    startDate?: string | null | undefined;
    endDate?: string | null | undefined;
  },
  {
    todayDate = DEFAULT_IS_YATIRIM_FALLBACK_DATE,
  }: {
    todayDate?: string;
  } = {},
): IsYatirimDateFilter {
  const fallbackDate = parseIsoDate(todayDate)
    ? todayDate
    : DEFAULT_IS_YATIRIM_FALLBACK_DATE;
  const fallbackDateWithMin =
    fallbackDate < IS_YATIRIM_DATE_PICKER_MIN_DATE
      ? IS_YATIRIM_DATE_PICKER_MIN_DATE
      : fallbackDate;
  const normalizedMode = dateMode?.trim();
  const normalizedStartDate = startDate?.trim() || "";
  const normalizedEndDate = endDate?.trim() || "";
  const parsedStartDate = parseIsoDate(normalizedStartDate);
  const parsedEndDate = parseIsoDate(normalizedEndDate);

  const fallbackFilter: IsYatirimDateFilter = {
    mode: "single",
    startDate: fallbackDateWithMin,
    endDate: fallbackDateWithMin,
    dayCount: 1,
  };

  if (normalizedMode === "single") {
    if (
      parsedStartDate &&
      parsedEndDate &&
      normalizedStartDate === normalizedEndDate
    ) {
      const normalizedDate =
        normalizedStartDate < IS_YATIRIM_DATE_PICKER_MIN_DATE
          ? IS_YATIRIM_DATE_PICKER_MIN_DATE
          : normalizedStartDate;

      return {
        mode: "single",
        startDate: normalizedDate,
        endDate: normalizedDate,
        dayCount: 1,
      };
    }

    return fallbackFilter;
  }

  if (normalizedMode === "range") {
    if (
      parsedStartDate &&
      parsedEndDate &&
      parsedStartDate.getTime() <= parsedEndDate.getTime()
    ) {
      const normalizedRangeStartDate =
        normalizedStartDate < IS_YATIRIM_DATE_PICKER_MIN_DATE
          ? IS_YATIRIM_DATE_PICKER_MIN_DATE
          : normalizedStartDate;

      if (normalizedRangeStartDate > normalizedEndDate) {
        return fallbackFilter;
      }

      return {
        mode: "range",
        startDate: normalizedRangeStartDate,
        endDate: normalizedEndDate,
        dayCount: getInclusiveDayCount(
          normalizedRangeStartDate,
          normalizedEndDate,
        ),
      };
    }

    return fallbackFilter;
  }

  return fallbackFilter;
}

export function resolveIsYatirimDateFilterByPickerFlag(
  isDateTimePickerEnabled: boolean,
  dateFilter: IsYatirimDateFilter,
) {
  return isDateTimePickerEnabled ? dateFilter : undefined;
}

export function isSameIsYatirimDateFilter(
  left: IsYatirimDateFilter,
  right: IsYatirimDateFilter,
) {
  return (
    left.mode === right.mode &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate &&
    left.dayCount === right.dayCount
  );
}

export function applyIsYatirimDateFilterToSearchParams(
  searchParams: URLSearchParams,
  dateFilter: IsYatirimDateFilter,
) {
  searchParams.set("dateMode", dateFilter.mode);
  searchParams.set("startDate", dateFilter.startDate);
  searchParams.set("endDate", dateFilter.endDate);
}

export function applyIsYatirimBreakdownSelectionToSearchParams(
  searchParams: URLSearchParams,
  selection:
    | { type: "gmy"; segment: string }
    | { type: "unvan"; unvan: string; isUnvanEnabled: boolean },
) {
  if (selection.type === "unvan" && selection.isUnvanEnabled) {
    const unvan = normalizeIsYatirimUnvan(selection.unvan);

    searchParams.delete("segment");
    if (unvan) {
      searchParams.set(IS_YATIRIM_UNVAN_QUERY_PARAM, unvan);
    } else {
      searchParams.delete(IS_YATIRIM_UNVAN_QUERY_PARAM);
    }
    return;
  }

  const segment =
    selection.type === "gmy"
      ? normalizeIsYatirimSegment(selection.segment)
      : DEFAULT_IS_YATIRIM_SEGMENT;

  searchParams.delete(IS_YATIRIM_UNVAN_QUERY_PARAM);
  if (segment === DEFAULT_IS_YATIRIM_SEGMENT) {
    searchParams.delete("segment");
  } else {
    searchParams.set("segment", segment);
  }
}

function hasDateFilterFields(value: Record<string, any>) {
  return Boolean(
    value.mode ||
      value.dateMode ||
      value.startDate ||
      value.endDate ||
      value.dayCount,
  );
}

function normalizeDateFilterLike(
  value: unknown,
  fallbackDateFilter: IsYatirimDateFilter,
): IsYatirimDateFilter {
  const input = asObject(value);

  if (!hasDateFilterFields(input)) {
    return fallbackDateFilter;
  }

  return normalizeIsYatirimDateFilter(
    {
      dateMode: asString(input.mode || input.dateMode),
      startDate: asString(input.startDate),
      endDate: asString(input.endDate),
    },
    {
      todayDate: fallbackDateFilter.startDate,
    },
  );
}

function asDateFilterMode(
  value: unknown,
  fallback: IsYatirimDateFilterMode,
): IsYatirimDateFilterMode {
  return value === "single" || value === "range" ? value : fallback;
}

function normalizeWord(value: unknown): WordItem {
  const input = asObject(value);
  const category = asString(input.category) as MoodCategory;

  return {
    text: asString(input.text),
    count: asNumber(input.count),
    ...(input.normalizedText
      ? { normalizedText: asString(input.normalizedText) }
      : {}),
    ...(MOOD_ORDER.includes(category) ? { category } : {}),
  };
}

function normalizeTrendPoint(value: unknown): SurveyTrendPoint {
  const input = asObject(value);

  return {
    surveyDate: asString(input.surveyDate),
    surveyDateLabel: asString(input.surveyDateLabel),
    respondentCount: asNumber(input.respondentCount),
    participationRate: asNumber(input.participationRate),
    averageMoodScore: asNumber(input.averageMoodScore),
    badRate: asNumber(input.badRate),
    mehRate: asNumber(input.mehRate),
    goodRate: asNumber(input.goodRate),
    greatRate: asNumber(input.greatRate),
  };
}

function normalizeSegmentOption(value: unknown): SegmentOption {
  const input = asObject(value);
  const type = asString(input.type, "gmy") as SegmentOption["type"];

  return {
    id: asString(input.id, DEFAULT_IS_YATIRIM_SEGMENT),
    label: asString(input.label, "Tüm Şirket"),
    type: ["all", "gmy", "department", "management"].includes(type)
      ? type
      : "gmy",
    respondentCount: asNumber(input.respondentCount),
    targetEmployeeCount: asNumber(input.targetEmployeeCount),
  };
}

function normalizeMoodDistribution(
  value: unknown,
): Record<MoodCategory, MoodDistributionItem> {
  const input = asObject(value);

  return MOOD_ORDER.reduce(
    (acc, mood) => {
      const raw = asObject(input[mood]);
      acc[mood] = {
        category: mood,
        label: asString(raw.label, MOOD_TOKENS[mood].label),
        emoji: asString(raw.emoji, MOOD_TOKENS[mood].emoji),
        percentage: asNumber(raw.percentage),
        respondentCount: asNumber(raw.respondentCount),
      };
      return acc;
    },
    { ...EMPTY_DISTRIBUTION },
  );
}

function normalizeEngagementByMood(
  value: unknown,
): Record<MoodCategory, EngagementByMood> {
  const input = asObject(value);

  return MOOD_ORDER.reduce(
    (acc, mood) => {
      const raw = asObject(input[mood]);
      const answers = asObject(raw.answers);

      acc[mood] = {
        mood,
        respondentCount: asNumber(raw.respondentCount),
        answers: {
          yes: normalizeEngagementAnswer(answers.yes, "yes"),
          partial: normalizeEngagementAnswer(answers.partial, "partial"),
          no: normalizeEngagementAnswer(answers.no, "no"),
        },
        workLinkedRate: asNumber(raw.workLinkedRate),
      };
      return acc;
    },
    { ...EMPTY_ENGAGEMENT },
  );
}

function normalizeEngagementAnswer(
  value: unknown,
  answer: EngagementAnswer,
): EngagementAnswerMetric {
  const input = asObject(value);

  return {
    label: asString(input.label, ENGAGEMENT_ANSWER_LABELS[answer]) as
      | "Evet"
      | "Kısmen"
      | "Hayır",
    percentage: asNumber(input.percentage),
    respondentCount: asNumber(input.respondentCount),
  };
}

function normalizeWordClouds(value: unknown): Record<MoodCategory, WordItem[]> {
  const input = asObject(value);

  return MOOD_ORDER.reduce(
    (acc, mood) => {
      acc[mood] = asArray(input[mood], normalizeWord);
      return acc;
    },
    { ...EMPTY_WORD_CLOUDS },
  );
}

function normalizeLatest(
  value: unknown,
  fallbackDateFilter: IsYatirimDateFilter,
): SurveyMetricSnapshot {
  const input = asObject(value);
  const derived = asObject(input.derived);
  const dateFilter = normalizeDateFilterLike(
    {
      dateMode: input.dateMode,
      startDate: input.startDate,
      endDate: input.endDate,
      dayCount: input.dayCount,
    },
    fallbackDateFilter,
  );

  return {
    surveyDate: asString(input.surveyDate),
    surveyDateLabel: asString(input.surveyDateLabel),
    startDate: dateFilter.startDate,
    endDate: dateFilter.endDate,
    dateMode: dateFilter.mode,
    dayCount: dateFilter.dayCount,
    respondentCount: asNumber(input.respondentCount),
    targetEmployeeCount: asNumber(input.targetEmployeeCount),
    participationRate: asNumber(input.participationRate),
    averageMoodScore: asNumber(input.averageMoodScore),
    workLinkedLowMoodRate: asNumber(input.workLinkedLowMoodRate),
    mostFrequentWord: input.mostFrequentWord
      ? normalizeWord(input.mostFrequentWord)
      : null,
    moodDistribution: normalizeMoodDistribution(input.moodDistribution),
    derived: {
      lowMoodRate: asNumber(derived.lowMoodRate),
      goodGreatRate: asNumber(derived.goodGreatRate),
    },
  };
}

function normalizeSelectedSegment(
  value: unknown,
  fallbackDateFilter: IsYatirimDateFilter,
): SegmentDashboardData {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId, DEFAULT_IS_YATIRIM_SEGMENT),
    segmentLabel: asString(input.segmentLabel, "Tüm Şirket"),
    latest: normalizeLatest(input.latest, fallbackDateFilter),
    trend: asArray(input.trend, normalizeTrendPoint),
    engagementByMood: normalizeEngagementByMood(input.engagementByMood),
    wordClouds: normalizeWordClouds(input.wordClouds),
    allWords: asArray(input.allWords, normalizeWord),
  };
}

function normalizeRankingItem(value: unknown): GmyRankingItem {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId || input.unvanId),
    label: asString(input.label),
    rank: asNumber(input.rank),
    averageMoodScore: asNumber(input.averageMoodScore),
    respondentCount: asNumber(input.respondentCount),
    participationRate: asNumber(input.participationRate),
  };
}

function normalizeScoreChangeItem(
  value: unknown,
  fallbackMode: IsYatirimDateFilterMode,
): GmyScoreChangeItem {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId || input.unvanId),
    label: asString(input.label),
    previousSurveyDate: asString(input.previousSurveyDate),
    previousStartDate: asString(input.previousStartDate),
    previousEndDate: asString(input.previousEndDate),
    previousAverageMoodScore: asNumber(input.previousAverageMoodScore),
    currentSurveyDate: asString(input.currentSurveyDate),
    currentStartDate: asString(input.currentStartDate),
    currentEndDate: asString(input.currentEndDate),
    currentAverageMoodScore: asNumber(input.currentAverageMoodScore),
    mode: asDateFilterMode(input.mode, fallbackMode),
    delta: asNumber(input.delta),
    respondentCount: asNumber(input.respondentCount),
  };
}

function normalizeExtremeItem(value: unknown): GmyExtremeItem {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId || input.unvanId),
    label: asString(input.label),
    badRate: asNumber(input.badRate),
    greatRate: asNumber(input.greatRate),
    respondentCount: asNumber(input.respondentCount),
  };
}

function sortRankingItems<T extends GmyRankingItem>(items: T[]) {
  return items.sort((left, right) => {
    const leftHasRank = left.rank > 0;
    const rightHasRank = right.rank > 0;

    if (leftHasRank && rightHasRank && left.rank !== right.rank) {
      return left.rank - right.rank;
    }
    if (leftHasRank !== rightHasRank) {
      return leftHasRank ? -1 : 1;
    }
    if (right.averageMoodScore !== left.averageMoodScore) {
      return right.averageMoodScore - left.averageMoodScore;
    }
    return left.label.localeCompare(right.label, "tr");
  });
}

export function normalizeLeadershipDashboardResponse(
  value: unknown,
  {
    fallbackDateFilter,
  }: {
    fallbackDateFilter?: IsYatirimDateFilter;
  } = {},
): LeadershipDashboardResponse {
  const input = asObject(value);
  const meta = asObject(input.meta);
  const comparisons = asObject(input.comparisons);
  const selectedSegment = asObject(input.selectedSegment);
  const selectedSegmentLatest = asObject(selectedSegment.latest);
  const resolvedFallbackDateFilter =
    fallbackDateFilter ||
    normalizeIsYatirimDateFilter(
      {
        dateMode: asString(
          meta.dateMode || selectedSegmentLatest.dateMode,
          "single",
        ),
        startDate:
          asString(meta.latestSurveyDate) ||
          asString(selectedSegmentLatest.startDate) ||
          asString(selectedSegmentLatest.surveyDate) ||
          DEFAULT_IS_YATIRIM_FALLBACK_DATE,
        endDate:
          asString(meta.latestSurveyDate) ||
          asString(selectedSegmentLatest.endDate) ||
          asString(selectedSegmentLatest.surveyDate) ||
          DEFAULT_IS_YATIRIM_FALLBACK_DATE,
      },
      {
        todayDate:
          asString(meta.latestSurveyDate) ||
          asString(selectedSegmentLatest.startDate) ||
          asString(selectedSegmentLatest.surveyDate) ||
          DEFAULT_IS_YATIRIM_FALLBACK_DATE,
      },
    );
  const normalizedMetaDateFilter = normalizeDateFilterLike(
    meta.dateFilter,
    resolvedFallbackDateFilter,
  );

  return {
    meta: {
      organizationId: asString(meta.organizationId, IS_YATIRIM_CLIENT),
      organizationName: asString(meta.organizationName, "İş Yatırım"),
      dashboardTitle: asString(meta.dashboardTitle, "İş Yatırım Duygu Durumu"),
      surveyId: asString(meta.surveyId),
      surveyName: asString(meta.surveyName, "Günlük Duygu Durumu Anketi"),
      latestSurveyDate: asString(meta.latestSurveyDate),
      latestSurveyDateLabel: asString(meta.latestSurveyDateLabel),
      generatedAt: asString(meta.generatedAt),
      trendWindowLabel: asString(meta.trendWindowLabel),
      dateFilter: normalizedMetaDateFilter,
      maxMoodScore: 4,
      selectedSegmentId: asString(
        meta.selectedSegmentId,
        DEFAULT_IS_YATIRIM_SEGMENT,
      ),
      selectedUnvanId: asString(meta.selectedUnvanId) || null,
      segments: asArray(meta.segments, normalizeSegmentOption),
    },
    selectedSegment: normalizeSelectedSegment(
      input.selectedSegment,
      normalizedMetaDateFilter,
    ),
    selectedUnvan: input.selectedUnvan
      ? normalizeSelectedSegment(input.selectedUnvan, normalizedMetaDateFilter)
      : null,
    comparisons: {
      gmyRanking: sortRankingItems(
        asArray(comparisons.gmyRanking, normalizeRankingItem),
      ),
      gmyScoreChanges: asArray(comparisons.gmyScoreChanges, (item) =>
        normalizeScoreChangeItem(item, normalizedMetaDateFilter.mode),
      ),
      gmyExtremes: asArray(comparisons.gmyExtremes, normalizeExtremeItem),
      unvanRanking: sortRankingItems(
        asArray(comparisons.unvanRanking, normalizeRankingItem),
      ),
      unvanScoreChanges: asArray(comparisons.unvanScoreChanges, (item) =>
        normalizeScoreChangeItem(item, normalizedMetaDateFilter.mode),
      ),
      unvanExtremes: asArray(comparisons.unvanExtremes, normalizeExtremeItem),
      dateComparison: asArray(comparisons.dateComparison, normalizeTrendPoint),
    },
  };
}

export function formatPercent(value: number, fractionDigits = 1) {
  return `${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
  }).format(value)}%`;
}

export function formatScore(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

export function formatTurkishDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  }).format(date);
}

export function formatTurkishDate(value: string, withWeekday = false) {
  const date = parseIsoDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withWeekday ? { weekday: "long" as const } : {}),
    timeZone: "UTC",
  }).format(date);
}

function formatTurkishShortDate(value: string) {
  const date = parseIsoDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function formatIsYatirimDateFilterLabel(
  dateFilter: IsYatirimDateFilter,
  {
    includeDayCount = true,
    singleWithWeekday = true,
  }: {
    includeDayCount?: boolean;
    singleWithWeekday?: boolean;
  } = {},
) {
  if (dateFilter.mode === "single") {
    return formatTurkishDate(dateFilter.startDate, singleWithWeekday);
  }

  const start = parseIsoDate(dateFilter.startDate);
  const end = parseIsoDate(dateFilter.endDate);

  if (!start || !end) {
    return `${dateFilter.startDate} – ${dateFilter.endDate}`;
  }

  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();
  const startMonthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    timeZone: "UTC",
  }).format(start);
  const endMonthLabel = new Intl.DateTimeFormat("tr-TR", {
    month: "short",
    timeZone: "UTC",
  }).format(end);
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  let label = "";

  if (startYear === endYear && start.getUTCMonth() === end.getUTCMonth()) {
    label = `${startDay}–${endDay} ${endMonthLabel} ${endYear}`;
  } else if (startYear === endYear) {
    label = `${formatTurkishShortDate(dateFilter.startDate)} – ${endDay} ${endMonthLabel} ${endYear}`;
  } else {
    label = `${startDay} ${startMonthLabel} ${startYear} – ${endDay} ${endMonthLabel} ${endYear}`;
  }

  if (!includeDayCount) {
    return label;
  }

  return `${label} · ${formatCount(dateFilter.dayCount)} gün`;
}

export function formatTrendWindowLabel(
  trend: SurveyTrendPoint[],
  fallback = "Günlük trend",
) {
  if (!trend.length) {
    return fallback;
  }

  const first = trend[0];
  const last = trend.at(-1) || first;
  const firstLabel = first.surveyDateLabel || first.surveyDate;
  const lastLabel = last.surveyDateLabel || last.surveyDate;
  const dayCount = trend.length;

  if (!firstLabel || !lastLabel) {
    return `${formatCount(dayCount)} günlük trend`;
  }

  return `${formatCount(dayCount)} günlük trend (${firstLabel} – ${lastLabel})`;
}
