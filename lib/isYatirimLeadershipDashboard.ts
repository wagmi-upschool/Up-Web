export const IS_YATIRIM_CLIENT = "is-yatirim";
export const IS_YATIRIM_COMPETENCY_ID =
  "9bb629ad-afd3-4cae-9744-a3faf5729174";
export const DEFAULT_IS_YATIRIM_SEGMENT = "all";

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
  previousAverageMoodScore: number;
  currentSurveyDate: string;
  currentAverageMoodScore: number;
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

export type DashboardComparisons = {
  gmyRanking: GmyRankingItem[];
  gmyScoreChanges: GmyScoreChangeItem[];
  gmyExtremes: GmyExtremeItem[];
  dateComparison: SurveyDateComparisonItem[];
};

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
    maxMoodScore: 4;
    selectedSegmentId: string;
    segments: SegmentOption[];
  };
  selectedSegment: SegmentDashboardData;
  comparisons: DashboardComparisons;
};

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

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" ? (value as Record<string, any>) : {};
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

export function normalizeIsYatirimSegment(value: string | null | undefined) {
  const segment = value?.trim();
  return segment || DEFAULT_IS_YATIRIM_SEGMENT;
}

function normalizeWord(value: unknown): WordItem {
  const input = asObject(value);
  const category = asString(input.category) as MoodCategory;

  return {
    text: asString(input.text),
    count: asNumber(input.count),
    ...(input.normalizedText ? { normalizedText: asString(input.normalizedText) } : {}),
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

function normalizeLatest(value: unknown): SurveyMetricSnapshot {
  const input = asObject(value);
  const derived = asObject(input.derived);

  return {
    surveyDate: asString(input.surveyDate),
    surveyDateLabel: asString(input.surveyDateLabel),
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

function normalizeSelectedSegment(value: unknown): SegmentDashboardData {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId, DEFAULT_IS_YATIRIM_SEGMENT),
    segmentLabel: asString(input.segmentLabel, "Tüm Şirket"),
    latest: normalizeLatest(input.latest),
    trend: asArray(input.trend, normalizeTrendPoint),
    engagementByMood: normalizeEngagementByMood(input.engagementByMood),
    wordClouds: normalizeWordClouds(input.wordClouds),
    allWords: asArray(input.allWords, normalizeWord),
  };
}

function normalizeRankingItem(value: unknown): GmyRankingItem {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId),
    label: asString(input.label),
    rank: asNumber(input.rank),
    averageMoodScore: asNumber(input.averageMoodScore),
    respondentCount: asNumber(input.respondentCount),
    participationRate: asNumber(input.participationRate),
  };
}

function normalizeScoreChangeItem(value: unknown): GmyScoreChangeItem {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId),
    label: asString(input.label),
    previousSurveyDate: asString(input.previousSurveyDate),
    previousAverageMoodScore: asNumber(input.previousAverageMoodScore),
    currentSurveyDate: asString(input.currentSurveyDate),
    currentAverageMoodScore: asNumber(input.currentAverageMoodScore),
    delta: asNumber(input.delta),
    respondentCount: asNumber(input.respondentCount),
  };
}

function normalizeExtremeItem(value: unknown): GmyExtremeItem {
  const input = asObject(value);

  return {
    segmentId: asString(input.segmentId),
    label: asString(input.label),
    badRate: asNumber(input.badRate),
    greatRate: asNumber(input.greatRate),
    respondentCount: asNumber(input.respondentCount),
  };
}

export function normalizeLeadershipDashboardResponse(
  value: unknown,
): LeadershipDashboardResponse {
  const input = asObject(value);
  const meta = asObject(input.meta);
  const comparisons = asObject(input.comparisons);

  return {
    meta: {
      organizationId: asString(meta.organizationId, IS_YATIRIM_CLIENT),
      organizationName: asString(meta.organizationName, "İş Yatırım"),
      dashboardTitle: asString(
        meta.dashboardTitle,
        "İş Yatırım Duygu Durumu",
      ),
      surveyId: asString(meta.surveyId),
      surveyName: asString(meta.surveyName, "Günlük Duygu Durumu Anketi"),
      latestSurveyDate: asString(meta.latestSurveyDate),
      latestSurveyDateLabel: asString(meta.latestSurveyDateLabel),
      generatedAt: asString(meta.generatedAt),
      trendWindowLabel: asString(meta.trendWindowLabel),
      maxMoodScore: 4,
      selectedSegmentId: asString(
        meta.selectedSegmentId,
        DEFAULT_IS_YATIRIM_SEGMENT,
      ),
      segments: asArray(meta.segments, normalizeSegmentOption),
    },
    selectedSegment: normalizeSelectedSegment(input.selectedSegment),
    comparisons: {
      gmyRanking: asArray(comparisons.gmyRanking, normalizeRankingItem).sort(
        (left, right) => {
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
        },
      ),
      gmyScoreChanges: asArray(
        comparisons.gmyScoreChanges,
        normalizeScoreChangeItem,
      ),
      gmyExtremes: asArray(comparisons.gmyExtremes, normalizeExtremeItem),
      dateComparison: asArray(
        comparisons.dateComparison,
        normalizeTrendPoint,
      ).slice(0, 4),
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
