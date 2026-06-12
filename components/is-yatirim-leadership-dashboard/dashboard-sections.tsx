"use client";

import { Fragment, type ReactNode, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Gauge,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LottieSpinner from "@/components/global/loader/lottie-spinner";
import {
  AnalyticsCard,
  AnalyticsDashboardBody,
  AnalyticsDashboardPageShell,
  AnalyticsSectionHeading,
  AnalyticsSubheading,
} from "@/components/analytics-dashboard/dashboard-shell";
import {
  ENGAGEMENT_ANSWER_LABELS,
  MOOD_ORDER,
  MOOD_TOKENS,
  formatCount,
  formatIsYatirimDateFilterLabel,
  formatPercent,
  formatScore,
  formatTurkishDate,
  formatTurkishDateTime,
  type EngagementAnswer,
  type GmyExtremeItem,
  type GmyRankingItem,
  type GmyScoreChangeItem,
  type IsYatirimDateFilter,
  type IsYatirimDateFilterMode,
  type LeadershipDashboardResponse,
  type MoodCategory,
  type SurveyTrendPoint,
  type WordItem,
} from "@/lib/isYatirimLeadershipDashboard";
import IsYatirimDateFilterPicker from "./date-filter-picker";

type SegmentOption = LeadershipDashboardResponse["meta"]["segments"][number];

const TREND_METRICS = [
  {
    value: "participationRate",
    label: "Katılım",
    pillLabel: "Katılım",
    legendLabel: "Katılım",
    color: "#3489DE",
    chartKey: "participationRate",
    dashed: false,
  },
  {
    value: "averageMoodScore",
    label: "Ort. Duygu",
    pillLabel: "Ort. Duygu",
    legendLabel: "Ort. Duygu",
    color: "#1CA078",
    chartKey: "averageMoodPercent",
    dashed: false,
  },
  {
    value: "badRate",
    label: "% Kötü",
    pillLabel: "% Kötü",
    legendLabel: "% Kötü",
    color: "#E84B4B",
    chartKey: "badRate",
    dashed: true,
  },
  {
    value: "mehRate",
    label: "% Eh İşte",
    pillLabel: "% Eh İşte",
    legendLabel: "% Eh İşte",
    color: "#F59A23",
    chartKey: "mehRate",
    dashed: true,
  },
  {
    value: "goodRate",
    label: "% İyi",
    pillLabel: "% İyi",
    legendLabel: "% İyi",
    color: "#5A9821",
    chartKey: "goodRate",
    dashed: true,
  },
  {
    value: "greatRate",
    label: "% Harika",
    pillLabel: "% Harika",
    legendLabel: "% Harika",
    color: "#5548BD",
    chartKey: "greatRate",
    dashed: true,
  },
] as const;

type TrendMetric = (typeof TREND_METRICS)[number]["value"];
type TrendSelection = "all" | TrendMetric;

const WORD_PILL_PALETTE = [
  { background: "#EEF4FF", border: "#9BB6FF", text: "#0057FF" },
  { background: "#FFF3E8", border: "#FDBD92", text: "#F06B16" },
  { background: "#F3ECFF", border: "#CDB6FF", text: "#8A5CF6" },
  { background: "#ECF8F1", border: "#B8E1CE", text: "#3CA875" },
  { background: "#EAF9F7", border: "#B7E5E1", text: "#277F83" },
] as const;

function clampPercent(value: number) {
  return Math.max(0, Math.min(value, 100));
}

function getTrendMetricConfig(metric: TrendMetric) {
  return TREND_METRICS.find((item) => item.value === metric) || TREND_METRICS[0];
}

function formatMetricValue(value: number, metric: TrendMetric) {
  if (metric === "averageMoodScore") {
    return formatScore(value);
  }

  return formatPercent(value);
}

function formatDashboardDateLabel(
  dateFilter: IsYatirimDateFilter,
  {
    includeDayCount = true,
    singleWithWeekday = false,
  }: {
    includeDayCount?: boolean;
    singleWithWeekday?: boolean;
  } = {},
) {
  return displayTurkishText(
    formatIsYatirimDateFilterLabel(dateFilter, {
      includeDayCount,
      singleWithWeekday,
    }),
  );
}

const TURKISH_UPPERCASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bANKETI\b/g, "ANKETİ"],
  [/\bBAGLANTI\b/g, "BAĞLANTI"],
  [/\bDEGISIM\b/g, "DEĞİŞİM"],
  [/\bDEVECIOĞLU\b/g, "DEVECİOĞLU"],
  [/\bFATIH\b/g, "FATİH"],
  [/\bGUNCEL\b/g, "GÜNCEL"],
  [/\bGUNLUK\b/g, "GÜNLÜK"],
  [/\bHARIKA\b/g, "HARİKA"],
  [/\bHAZIRAN\b/g, "HAZİRAN"],
  [/\bISTE\b/g, "İŞTE"],
  [/\bIYI\b/g, "İYİ"],
  [/İYI/g, "İYİ"],
  [/\bKELIME\b/g, "KELİME"],
  [/\bOLCUM\b/g, "ÖLÇÜM"],
  [/\bONCEKI\b/g, "ÖNCEKİ"],
  [/\bSISTEMLER\b/g, "SİSTEMLER"],
  [/ŞIRKET/g, "ŞİRKET"],
  [/\bTARIH\b/g, "TARİH"],
  [/\bVELI\b/g, "VELİ"],
  [/\bVERISI\b/g, "VERİSİ"],
  [/\bYÖNETIM\b/g, "YÖNETİM"],
];

function withTurkishUppercaseCharacters(value: string) {
  return TURKISH_UPPERCASE_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

function displayTurkishText(value: string) {
  return withTurkishUppercaseCharacters(value);
}

function toTurkishUpperCase(value: string) {
  return withTurkishUppercaseCharacters(value.toLocaleUpperCase("tr-TR"));
}

function abbreviatePersonName(value: string) {
  const normalized = displayTurkishText(value).trim();
  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length < 2) {
    return normalized;
  }

  const surname = parts.at(-1) || "";
  const initials = parts
    .slice(0, -1)
    .map((part) => `${part.charAt(0).toLocaleUpperCase("tr-TR")}.`)
    .join("");

  return `${initials} ${surname}`;
}

function formatSegmentTabLabel(segment: SegmentOption) {
  if (segment.type !== "gmy") {
    return displayTurkishText(segment.label);
  }

  return abbreviatePersonName(segment.label);
}

function MiniProgressBar({
  value,
  color,
  minVisible = 0,
}: {
  value: number;
  color: string;
  minVisible?: number;
}) {
  const width = value > 0 ? Math.max(minVisible, clampPercent(value)) : 0;

  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-[#EFEAE0]">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ backgroundColor: color, width: `${width}%` }}
      />
    </div>
  );
}

function EmptyInlineState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-dashed border-[#171717]/14 bg-[#FFFFFF]/62 p-6 text-center font-poppins text-sm font-semibold tracking-[0.18em] text-[#171717]/42">
      {toTurkishUpperCase(children)}
    </div>
  );
}

export function IsYatirimPageShell({ children }: { children: ReactNode }) {
  return (
    <AnalyticsDashboardPageShell>
      <AnalyticsDashboardBody>{children}</AnalyticsDashboardBody>
    </AnalyticsDashboardPageShell>
  );
}

export function IsYatirimHeader({
  dateFilter,
  onDateFilterChange,
  response,
  isUpdating,
}: {
  dateFilter: IsYatirimDateFilter;
  onDateFilterChange: (dateFilter: IsYatirimDateFilter) => void;
  response?: LeadershipDashboardResponse;
  isUpdating: boolean;
}) {
  const generatedAt = formatTurkishDateTime(response?.meta.generatedAt || "");
  const title = response?.meta.dashboardTitle || "İş Yatırım Duygu Durumu";
  const latestLabel = response?.meta.latestSurveyDateLabel || "Son ölçüm";
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const filterContextLabel =
    dateFilter.mode === "single"
      ? "Tek gün görünümü"
      : `${formatCount(dateFilter.dayCount)} günlük aralık`;

  return (
    <header className="relative z-30 overflow-visible rounded-[30px] border border-[#171717]/10 bg-[#F8F2E7]/80 shadow-[0_24px_60px_rgba(23,23,23,0.08)] backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_85%_18%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.55),rgba(255,255,255,0.18))]" />
      <div className="relative z-10">
        <div className="flex flex-col gap-4 border-b border-[#171717]/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex flex-wrap items-center gap-4">
            <Image
              alt="UP"
              className="h-10 w-auto shrink-0 sm:h-12"
              height={64}
              src="/up.svg"
              width={96}
            />
            <div className="h-8 w-px bg-[#171717]/10" />
            <Image
              alt="İş Yatırım"
              className="h-8 w-auto object-contain sm:h-10"
              height={80}
              src="/is-yatirim-logo.png"
              width={220}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00A878]/20 bg-[#00A878]/10 px-3 py-1.5 font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-[#0B7D5E]">
              <span className="h-2 w-2 rounded-full bg-[#00A878]" />
              CANLI
            </div>
            {isUpdating ? (
              <div className="inline-flex items-center gap-3 rounded-full border border-[#D7B154] bg-[#FFF2BF] px-4 py-2 font-poppins text-sm font-semibold text-[#A06C00]">
                <LottieSpinner className="!py-0" size={24} />
                Güncelleniyor
              </div>
            ) : null}
            <IsYatirimDateFilterPicker
              dateFilter={dateFilter}
              isUpdating={isUpdating}
              onApply={onDateFilterChange}
              onOpenChange={setIsDatePickerOpen}
            />
            {generatedAt ? (
              <div className="rounded-full bg-[#EFE7D8] px-4 py-2 font-poppins text-sm font-semibold text-[#171717]/60">
                {generatedAt}
              </div>
            ) : null}
          </div>
        </div>
        <div
          className={`px-5 py-8 text-left sm:px-7 sm:py-10 lg:py-11 ${
            isDatePickerOpen ? "lg:pr-[29rem]" : ""
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0057FF]/20 bg-[#0057FF]/8 px-3 py-1 font-poppins text-xs font-semibold tracking-[0.24em] text-[#0057FF]">
            <Sparkles className="h-3.5 w-3.5" />
            {toTurkishUpperCase(
              response?.meta.surveyName || "Günlük Duygu Durumu Anketi",
            )}
          </div>
          <h1 className="mt-5 max-w-5xl font-righteous text-[2.15rem] leading-none text-[#171717] sm:text-[2.65rem] lg:text-[3.1rem]">
            {displayTurkishText(title)}
          </h1>
          <p className="mt-3 font-poppins text-base font-medium text-[#171717]/52 sm:text-lg">
            {displayTurkishText(latestLabel)} · {filterContextLabel}
          </p>
        </div>
      </div>
    </header>
  );
}

export function SegmentTabs({
  segments,
  selectedSegment,
  onSegmentSelect,
}: {
  segments: SegmentOption[];
  selectedSegment: string;
  onSegmentSelect: (segment: string) => void;
}) {
  if (segments.length <= 1) {
    return null;
  }

  return (
    <div className="relative z-0 border-y border-[#171717]/10 bg-[#FFFFFF]/82 shadow-[0_10px_26px_rgba(23,23,23,0.05)] backdrop-blur-sm">
      <div className="flex w-full flex-wrap items-center gap-2 px-4 py-4 sm:gap-3 sm:px-5 lg:px-6 xl:flex-nowrap xl:justify-between">
        {segments.map((segment) => {
          const isActive = selectedSegment === segment.id;

          return (
            <button
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 font-poppins text-sm font-semibold tracking-[0.01em] transition-colors sm:text-base lg:px-4 ${
                isActive
                  ? "bg-[#0057FF] text-white shadow-[0_8px_18px_rgba(0,87,255,0.24)]"
                  : "text-[#171717]/62 hover:text-[#171717]"
              }`}
              key={segment.id}
              onClick={() => onSegmentSelect(segment.id)}
              type="button"
            >
              {formatSegmentTabLabel(segment)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function KpiGrid({ response }: { response: LeadershipDashboardResponse }) {
  const latest = response.selectedSegment.latest;
  const topWord = latest.mostFrequentWord;
  const participationDetail =
    latest.dateMode === "range"
      ? `Toplam ${formatCount(latest.respondentCount)} yanıt`
      : `${formatCount(latest.respondentCount)} / ${formatCount(
          latest.targetEmployeeCount,
        )} kişi`;
  const kpis = [
    {
      id: "participation",
      label: "Katılım",
      value: formatPercent(latest.participationRate),
      detail: participationDetail,
      color: "#FC7700",
      icon: <Users className="h-6 w-6" />,
    },
    {
      id: "averageMood",
      label: "Ortalama duygu",
      value: formatScore(latest.averageMoodScore),
      detail: `${formatScore(response.meta.maxMoodScore)} üzerinden`,
      color: "#0057FF",
      icon: <Gauge className="h-6 w-6" />,
    },
    {
      id: "workLinkedLowMood",
      label: "İşe bağlı düşük duygu",
      value: formatPercent(latest.workLinkedLowMoodRate),
      detail: "Kötü + Eh İşte yanıtları",
      color: "#E03030",
      icon: <AlertTriangle className="h-6 w-6" />,
    },
    {
      id: "topWord",
      label: "En sık kelime",
      value: topWord?.text || "-",
      detail: topWord
        ? `${formatCount(topWord.count)} kez${
            topWord.category ? ` · ${MOOD_TOKENS[topWord.category].label}` : ""
          }`
        : "Kelime verisi yok",
      color: "#00A878",
      icon: <MessageCircle className="h-6 w-6" />,
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((item) => (
        <AnalyticsCard key={item.id}>
          <div
            className="mb-4 h-1 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-poppins text-xs font-semibold tracking-[0.24em] text-[#171717]/55">
                {toTurkishUpperCase(item.label)}
              </p>
              <p className="mt-3 break-words font-righteous text-4xl leading-none text-[#171717] sm:text-5xl">
                {item.value}
              </p>
            </div>
            <div
              className="shrink-0 rounded-2xl p-3"
              style={{
                backgroundColor: `${item.color}1F`,
                color: item.color,
              }}
            >
              {item.icon}
            </div>
          </div>
          <p className="mt-4 font-poppins text-sm text-[#171717]/62">
            {item.detail}
          </p>
        </AnalyticsCard>
      ))}
    </section>
  );
}

export function MoodDistributionCard({
  response,
}: {
  response: LeadershipDashboardResponse;
}) {
  const latest = response.selectedSegment.latest;
  const snapshotDateLabel = formatDashboardDateLabel(
    {
      mode: latest.dateMode,
      startDate: latest.startDate,
      endDate: latest.endDate,
      dayCount: latest.dayCount,
    },
    {
      includeDayCount: latest.dateMode === "range",
    },
  );

  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor="#FC7700">DUYGU DAĞILIMI</AnalyticsSubheading>
      <div className="mb-6 flex flex-col gap-4 rounded-[26px] border border-[#171717]/8 bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F2E7_100%)] p-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-poppins text-xs font-semibold tracking-[0.2em] text-[#171717]/45">
            {toTurkishUpperCase(snapshotDateLabel)}
          </p>
          <p className="mt-2 font-righteous text-5xl leading-none text-[#171717]">
            {formatScore(latest.averageMoodScore)}
          </p>
        </div>
        <div className="sm:text-right">
          <p className="font-poppins text-xs font-semibold tracking-[0.2em] text-[#171717]/45">
            İYİ + HARİKA
          </p>
          <p className="mt-2 font-righteous text-4xl leading-none text-[#00A878]">
            {formatPercent(latest.derived.goodGreatRate)}
          </p>
        </div>
      </div>
      <div className="space-y-5">
        {MOOD_ORDER.map((mood) => {
          const item = latest.moodDistribution[mood];
          const token = MOOD_TOKENS[mood];

          return (
            <div key={mood}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-2xl">{item.emoji || token.emoji}</span>
                  <p className="font-poppins text-sm font-semibold text-[#171717]/84">
                    {displayTurkishText(item.label || token.label)}
                  </p>
                </div>
                <p className="shrink-0 font-righteous text-3xl leading-none">
                  {formatPercent(item.percentage)}
                </p>
              </div>
              <MiniProgressBar color={token.color} minVisible={6} value={item.percentage} />
              <p className="mt-1 font-poppins text-xs font-semibold tracking-[0.16em] text-[#171717]/42">
                {toTurkishUpperCase(`${formatCount(item.respondentCount)} yanıt`)}
              </p>
            </div>
          );
        })}
      </div>
    </AnalyticsCard>
  );
}

function formatTrendMetricValue(value: number, metric: TrendMetric) {
  if (metric === "averageMoodScore") {
    return `${formatScore(value)} / 4`;
  }

  return formatPercent(value);
}

function getTrendMetricValue(point: SurveyTrendPoint, metric: TrendMetric) {
  return point[metric];
}

function getTrendDisplayValue(point: SurveyTrendPoint, metric: TrendMetric) {
  const value = getTrendMetricValue(point, metric);

  if (metric === "averageMoodScore") {
    return value;
  }

  return value;
}

function getAverageMoodPercent(point: SurveyTrendPoint, maxMoodScore: number) {
  if (maxMoodScore <= 0) {
    return 0;
  }

  return clampPercent((point.averageMoodScore / maxMoodScore) * 100);
}

function getTrendDateRange(trend: SurveyTrendPoint[]) {
  const first = trend[0]?.surveyDateLabel || trend[0]?.surveyDate || "";
  const last =
    trend.at(-1)?.surveyDateLabel || trend.at(-1)?.surveyDate || "";

  if (!first && !last) {
    return "Trend";
  }

  return `${first} – ${last}`;
}

function TrendTooltip({
  active,
  payload,
  selection,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string;
    payload: SurveyTrendPoint & { averageMoodPercent: number };
    value?: number;
  }>;
  selection: TrendSelection;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0].payload;
  const visiblePayload =
    selection === "all"
      ? payload
      : payload.filter((entry) => {
          const config = getTrendMetricConfig(selection);
          return entry.dataKey === config.chartKey;
        });

  return (
    <div className="rounded-2xl border border-[#171717]/10 bg-[#171717] px-4 py-3 text-white shadow-2xl">
      <p className="font-poppins text-xs tracking-[0.2em] text-white/55">
        {toTurkishUpperCase(point.surveyDateLabel || point.surveyDate)}
      </p>
      <div className="mt-3 space-y-2">
        {visiblePayload.map((entry) => {
          const config = TREND_METRICS.find(
            (item) => item.chartKey === entry.dataKey,
          );

          if (!config) {
            return null;
          }

          return (
            <div
              className="flex items-center justify-between gap-8 font-poppins text-sm"
              key={config.value}
            >
              <span className="text-white/70">{config.legendLabel}</span>
              <span
                className="font-righteous text-2xl leading-none"
                style={{ color: config.color }}
              >
                {formatTrendMetricValue(point[config.value], config.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MoodTrendCard({
  response,
}: {
  response: LeadershipDashboardResponse;
}) {
  const [selection, setSelection] = useState<TrendSelection>("all");
  const trend = response.selectedSegment.trend;
  const activeMetric =
    selection === "all" ? null : getTrendMetricConfig(selection);
  const chartData = useMemo(
    () =>
      trend.map((point) => ({
        ...point,
        averageMoodPercent: getAverageMoodPercent(
          point,
          response.meta.maxMoodScore,
        ),
      })),
    [response.meta.maxMoodScore, trend],
  );
  const metricStats = useMemo(() => {
    if (selection === "all" || !trend.length) {
      return null;
    }

    const values = trend.map((point) => ({
      point,
      value: getTrendDisplayValue(point, selection),
    }));
    const total = values.reduce((sum, item) => sum + item.value, 0);
    const average = values.length ? total / values.length : 0;
    const highest = values.reduce((best, item) =>
      item.value > best.value ? item : best,
    );
    const lowest = values.reduce((best, item) =>
      item.value < best.value ? item : best,
    );
    const last = values.at(-1) || values[0];

    return {
      average,
      highest,
      lowest,
      last,
    };
  }, [selection, trend]);
  const dateRange = getTrendDateRange(trend);

  return (
    <AnalyticsCard className="rounded-[34px] p-6 sm:p-8">
      <div className="mb-6">
        <h2 className="font-poppins text-2xl font-bold text-[#171717]">
          Duygu Durumu Trendi
        </h2>
        <p className="mt-2 font-poppins text-base text-[#171717]/48 sm:text-lg">
          {dateRange} · {formatCount(trend.length)} ölçüm günü · Metrik seçin veya legend&apos;a tıklayın
        </p>
      </div>
      <div className="mb-7 flex flex-wrap gap-3">
        <TrendPill
          color="#8B8A83"
          isActive={selection === "all"}
          label="Tümü"
          onClick={() => setSelection("all")}
        />
        {TREND_METRICS.map((metric) => (
          <TrendPill
            color={metric.color}
            isActive={selection === metric.value}
            key={metric.value}
            label={metric.pillLabel}
            onClick={() => setSelection(metric.value)}
          />
        ))}
      </div>
      {metricStats && activeMetric ? (
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <TrendStatCard
            label="Ortalama"
            metric={activeMetric.value}
            value={metricStats.average}
          />
          <TrendStatCard
            label="En yüksek"
            metric={activeMetric.value}
            sublabel={
              metricStats.highest.point.surveyDateLabel ||
              metricStats.highest.point.surveyDate
            }
            value={metricStats.highest.value}
          />
          <TrendStatCard
            label="En düşük"
            metric={activeMetric.value}
            sublabel={
              metricStats.lowest.point.surveyDateLabel ||
              metricStats.lowest.point.surveyDate
            }
            value={metricStats.lowest.value}
          />
          <TrendStatCard
            label="Son değer"
            metric={activeMetric.value}
            sublabel={
              metricStats.last.point.surveyDateLabel ||
              metricStats.last.point.surveyDate
            }
            value={metricStats.last.value}
          />
        </div>
      ) : null}
      {trend.length ? (
        <div className="h-[420px]">
          <ResponsiveContainer height="100%" width="100%">
            <ComposedChart
              data={chartData}
              margin={{ bottom: 8, left: 4, right: 40, top: 16 }}
            >
              <defs>
                {TREND_METRICS.map((metric) => (
                  <linearGradient
                    id={`isYatirimTrendFill-${metric.value}`}
                    key={metric.value}
                    x1="0"
                    x2="0"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={metric.color} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={metric.color} stopOpacity={0.03} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid
                stroke="#171717"
                strokeOpacity={0.08}
              />
              <XAxis
                axisLine={{ stroke: "#171717", strokeOpacity: 0.14 }}
                dataKey="surveyDateLabel"
                minTickGap={18}
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.48,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 14,
                }}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={{ stroke: "#171717", strokeOpacity: 0.14 }}
                domain={
                  selection === "averageMoodScore"
                    ? [1, response.meta.maxMoodScore]
                    : [0, 100]
                }
                label={
                  selection === "averageMoodScore"
                    ? undefined
                    : {
                        angle: -90,
                        fill: "#171717",
                        fillOpacity: 0.48,
                        fontFamily: "var(--font-poppins)",
                        fontSize: 13,
                        position: "insideLeft",
                        value: "%",
                      }
                }
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.46,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 14,
                }}
                tickFormatter={(value: number) =>
                  selection === "averageMoodScore" ? "" : `${value}%`
                }
                tickLine={false}
                ticks={
                  selection === "averageMoodScore"
                    ? [1, 2, 3, 4]
                    : [0, 20, 40, 60, 80, 100]
                }
                width={56}
                yAxisId="left"
              />
              <YAxis
                axisLine={{ stroke: "#171717", strokeOpacity: 0.14 }}
                domain={[1, response.meta.maxMoodScore]}
                orientation="right"
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.46,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 14,
                }}
                tickFormatter={(value: number) =>
                  value === 4
                    ? "Harika"
                    : value === 3
                      ? "İyi"
                      : value === 2
                        ? "Eh İşte"
                        : value === 1
                          ? "Kötü"
                          : ""
                }
                tickLine={false}
                ticks={[1, 2, 3, 4]}
                width={78}
                yAxisId="mood"
              />
              <Tooltip
                content={<TrendTooltip selection={selection} />}
                cursor={{ stroke: "#171717", strokeOpacity: 0.12 }}
              />
              {TREND_METRICS.map((metric) => {
                const isVisible =
                  selection === "all" || selection === metric.value;
                const dataKey =
                  selection === metric.value &&
                  metric.value === "averageMoodScore"
                    ? "averageMoodScore"
                    : metric.chartKey;
                const yAxisId =
                  selection === metric.value &&
                  metric.value === "averageMoodScore"
                    ? "mood"
                    : "left";

                if (!isVisible) {
                  return null;
                }

                return (
                  <Fragment key={metric.value}>
                    {selection !== "all" ? (
                      <Area
                        dataKey={dataKey}
                        fill={`url(#isYatirimTrendFill-${metric.value})`}
                        stroke="none"
                        type="monotone"
                        yAxisId={yAxisId}
                      />
                    ) : null}
                    <Line
                      activeDot={{
                        fill: metric.color,
                        r: 7,
                        stroke: "#FFFFFF",
                        strokeWidth: 3,
                      }}
                      dataKey={dataKey}
                      dot={{
                        fill: metric.color,
                        r: 6,
                        stroke: "#FFFFFF",
                        strokeWidth: 3,
                      }}
                      stroke={metric.color}
                      strokeDasharray={metric.dashed ? "6 5" : undefined}
                      strokeWidth={3}
                      type="monotone"
                      yAxisId={yAxisId}
                    />
                  </Fragment>
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyInlineState>Trend verisi bulunamadı</EmptyInlineState>
      )}
      {trend.length ? (
        <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3">
          {TREND_METRICS.map((metric) => {
            const isActive = selection === "all" || selection === metric.value;

            return (
              <button
                className={`inline-flex items-center gap-2 font-poppins text-sm font-semibold transition-colors sm:text-base ${
                  isActive ? "text-[#171717]/68" : "text-[#171717]/20"
                }`}
                key={metric.value}
                onClick={() => setSelection(metric.value)}
                type="button"
              >
                <span
                  className="h-1 w-9 rounded-full"
                  style={{
                    backgroundColor: metric.color,
                    opacity: isActive ? 1 : 0.28,
                  }}
                />
                {metric.legendLabel}
              </button>
            );
          })}
        </div>
      ) : null}
    </AnalyticsCard>
  );
}

function TrendPill({
  label,
  color,
  isActive,
  onClick,
}: {
  label: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-full border px-5 py-2.5 font-poppins text-base font-semibold transition-all sm:px-6 sm:text-lg"
      onClick={onClick}
      style={{
        backgroundColor: isActive ? color : "#FCF8F0",
        borderColor: isActive ? color : "#E8E0D4",
        color: isActive ? "#FFFFFF" : "#6E6B66",
        boxShadow: isActive ? "0 8px 18px rgba(23,23,23,0.1)" : "none",
      }}
      type="button"
    >
      {label}
    </button>
  );
}

function TrendStatCard({
  label,
  value,
  metric,
  sublabel,
}: {
  label: string;
  value: number;
  metric: TrendMetric;
  sublabel?: string;
}) {
  return (
    <div className="rounded-[22px] bg-[#F8F2E7] px-6 py-5">
      <p className="font-poppins text-sm text-[#171717]/45 sm:text-base">
        {label}
      </p>
      <p className="mt-2 font-righteous text-4xl leading-none text-[#171717]">
        {formatTrendMetricValue(value, metric)}
      </p>
      {sublabel ? (
        <p className="mt-2 font-poppins text-sm font-medium text-[#171717]/58 sm:text-base">
          {sublabel}
        </p>
      ) : null}
    </div>
  );
}

export function GmyRankingSection({
  items,
  dateFilter,
}: {
  items: GmyRankingItem[];
  dateFilter: IsYatirimDateFilter;
}) {
  const maxScore = Math.max(4, ...items.map((item) => item.averageMoodScore));
  const comparisonDateLabel = formatDashboardDateLabel(dateFilter);

  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor="#AD7A00">
        GMY Gruplarına Göre Ortalama Duygu Durumu
      </AnalyticsSubheading>
      <p className="-mt-3 mb-6 font-poppins text-sm font-medium text-[#171717]/45">
        {comparisonDateLabel} · Yüksekten düşüğe · 4 üzerinden
      </p>
      {items.length ? (
        <div className="space-y-4">
          {items.map((item, index) => {
            const rank = item.rank || index + 1;
            const progress = maxScore > 0 ? (item.averageMoodScore / maxScore) * 100 : 0;

            return (
              <div
                className="rounded-2xl border border-[#171717]/8 bg-[#FFFFFF]/70 px-4 py-4"
                key={item.segmentId}
              >
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <p className="font-righteous text-3xl text-[#FC7700]">
                      {rank}
                    </p>
                    <div className="min-w-0">
                      <p className="truncate font-poppins text-sm font-semibold text-[#171717]/86">
                        {displayTurkishText(item.label)}
                      </p>
                      <p className="font-poppins text-xs tracking-[0.16em] text-[#171717]/42">
                        {toTurkishUpperCase(
                          `${formatCount(item.respondentCount)} yanıt`,
                        )}{" "}
                        · {formatPercent(item.participationRate)}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 font-righteous text-3xl leading-none text-[#0057FF]">
                    {formatScore(item.averageMoodScore)}
                  </p>
                </div>
                <MiniProgressBar color="#0057FF" minVisible={6} value={progress} />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyInlineState>GMY sıralama verisi bulunamadı</EmptyInlineState>
      )}
    </AnalyticsCard>
  );
}

export function GmyScoreChangeSection({
  items,
}: {
  items: GmyScoreChangeItem[];
}) {
  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor="#00A878">ÖNCEKİ - GÜNCEL PUAN</AnalyticsSubheading>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => {
            const deltaColor =
              item.delta > 0 ? "#00A878" : item.delta < 0 ? "#E03030" : "#171717";
            const DeltaIcon = item.delta > 0 ? ArrowUp : item.delta < 0 ? ArrowDown : BarChart3;

            return (
              <div
                className="grid gap-3 rounded-2xl border border-[#171717]/8 bg-[#FFFFFF]/70 px-4 py-4 md:grid-cols-[minmax(0,1fr)_110px_110px_96px]"
                key={item.segmentId}
              >
                <div className="min-w-0">
                  <p className="truncate font-poppins text-sm font-semibold text-[#171717]/86">
                    {displayTurkishText(item.label)}
                  </p>
                  <p className="font-poppins text-xs tracking-[0.16em] text-[#171717]/42">
                    {toTurkishUpperCase(`${formatCount(item.respondentCount)} yanıt`)}
                  </p>
                </div>
                <ScoreCell
                  label={formatScoreCellLabel(
                    item.mode,
                    item.previousStartDate || item.previousSurveyDate,
                    item.previousEndDate || item.previousSurveyDate,
                  )}
                  value={item.previousAverageMoodScore}
                />
                <ScoreCell
                  label={formatScoreCellLabel(
                    item.mode,
                    item.currentStartDate || item.currentSurveyDate,
                    item.currentEndDate || item.currentSurveyDate,
                  )}
                  value={item.currentAverageMoodScore}
                />
                <div className="flex items-center justify-start gap-2 md:justify-end">
                  <DeltaIcon className="h-4 w-4" style={{ color: deltaColor }} />
                  <p
                    className="font-righteous text-2xl leading-none"
                    style={{ color: deltaColor }}
                  >
                    {item.delta > 0 ? "+" : ""}
                    {formatScore(item.delta)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyInlineState>GMY değişim verisi bulunamadı</EmptyInlineState>
      )}
    </AnalyticsCard>
  );
}

function formatScoreCellLabel(
  mode: IsYatirimDateFilterMode,
  startDate: string,
  endDate: string,
) {
  if (mode === "range" && startDate && endDate) {
    return formatDashboardDateLabel(
      {
        mode,
        startDate,
        endDate,
        dayCount: 1,
      },
      {
        includeDayCount: false,
      },
    );
  }

  return formatTurkishDate(startDate || endDate);
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-poppins text-[10px] font-semibold tracking-[0.16em] text-[#171717]/38">
        {toTurkishUpperCase(label || "Tarih yok")}
      </p>
      <p className="mt-1 font-righteous text-2xl leading-none text-[#171717]">
        {formatScore(value)}
      </p>
    </div>
  );
}

export function GmyExtremeSection({
  items,
  dateFilter,
}: {
  items: GmyExtremeItem[];
  dateFilter: IsYatirimDateFilter;
}) {
  const maxRate = Math.max(
    1,
    ...items.flatMap((item) => [item.badRate, item.greatRate]),
  );
  const comparisonDateLabel = formatDashboardDateLabel(dateFilter);

  return (
    <AnalyticsCard>
      <div className="mb-7">
        <h3 className="font-poppins text-xl font-bold text-[#171717] sm:text-2xl">
          GMY Gruplarına Göre 😞 Kötü ve 🤩 Harika Oranı
        </h3>
        <p className="mt-2 font-poppins text-sm text-[#171717]/45 sm:text-base">
          ← Kötü (%) &nbsp;&nbsp; Harika (%) → ·{" "}
          {comparisonDateLabel}
        </p>
      </div>
      {items.length ? (
        <div>
          <div className="mb-4 hidden grid-cols-[minmax(150px,0.8fr)_minmax(320px,2.4fr)_130px] items-center gap-5 md:grid">
            <div />
            <div className="grid grid-cols-2 font-poppins text-sm font-bold">
              <p className="text-left text-[#E03030]">← 😞 Kötü %</p>
              <p className="text-right text-[#00A878]">🤩 Harika % →</p>
            </div>
            <div />
          </div>
          <div className="space-y-4">
            {items.map((item) => (
              <div
                className="grid gap-3 md:grid-cols-[minmax(150px,0.8fr)_minmax(320px,2.4fr)_130px] md:items-center md:gap-5"
                key={item.segmentId}
              >
                <p className="min-w-0 font-poppins text-sm font-semibold text-[#171717]/86 sm:text-base">
                  {displayTurkishText(item.label)}
                </p>
                <div className="relative grid h-8 grid-cols-2">
                  <div className="flex items-center justify-end border-r border-[#171717]/12">
                    <div
                      className="h-5 rounded-l-lg bg-[#E03030] transition-[width] duration-700"
                      style={{ width: `${(item.badRate / maxRate) * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-start">
                    <div
                      className="h-5 rounded-r-lg bg-[#00D9C0] transition-[width] duration-700"
                      style={{ width: `${(item.greatRate / maxRate) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 font-poppins text-sm font-bold md:justify-end">
                  <span className="text-[#E03030]">
                    {formatPercent(item.badRate)}
                  </span>
                  <span className="text-[#00A878]">
                    {formatPercent(item.greatRate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyInlineState>GMY uç değer verisi bulunamadı</EmptyInlineState>
      )}
    </AnalyticsCard>
  );
}

export function EngagementByMoodGrid({
  response,
}: {
  response: LeadershipDashboardResponse;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {MOOD_ORDER.map((mood) => {
        const item = response.selectedSegment.engagementByMood[mood];
        const token = MOOD_TOKENS[mood];

        return (
          <AnalyticsCard key={mood}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="font-poppins text-xs font-semibold tracking-[0.22em] text-[#171717]/45">
                  {toTurkishUpperCase(token.label)}
                </p>
                <p className="mt-2 font-righteous text-4xl leading-none text-[#171717]">
                  {formatPercent(item.workLinkedRate)}
                </p>
              </div>
              <span className="text-4xl">{token.emoji}</span>
            </div>
            <p className="mb-5 font-poppins text-xs font-semibold tracking-[0.16em] text-[#171717]/42">
              {toTurkishUpperCase(
                `İşe bağlı · ${formatCount(item.respondentCount)} yanıt`,
              )}
            </p>
            <div className="space-y-4">
              {(Object.keys(ENGAGEMENT_ANSWER_LABELS) as EngagementAnswer[]).map(
                (answer) => {
                  const answerMetric = item.answers[answer];

                  return (
                    <div key={answer}>
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="font-poppins text-sm font-semibold text-[#171717]/72">
                          {answerMetric.label}
                        </p>
                        <p className="font-righteous text-2xl leading-none">
                          {formatPercent(answerMetric.percentage)}
                        </p>
                      </div>
                      <MiniProgressBar
                        color={answer === "no" ? "#AD7A00" : token.color}
                        minVisible={5}
                        value={answerMetric.percentage}
                      />
                    </div>
                  );
                },
              )}
            </div>
          </AnalyticsCard>
        );
      })}
    </section>
  );
}

export function WordCloudSections({
  response,
}: {
  response: LeadershipDashboardResponse;
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {MOOD_ORDER.map((mood) => (
          <WordCloudCard
            color={MOOD_TOKENS[mood].color}
            key={mood}
            title={`${MOOD_TOKENS[mood].emoji} ${toTurkishUpperCase(
              MOOD_TOKENS[mood].label,
            )}`}
            words={response.selectedSegment.wordClouds[mood]}
          />
        ))}
      </section>
      <WordCloudCard
        color="#0057FF"
        title="TÜM KELİMELER"
        words={response.selectedSegment.allWords}
      />
    </>
  );
}

function WordCloudCard({
  title,
  words,
  color,
}: {
  title: string;
  words: WordItem[];
  color: string;
}) {
  const sortedWords = [...words].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.text.localeCompare(right.text, "tr");
  });
  const maxCount = Math.max(1, ...sortedWords.map((word) => word.count));

  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor={color}>{title}</AnalyticsSubheading>
      {sortedWords.length ? (
        <div className="flex flex-wrap gap-2">
          {sortedWords.map((word, index) => {
            const ratio = word.count / maxCount;
            const fontSize = 12 + Math.round(ratio * 10);
            const pillTone = WORD_PILL_PALETTE[index % WORD_PILL_PALETTE.length];

            return (
              <span
                className="inline-flex max-w-full items-baseline gap-1.5 rounded-full border px-3 py-1.5 font-poppins font-medium leading-snug"
                key={`${word.text}-${word.count}`}
                style={{
                  backgroundColor: pillTone.background,
                  borderColor: pillTone.border,
                  color: pillTone.text,
                  fontSize,
                }}
              >
                <span className="min-w-0 whitespace-normal break-words">
                  {word.text}
                </span>
                <span className="shrink-0 text-[0.62em] font-medium leading-none opacity-75">
                  {formatCount(word.count)}
                </span>
              </span>
            );
          })}
        </div>
      ) : (
        <EmptyInlineState>Kelime verisi bulunamadı</EmptyInlineState>
      )}
    </AnalyticsCard>
  );
}

export function DashboardEmptyContent() {
  return (
    <AnalyticsCard className="py-16">
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <p className="font-righteous text-3xl text-[#171717]">
          Dashboard verisi bulunamadı
        </p>
        <p className="font-poppins text-base text-[#171717]/62">
          Backend geçerli yanıt döndürdü ancak İş Yatırım dashboard contract&apos;ı boş geldi.
        </p>
      </div>
    </AnalyticsCard>
  );
}
