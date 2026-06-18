"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LottieSpinner from "@/components/global/loader/lottie-spinner";
import IsYatirimDashboardViewToggle from "@/components/is-yatirim-dashboard-view-toggle";
import {
  AnalyticsCard,
  AnalyticsDashboardBody,
  AnalyticsDashboardPageShell,
  AnalyticsEmptyState,
  AnalyticsErrorState,
  AnalyticsLoadingState,
  AnalyticsSectionHeading,
  AnalyticsSubheading,
} from "@/components/analytics-dashboard/dashboard-shell";
import {
  IS_YATIRIM_WEEKLY_PICKER_MIN_DATE,
  WEEKLY_PARTICIPATION_DAYS,
  formatWeeklyCount,
  formatWeeklyPercent,
  formatWeeklyPp,
  getMondayForIsoDate,
  normalizeIsYatirimWeekFilter,
  type IsYatirimWeekFilter,
  type IsYatirimWeekMode,
  type WeeklyDashboardResponse,
  type WeeklyExpectationBalanceItem,
  type WeeklyFeelingBarItem,
  type WeeklyKpiMetric,
  type WeeklyParticipationSeries,
  type WeeklySegmentOption,
  type WeeklyTableRow,
} from "@/lib/isYatirimWeeklyDashboard";

type WeeklyDashboardProps = {
  response?: WeeklyDashboardResponse;
  previousParticipationResponse?: WeeklyDashboardResponse;
  selectedSegment: string;
  weekFilter: IsYatirimWeekFilter;
  dailyToken: string;
  weeklyToken: string;
  isLoading: boolean;
  isUpdating: boolean;
  errorMessage?: string | null;
  onSegmentSelect: (segment: string) => void;
  onWeekFilterChange: (weekFilter: IsYatirimWeekFilter) => void;
};

const WEEK_OPTIONS: Array<{ mode: IsYatirimWeekMode; label: string }> = [
  { mode: "this_week", label: "Bu Hafta" },
  { mode: "last_week", label: "Geçen Hafta" },
  { mode: "last_4_weeks", label: "Son 4 Hafta" },
  { mode: "last_8_weeks", label: "Son 8 Hafta" },
  { mode: "week", label: "Hafta Seç" },
];

const PARTICIPATION_COLORS = ["#0057FF", "#985DF8", "#00A878", "#FC7700"];
const CURRENT_BAR_COLOR = "#0057FF";
const PREVIOUS_BAR_COLOR = "#A9C2FF";
const GAP_COLOR = "#B03A3A";
const SURPLUS_COLOR = "#145AF2";

const SHORT_TURKISH_MONTHS = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

const LONG_TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

const DAY_MS = 24 * 60 * 60 * 1000;
const SURVEY_WEEK_ONE_START = createUtcDate(2026, 4, 25);

type WeekDisplay = {
  isoStart: string;
  weekCode: string;
  rangeLabel: string;
  rangeLabelWithYear: string;
  monthTitle: string;
  isCurrentWeek: boolean;
  isLastWeek: boolean;
  isFuture: boolean;
  isBeforeMinimum: boolean;
};

function formatDisplayValue(value: number | string, kind: "count" | "percent" | "pp" | "text") {
  if (typeof value === "string") {
    return value || "-";
  }

  if (kind === "count") {
    return formatWeeklyCount(value);
  }

  if (kind === "pp") {
    return formatWeeklyPp(value);
  }

  if (kind === "percent") {
    return formatWeeklyPercent(value);
  }

  return `${value}`;
}

function formatSignedWeeklyPercent(value: number) {
  const formatted = formatWeeklyPercent(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function createUtcDate(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function getTodayUtcDate() {
  const now = new Date();
  return createUtcDate(now.getFullYear(), now.getMonth(), now.getDate());
}

function addUtcDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function addUtcMonths(date: Date, months: number) {
  return createUtcDate(date.getUTCFullYear(), date.getUTCMonth() + months, 1);
}

function formatUtcDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function parseUtcIsoDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
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

function getUtcMonday(date: Date) {
  const dayOffset = (date.getUTCDay() + 6) % 7;
  return addUtcDays(date, -dayOffset);
}

function getWeekCode(date: Date) {
  return `H${Math.floor((getUtcMonday(date).getTime() - SURVEY_WEEK_ONE_START.getTime()) / (7 * DAY_MS)) + 1}`;
}

function formatWeekRange(startDate: Date, includeYear = false) {
  const endDate = addUtcDays(startDate, 6);
  const startMonth = SHORT_TURKISH_MONTHS[startDate.getUTCMonth()];
  const endMonth = SHORT_TURKISH_MONTHS[endDate.getUTCMonth()];
  const startDay = startDate.getUTCDate();
  const endDay = endDate.getUTCDate();
  const range =
    startDate.getUTCMonth() === endDate.getUTCMonth()
      ? `${startDay} ${startMonth}–${endDay} ${endMonth}`
      : `${startDay} ${startMonth}–${endDay} ${endMonth}`;

  return includeYear ? `${range} ${endDate.getUTCFullYear()}` : range;
}

function getWeekDisplay(startDate: Date, todayDate = getTodayUtcDate()): WeekDisplay {
  const currentWeekStart = getUtcMonday(todayDate);
  const lastWeekStart = addUtcDays(currentWeekStart, -7);
  const minimumDate =
    parseUtcIsoDate(IS_YATIRIM_WEEKLY_PICKER_MIN_DATE) || createUtcDate(2026, 4, 20);
  const endDate = addUtcDays(startDate, 6);

  return {
    isoStart: formatUtcDate(startDate),
    weekCode: getWeekCode(startDate),
    rangeLabel: formatWeekRange(startDate),
    rangeLabelWithYear: formatWeekRange(startDate, true),
    monthTitle: `${LONG_TURKISH_MONTHS[startDate.getUTCMonth()]} ${startDate.getUTCFullYear()}`,
    isCurrentWeek: startDate.getTime() === currentWeekStart.getTime(),
    isLastWeek: startDate.getTime() === lastWeekStart.getTime(),
    isFuture: startDate.getTime() > currentWeekStart.getTime(),
    isBeforeMinimum: endDate.getTime() < minimumDate.getTime(),
  };
}

function getWeekStartForMode(mode: IsYatirimWeekMode, weekStartDate?: string) {
  const currentWeekStart = getUtcMonday(getTodayUtcDate());

  if (mode === "last_week") {
    return addUtcDays(currentWeekStart, -7);
  }

  if (mode === "week" && weekStartDate) {
    return parseUtcIsoDate(getMondayForIsoDate(weekStartDate)) || currentWeekStart;
  }

  return currentWeekStart;
}

function getWeekOptionMeta(mode: IsYatirimWeekMode, weekStartDate?: string) {
  const currentWeekStart = getUtcMonday(getTodayUtcDate());
  const startDate = getWeekStartForMode(mode, weekStartDate);
  const display = getWeekDisplay(startDate);

  if (mode === "last_4_weeks") {
    const firstWeekStart = addUtcDays(currentWeekStart, -21);
    return {
      label: "Son 4 Hafta",
      detail: `${formatWeekRange(firstWeekStart).split("–")[0]}–${
        formatWeekRange(currentWeekStart).split("–")[1]
      }`,
      summary: `Son 4 Hafta · ${formatWeekRange(firstWeekStart).split("–")[0]}–${
        formatWeekRange(currentWeekStart).split("–")[1]
      }`,
    };
  }

  if (mode === "last_8_weeks") {
    const firstWeekStart = addUtcDays(currentWeekStart, -49);
    return {
      label: "Son 8 Hafta",
      detail: `${formatWeekRange(firstWeekStart).split("–")[0]}–${
        formatWeekRange(currentWeekStart).split("–")[1]
      }`,
      summary: `Son 8 Hafta · ${formatWeekRange(firstWeekStart).split("–")[0]}–${
        formatWeekRange(currentWeekStart).split("–")[1]
      }`,
    };
  }

  if (mode === "week") {
    return {
      label: "Hafta Seç",
      detail: `${display.weekCode} · ${display.rangeLabel}`,
      summary: `${display.weekCode} · ${display.rangeLabel}`,
    };
  }

  return {
    label: mode === "last_week" ? "Geçen Hafta" : "Bu Hafta",
    detail: `${display.weekCode} · ${display.rangeLabel}`,
    summary: `${mode === "last_week" ? "Geçen Hafta" : "Bu Hafta"} · ${
      display.weekCode
    } · ${display.rangeLabel}`,
  };
}

function getWeekOptionLabel(weekFilter: IsYatirimWeekFilter) {
  return getWeekOptionMeta(weekFilter.mode, weekFilter.weekStartDate).summary;
}

function WeeklyFilterPicker({
  weekFilter,
  isUpdating,
  onApply,
}: {
  weekFilter: IsYatirimWeekFilter;
  isUpdating: boolean;
  onApply: (weekFilter: IsYatirimWeekFilter) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draftMode, setDraftMode] = useState<IsYatirimWeekMode>(weekFilter.mode);
  const [draftWeekStartDate, setDraftWeekStartDate] = useState(
    weekFilter.weekStartDate || "",
  );
  const [isWeekListOpen, setIsWeekListOpen] = useState(weekFilter.mode === "week");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selectedWeek = getWeekStartForMode(weekFilter.mode, weekFilter.weekStartDate);
    return createUtcDate(selectedWeek.getUTCFullYear(), selectedWeek.getUTCMonth(), 1);
  });

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setDraftMode(weekFilter.mode);
    setDraftWeekStartDate(weekFilter.weekStartDate || "");
    setIsWeekListOpen(weekFilter.mode === "week");
    const selectedWeek = getWeekStartForMode(weekFilter.mode, weekFilter.weekStartDate);
    setVisibleMonth(
      createUtcDate(selectedWeek.getUTCFullYear(), selectedWeek.getUTCMonth(), 1),
    );
  }, [isOpen, weekFilter.mode, weekFilter.weekStartDate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const normalizedDraftFilter = normalizeIsYatirimWeekFilter({
    weekMode: draftMode,
    weekStartDate: draftWeekStartDate,
  });
  const selectedWeekStart = getWeekStartForMode(draftMode, draftWeekStartDate);
  const selectedWeekDisplay = getWeekDisplay(selectedWeekStart);
  const weekRows = useMemo(() => {
    const firstDayOfMonth = createUtcDate(
      visibleMonth.getUTCFullYear(),
      visibleMonth.getUTCMonth(),
      1,
    );
    const lastDayOfMonth = createUtcDate(
      visibleMonth.getUTCFullYear(),
      visibleMonth.getUTCMonth() + 1,
      0,
    );
    const firstWeekStart = getUtcMonday(firstDayOfMonth);
    const rows: WeekDisplay[] = [];

    for (let cursor = firstWeekStart; cursor <= lastDayOfMonth; cursor = addUtcDays(cursor, 7)) {
      if (cursor.getUTCMonth() === visibleMonth.getUTCMonth()) {
        rows.push(getWeekDisplay(cursor));
      }
    }

    return rows;
  }, [visibleMonth]);
  const minimumSelectableDate =
    parseUtcIsoDate(IS_YATIRIM_WEEKLY_PICKER_MIN_DATE) || createUtcDate(2026, 4, 20);
  const minimumSelectableMonth = createUtcDate(
    minimumSelectableDate.getUTCFullYear(),
    minimumSelectableDate.getUTCMonth(),
    1,
  );
  const isPreviousMonthDisabled =
    visibleMonth.getUTCFullYear() < minimumSelectableMonth.getUTCFullYear() ||
    (visibleMonth.getUTCFullYear() === minimumSelectableMonth.getUTCFullYear() &&
      visibleMonth.getUTCMonth() <= minimumSelectableMonth.getUTCMonth());
  const isApplyDisabled =
    isUpdating ||
    (normalizedDraftFilter.mode === weekFilter.mode &&
      normalizedDraftFilter.weekStartDate === weekFilter.weekStartDate) ||
    (draftMode === "week" && !normalizedDraftFilter.weekStartDate);

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-[#0057FF]/18 bg-[#EEF4FF] px-4 py-2 font-poppins text-sm font-semibold text-[#0057FF] transition-colors hover:border-[#0057FF]/35"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CalendarDays className="h-4 w-4" />
        <span>{getWeekOptionLabel(weekFilter)}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-[calc(100%+12px)] z-[60] w-[min(92vw,430px)] overflow-hidden rounded-[24px] border border-[#171717]/10 bg-[#FFFDF8] shadow-[0_24px_60px_rgba(23,23,23,0.16)] backdrop-blur-sm">
          <div className="space-y-2.5 p-4">
            {WEEK_OPTIONS.filter((option) => option.mode !== "week").map((option) => {
              const meta = getWeekOptionMeta(option.mode, draftWeekStartDate);
              const isActive = draftMode === option.mode;

              return (
                <button
                  className={`flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left font-poppins transition-colors ${
                    isActive
                      ? "border-[#0057FF] bg-[#2D58F3] text-white shadow-[0_18px_32px_rgba(0,87,255,0.24)]"
                      : "border-[#171717]/10 bg-white text-[#171717] hover:border-[#0057FF]/22"
                  }`}
                  key={option.mode}
                  onClick={() => {
                    setDraftMode(option.mode);
                    setIsWeekListOpen(false);
                  }}
                  type="button"
                >
                  <span className="text-sm font-semibold sm:text-base">{option.label}</span>
                  <span
                    className={`text-xs font-semibold sm:text-sm ${
                      isActive ? "text-white/74" : "text-[#171717]/62"
                    }`}
                  >
                    {meta.detail}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mx-4 border-t border-[#D8CDBA]" />

          <div className="p-4">
            <button
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 font-poppins text-sm font-semibold transition-colors sm:text-base ${
                draftMode === "week"
                  ? "border-[#0057FF]/18 bg-white text-[#171717]"
                  : "border-[#171717]/10 bg-white text-[#171717] hover:border-[#0057FF]/22"
              }`}
              onClick={() => {
                setDraftMode("week");
                setIsWeekListOpen((current) => !current);
              }}
              type="button"
            >
              Hafta Seç
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isWeekListOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isWeekListOpen ? (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <button
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#171717]/10 bg-[#F7F1E8] transition-colors ${
                      isPreviousMonthDisabled
                        ? "cursor-not-allowed text-[#171717]/20"
                        : "text-[#171717]/58 hover:text-[#171717]"
                    }`}
                    disabled={isPreviousMonthDisabled}
                    onClick={() => setVisibleMonth((current) => addUtcMonths(current, -1))}
                    type="button"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <p className="font-poppins text-base font-semibold text-[#171717]">
                    {LONG_TURKISH_MONTHS[visibleMonth.getUTCMonth()]}{" "}
                    {visibleMonth.getUTCFullYear()}
                  </p>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#171717]/10 bg-[#F7F1E8] text-[#171717]/58 transition-colors hover:text-[#171717]"
                    onClick={() => setVisibleMonth((current) => addUtcMonths(current, 1))}
                    type="button"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-1.5">
                  {weekRows.map((week) => {
                    const isSelected =
                      draftMode === "week" && draftWeekStartDate === week.isoStart;
                    const isDisabled = week.isFuture || week.isBeforeMinimum;

                    return (
                      <button
                        className={`grid w-full grid-cols-[44px_1fr_auto] items-center gap-3 rounded-xl px-4 py-2.5 text-left font-poppins transition-colors ${
                          isSelected
                            ? "bg-[#2D58F3] text-white shadow-[0_16px_28px_rgba(0,87,255,0.22)]"
                            : isDisabled
                              ? "cursor-not-allowed text-[#171717]/18"
                              : "text-[#171717] hover:bg-[#0057FF]/7"
                        }`}
                        disabled={isDisabled}
                        key={week.isoStart}
                        onClick={() => {
                          setDraftMode("week");
                          setDraftWeekStartDate(week.isoStart);
                        }}
                        type="button"
                      >
                        <span
                          className={`text-sm font-semibold ${
                            isSelected ? "text-white/78" : "text-[#171717]/42"
                          }`}
                        >
                          {week.weekCode}
                        </span>
                        <span className="text-sm font-semibold sm:text-base">
                          {week.rangeLabel}
                        </span>
                        {week.isCurrentWeek || week.isLastWeek ? (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isSelected
                                ? "bg-white/22 text-white"
                                : "bg-[#0057FF]/9 text-[#0057FF]"
                            }`}
                          >
                            {week.isCurrentWeek ? "Bu Hafta" : "Geçen Hafta"}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-[#171717]/10 bg-[#FFFDF8]/92 px-4 py-3">
            <p className="font-poppins text-sm font-semibold text-[#171717]">
              {draftMode === "week"
                ? `${selectedWeekDisplay.weekCode} · ${selectedWeekDisplay.rangeLabelWithYear}`
                : getWeekOptionMeta(draftMode, draftWeekStartDate).summary}
            </p>
            <button
              className={`rounded-full px-4 py-2 font-poppins text-sm font-semibold text-white shadow-[0_14px_28px_rgba(0,87,255,0.25)] transition-colors ${
                isApplyDisabled
                  ? "cursor-not-allowed bg-[#171717]/30 shadow-none"
                  : "bg-[#2D58F3] hover:bg-[#0047D2]"
              }`}
              disabled={isApplyDisabled}
              onClick={() => {
                onApply(normalizedDraftFilter);
                setIsOpen(false);
              }}
              type="button"
            >
              Uygula
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WeeklyHeader({
  response,
  weekFilter,
  selectedSegment,
  dailyToken,
  weeklyToken,
  isUpdating,
  onWeekFilterChange,
}: {
  response?: WeeklyDashboardResponse;
  weekFilter: IsYatirimWeekFilter;
  selectedSegment: string;
  dailyToken: string;
  weeklyToken: string;
  isUpdating: boolean;
  onWeekFilterChange: (weekFilter: IsYatirimWeekFilter) => void;
}) {
  const periodLabel = response?.meta.periodLabel || getWeekOptionLabel(weekFilter);

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
            <IsYatirimDashboardViewToggle
              active="weekly"
              dailyToken={dailyToken}
              segment={selectedSegment}
              weeklyToken={weeklyToken}
            />
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
            <WeeklyFilterPicker
              isUpdating={isUpdating}
              onApply={onWeekFilterChange}
              weekFilter={weekFilter}
            />
          </div>
        </div>
        <div className="px-5 py-8 text-left sm:px-7 sm:py-10 lg:py-11">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0057FF]/20 bg-[#0057FF]/8 px-3 py-1 font-poppins text-xs font-semibold tracking-[0.24em] text-[#0057FF]">
            <Sparkles className="h-3.5 w-3.5" />
            HAFTALIK NABIZ ANKETİ
          </div>
          <h1 className="mt-5 max-w-5xl font-righteous text-[2.15rem] leading-none text-[#171717] sm:text-[2.65rem] lg:text-[3.1rem]">
            İş Yatırım - Haftalık Nabız Anketi
          </h1>
          <p className="mt-3 font-poppins text-base font-medium text-[#171717]/52 sm:text-lg">
            {periodLabel}
          </p>
        </div>
      </div>
    </header>
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

function formatSegmentTabLabel(segment: WeeklySegmentOption) {
  if (segment.type !== "gmy") {
    return displayTurkishText(segment.label);
  }

  return abbreviatePersonName(segment.label);
}

function SegmentTabs({
  segments,
  selectedSegment,
  onSegmentSelect,
}: {
  segments: WeeklySegmentOption[];
  selectedSegment: string;
  onSegmentSelect: (segment: string) => void;
}) {
  if (!segments.length) {
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

function KpiCard({
  metric,
  kind,
  color,
  icon,
  positiveDeltaTone = "negative",
}: {
  metric: WeeklyKpiMetric;
  kind: "count" | "percent" | "pp" | "text";
  color: string;
  icon: React.ReactNode;
  positiveDeltaTone?: "positive" | "negative";
}) {
  const positiveDeltaClass =
    positiveDeltaTone === "positive"
      ? "font-semibold text-[#2E7D32]"
      : "font-semibold text-[#B03A3A]";
  const negativeDeltaClass =
    positiveDeltaTone === "positive"
      ? "font-semibold text-[#B03A3A]"
      : "font-semibold text-[#2E7D32]";

  return (
    <AnalyticsCard>
      <div className="mb-4 h-1 rounded-full" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/55">
            {metric.label}
          </p>
          <p
            className="mt-3 break-words font-righteous text-4xl leading-none sm:text-5xl"
            style={{ color }}
          >
            {formatDisplayValue(metric.value, kind)}
          </p>
        </div>
        <div
          className="shrink-0 rounded-2xl p-3"
          style={{ backgroundColor: `${color}1F`, color }}
        >
          {icon}
        </div>
      </div>
      {metric.subtitle || metric.delta !== undefined ? (
        <p className="mt-4 font-poppins text-sm text-[#171717]/62">
          {metric.delta !== undefined ? (
            <span
              className={
                metric.delta > 0
                  ? positiveDeltaClass
                  : metric.delta < 0
                    ? negativeDeltaClass
                    : "font-semibold text-[#171717]/48"
              }
            >
              {metric.deltaUnit === "percent"
                ? formatSignedWeeklyPercent(metric.delta)
                : formatWeeklyPp(metric.delta)}
            </span>
          ) : null}
          {metric.delta !== undefined && metric.subtitle ? " · " : null}
          {metric.subtitle || metric.deltaLabel}
        </p>
      ) : null}
    </AnalyticsCard>
  );
}

function KpiGrid({ response }: { response: WeeklyDashboardResponse }) {
  const kpis = response.selectedSegment.kpis;
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        color="#0057FF"
        icon={<Users className="h-6 w-6" />}
        kind="count"
        metric={{
          ...kpis.participant,
          label: kpis.participant.label || "Katılımcı",
        }}
        positiveDeltaTone="positive"
      />
      <KpiCard
        color="#171717"
        icon={<TrendingUp className="h-6 w-6" />}
        kind="percent"
        metric={{
          ...kpis.noneOnly,
          label: kpis.noneOnly.label || "Hiçbiri",
        }}
      />
      <KpiCard
        color="#B03A3A"
        icon={<AlertTriangle className="h-6 w-6" />}
        kind="text"
        metric={{
          ...kpis.topExpectationGap,
          value:
            typeof kpis.topExpectationGap.value === "number"
              ? kpis.topExpectationGap.label
              : kpis.topExpectationGap.value,
          label: "Tek beklenti açığı",
        }}
      />
      <KpiCard
        color="#B03A3A"
        icon={<TrendingDown className="h-6 w-6" />}
        kind="pp"
        metric={{
          label: `${kpis.topExpectationGap.label} açığı`,
          value:
            typeof kpis.topExpectationGap.value === "number"
              ? kpis.topExpectationGap.value
              : 0,
          subtitle: kpis.topExpectationGap.subtitle,
          delta: kpis.topExpectationGap.delta,
          deltaLabel: kpis.topExpectationGap.deltaLabel,
        }}
      />
    </section>
  );
}

function EmptyInlineState({ children }: { children: string }) {
  return (
    <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-[#171717]/14 bg-[#FFFFFF]/62 p-6 text-center font-poppins text-sm font-semibold uppercase tracking-[0.18em] text-[#171717]/42">
      {children}
    </div>
  );
}

function ComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#171717]/10 bg-[#171717] px-4 py-3 text-white shadow-2xl">
      <p className="font-poppins text-xs uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
      <div className="mt-3 space-y-2">
        {payload.map((entry) => (
          <div
            className="flex items-center justify-between gap-8 font-poppins text-sm"
            key={entry.name}
          >
            <span className="text-white/70">{entry.name}</span>
            <span
              className="font-righteous text-2xl leading-none"
              style={{ color: entry.color }}
            >
              {formatWeeklyPercent(entry.value || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function getCategoryTickLines(label: string) {
  if (label.toLocaleLowerCase("tr-TR").includes("birlikte değer")) {
    return ["Birlikte Değer", "Yaratmak"];
  }

  if (label.toLocaleLowerCase("tr-TR").includes("hiçbirini")) {
    return ["Hiçbirini"];
  }

  return label.length > 16 ? label.split(" ") : [label];
}

function CategoryAxisTick({
  x,
  y,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const lines = getCategoryTickLines(payload?.value || "");

  return (
    <g transform={`translate(${x || 0},${y || 0})`}>
      {lines.map((line, index) => (
        <text
          dy={index === 0 ? 16 : 31}
          fill="#171717"
          fillOpacity={0.58}
          fontFamily="var(--font-poppins)"
          fontSize={12}
          fontWeight={600}
          key={`${line}-${index}`}
          textAnchor="middle"
          x={0}
          y={0}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function extractWeekLegendLabel(value?: string) {
  const label = value?.trim();

  if (!label) {
    return "";
  }

  const weekMatch = label.match(/\bH\d+\b/i);

  if (weekMatch?.[0]) {
    return weekMatch[0].toLocaleUpperCase("tr-TR");
  }

  return label.split(/[·–-]/)[0]?.trim() || label;
}

function getPreviousWeekLegendLabel(currentLabel: string) {
  const match = currentLabel.match(/^H(\d+)$/i);

  if (!match?.[1]) {
    return "";
  }

  const previousWeekNumber = Math.max(Number(match[1]) - 1, 0);
  const paddedWeekNumber = `${previousWeekNumber}`.padStart(match[1].length, "0");

  return `H${paddedWeekNumber}`;
}

function getComparisonLegendLabels(response?: WeeklyDashboardResponse) {
  const mode = response?.meta.weekFilter.mode;

  if (mode === "last_4_weeks" || mode === "last_8_weeks") {
    const weekCount = mode === "last_4_weeks" ? 4 : 8;

    return {
      current: `${weekCount} haftalık ortalama`,
      previous: `Önceki ${weekCount} haftalık ortalama`,
    };
  }

  const currentLabel = extractWeekLegendLabel(
    response?.meta.weekFilter.periodLabel ||
      response?.meta.weekFilter.weekLabel ||
      response?.meta.weekFilter.label ||
      response?.meta.periodLabel,
  );
  const previousLabel =
    extractWeekLegendLabel(
      response?.meta.previousWeekFilter?.periodLabel ||
        response?.meta.previousWeekFilter?.weekLabel ||
        response?.meta.previousWeekFilter?.label,
    ) || getPreviousWeekLegendLabel(currentLabel);

  return {
    current: currentLabel || "Seçili dönem",
    previous: previousLabel || "Önceki dönem",
  };
}

function VerticalComparisonChart({
  title,
  items,
  dotColor,
  currentLabel,
  previousLabel,
}: {
  title: string;
  items: WeeklyFeelingBarItem[];
  dotColor: string;
  currentLabel: string;
  previousLabel: string;
}) {
  const chartData = items;
  const previousColor = dotColor === "#985DF8" ? "#D7BEFF" : PREVIOUS_BAR_COLOR;
  const currentColor = dotColor === "#985DF8" ? "#985DF8" : CURRENT_BAR_COLOR;
  const hasPreviousData = chartData.some((item) => item.previous > 0);

  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor={dotColor}>{title}</AnalyticsSubheading>
      {chartData.length ? (
        <div className="h-[360px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              data={chartData}
              margin={{ bottom: 2, left: 6, right: 24, top: 34 }}
            >
              <CartesianGrid stroke="#171717" strokeOpacity={0.08} vertical={false} />
              <XAxis
                axisLine={{ stroke: "#171717", strokeOpacity: 0.12 }}
                dataKey="label"
                height={58}
                interval={0}
                tick={<CategoryAxisTick />}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                domain={[0, 100]}
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.5,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 12,
                }}
                tickFormatter={(value: number) => `${value}%`}
                tickLine={false}
              />
              <Tooltip content={<ComparisonTooltip />} cursor={{ fill: "#171717", opacity: 0.04 }} />
              <Legend
                align="right"
                height={28}
                iconType="rect"
                verticalAlign="top"
                wrapperStyle={{
                  color: "rgba(23,23,23,0.58)",
                  fontFamily: "var(--font-poppins)",
                  fontSize: 12,
                  fontWeight: 600,
                  paddingBottom: 8,
                }}
              />
              {hasPreviousData ? (
                <Bar
                  barSize={28}
                  dataKey="previous"
                  fill={previousColor}
                  name={previousLabel}
                  radius={[8, 8, 0, 0]}
                >
                  <LabelList
                    dataKey="previous"
                    fill="#171717"
                    fillOpacity={0.42}
                    fontFamily="var(--font-poppins)"
                    fontSize={12}
                    fontWeight={700}
                    formatter={(value: unknown) => formatWeeklyPercent(Number(value) || 0)}
                    position="top"
                  />
                </Bar>
              ) : null}
              <Bar
                barSize={28}
                dataKey="current"
                fill={currentColor}
                name={currentLabel}
                radius={[8, 8, 0, 0]}
              >
                <LabelList
                  dataKey="current"
                  fill="#171717"
                  fillOpacity={0.56}
                  fontFamily="var(--font-poppins)"
                  fontSize={12}
                  fontWeight={700}
                  formatter={(value: unknown) => formatWeeklyPercent(Number(value) || 0)}
                  position="top"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyInlineState>Grafik verisi bulunamadı</EmptyInlineState>
      )}
    </AnalyticsCard>
  );
}

function BalanceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeeklyExpectationBalanceItem }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0].payload;
  const tone = item.value > 0 ? "açık" : item.value < 0 ? "deneyimlenen fazla" : "dengede";

  return (
    <div className="rounded-2xl border border-[#171717]/10 bg-[#171717] px-4 py-3 text-white shadow-2xl">
      <p className="font-poppins text-xs uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
      <p
        className="mt-2 font-righteous text-3xl leading-none"
        style={{ color: item.value > 0 ? "#FF6B6B" : "#7AA4FF" }}
      >
        {formatWeeklyPp(item.value)}
      </p>
      <p className="mt-2 font-poppins text-sm text-white/70">{tone}</p>
    </div>
  );
}

function ExpectationBalanceChart({
  items,
  periodLabel,
}: {
  items: WeeklyExpectationBalanceItem[];
  periodLabel: string;
}) {
  const renderBalanceLabel = ({
    x,
    y,
    width,
    height,
    value,
  }: {
    x?: number | string;
    y?: number | string;
    width?: number | string;
    height?: number | string;
    value?: number | string;
  }) => {
    const numericX = Number(x);
    const numericY = Number(y);
    const numericWidth = Number(width);
    const numericHeight = Number(height || 0);
    const numericValue = Number(value);

    if (
      !Number.isFinite(numericX) ||
      !Number.isFinite(numericY) ||
      !Number.isFinite(numericWidth) ||
      !Number.isFinite(numericValue)
    ) {
      return null;
    }

    const barTop = Math.min(numericY, numericY + numericHeight);
    const labelY = barTop - 8;

    return (
      <text
        fill="#171717"
        fillOpacity={0.58}
        fontFamily="var(--font-poppins)"
        fontSize={12}
        fontWeight={700}
        textAnchor="middle"
        x={numericX + numericWidth / 2}
        y={labelY}
      >
        {formatWeeklyPp(numericValue)}
      </text>
    );
  };

  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor={GAP_COLOR}>
        {`BEKLENTİ DENGESİ - ${periodLabel}`}
      </AnalyticsSubheading>
      {items.length ? (
        <div className="h-[380px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart data={items} margin={{ bottom: 8, left: 10, right: 18, top: 34 }}>
              <CartesianGrid stroke="#171717" strokeOpacity={0.08} vertical={false} />
              <XAxis
                axisLine={{ stroke: "#171717", strokeOpacity: 0.12 }}
                dataKey="label"
                interval={0}
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.58,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
                tickLine={false}
              />
              <YAxis
                axisLine={false}
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.5,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 12,
                }}
                tickFormatter={(value: number) => `${value}pp`}
                tickLine={false}
                width={52}
              />
              <ReferenceLine stroke="#171717" strokeOpacity={0.22} y={0} />
              <Tooltip content={<BalanceTooltip />} cursor={{ fill: "#171717", opacity: 0.04 }} />
              <Bar dataKey="value" name="Denge" radius={[10, 10, 10, 10]}>
                {items.map((item) => (
                  <Cell
                    fill={item.value > 0 ? GAP_COLOR : SURPLUS_COLOR}
                    key={item.id}
                  />
                ))}
                <LabelList content={renderBalanceLabel} dataKey="value" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyInlineState>Beklenti dengesi verisi bulunamadı</EmptyInlineState>
      )}
      {items.length ? (
        <div className="mt-5 flex flex-wrap gap-4 font-poppins text-sm font-semibold text-[#171717]/58">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#B03A3A]" />
            Açık: istenen &gt; deneyimlenen
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#145AF2]" />
            Deneyimlenen fazla
          </span>
        </div>
      ) : null}
    </AnalyticsCard>
  );
}

function buildParticipationChartData(series: WeeklyParticipationSeries[]) {
  return WEEKLY_PARTICIPATION_DAYS.map((day) => {
    const row: Record<string, string | number> = { day };

    series.forEach((item) => {
      row[item.id] = item.days.find((point) => point.day === day)?.value || 0;
    });

    return row;
  });
}

function ParticipationTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[#171717]/10 bg-[#171717] px-4 py-3 text-white shadow-2xl">
      <p className="font-poppins text-xs uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
      <div className="mt-3 space-y-2">
        {payload.map((entry) => (
          <div
            className="flex items-center justify-between gap-8 font-poppins text-sm"
            key={entry.name}
          >
            <span className="text-white/70">{entry.name}</span>
            <span
              className="font-righteous text-2xl leading-none"
              style={{ color: entry.color }}
            >
              {formatWeeklyCount(entry.value || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function renderParticipationValueLabel({
  x,
  y,
  width,
  value,
}: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  value?: number | string;
}) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  const numericX = Number(x || 0);
  const numericY = Number(y || 0);
  const numericWidth = Number(width || 0);

  return (
    <text
      fill="#171717"
      fillOpacity={0.5}
      fontFamily="var(--font-poppins)"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      x={numericX + numericWidth / 2}
      y={numericY - 8}
    >
      {formatWeeklyCount(numericValue)}
    </text>
  );
}

function ParticipationChart({
  series,
}: {
  series: WeeklyParticipationSeries[];
}) {
  const chartData = buildParticipationChartData(series);

  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor="#0057FF">GÜNLÜK KATILIM</AnalyticsSubheading>
      {series.length ? (
        <div className="h-[360px]">
          <ResponsiveContainer height="100%" width="100%">
            <BarChart
              barCategoryGap="28%"
              barGap={6}
              data={chartData}
              margin={{ bottom: 8, left: 8, right: 28, top: 28 }}
            >
              <CartesianGrid stroke="#171717" strokeOpacity={0.08} vertical={false} />
              <XAxis
                axisLine={{ stroke: "#171717", strokeOpacity: 0.12 }}
                dataKey="day"
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.58,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 13,
                  fontWeight: 600,
                }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tick={{
                  fill: "#171717",
                  fillOpacity: 0.5,
                  fontFamily: "var(--font-poppins)",
                  fontSize: 12,
                }}
                tickLine={false}
                width={42}
              />
              <Tooltip
                content={<ParticipationTooltip />}
                cursor={{ fill: "#171717", opacity: 0.04 }}
              />
              <Legend
                align="right"
                iconSize={12}
                iconType="square"
                verticalAlign="top"
                wrapperStyle={{
                  fontFamily: "var(--font-poppins)",
                  fontSize: 13,
                  fontWeight: 700,
                  paddingBottom: 10,
                  top: -2,
                }}
              />
              {series.map((item, index) => {
                const color = PARTICIPATION_COLORS[index % PARTICIPATION_COLORS.length];
                return (
                  <Bar
                    dataKey={item.id}
                    fill={color}
                    key={item.id}
                    maxBarSize={34}
                    name={extractWeekLegendLabel(item.label) || item.label}
                    radius={[8, 8, 0, 0]}
                  >
                    <LabelList content={renderParticipationValueLabel} dataKey={item.id} />
                  </Bar>
                );
              })}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyInlineState>Katılım verisi bulunamadı</EmptyInlineState>
      )}
    </AnalyticsCard>
  );
}

function WeeklySummaryTable({ rows }: { rows: WeeklyTableRow[] }) {
  return (
    <AnalyticsCard>
      <AnalyticsSubheading dotColor="#AD7A00">HAFTALIK DEĞİŞİM ÖZETİ</AnalyticsSubheading>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse font-poppins text-sm">
            <thead>
              <tr className="border-b border-[#171717]/10 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#171717]/48">
                <th className="pb-3 pr-4">Duygu</th>
                <th className="pb-3 pr-4">Deneyim</th>
                <th className="pb-3 pr-4">Değişim</th>
                <th className="pb-3 pr-4">İstek</th>
                <th className="pb-3 pr-4">Denge</th>
                <th className="pb-3">Trend</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isGap = (row.balance || 0) > 0;
                const isSurplus = (row.balance || 0) < 0;

                return (
                  <tr
                    className={`border-b border-[#171717]/5 last:border-0 ${
                      isGap ? "bg-[#B03A3A]/[0.035]" : ""
                    }`}
                    key={row.id}
                  >
                    <td className="py-4 pr-4 font-semibold text-[#171717]">
                      {row.feeling}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-[#171717]/78">
                      {formatWeeklyPercent(row.experienced)}
                    </td>
                    <td
                      className={`py-4 pr-4 font-semibold ${
                        (row.change || 0) > 0
                          ? "text-[#2E7D32]"
                          : (row.change || 0) < 0
                            ? "text-[#B03A3A]"
                            : "text-[#171717]/42"
                      }`}
                    >
                      {formatWeeklyPp(row.change)}
                    </td>
                    <td className="py-4 pr-4 font-semibold text-[#171717]/78">
                      {formatWeeklyPercent(row.desired)}
                    </td>
                    <td
                      className={`py-4 pr-4 font-semibold ${
                        isGap
                          ? "text-[#B03A3A]"
                          : isSurplus
                            ? "text-[#2E7D32]"
                            : "text-[#171717]/42"
                      }`}
                    >
                      {row.balance === null
                        ? "-"
                        : `${formatWeeklyPp(row.balance)} · ${
                            isGap
                              ? "açık"
                              : isSurplus
                                ? "deneyimlenen fazla"
                                : "dengede"
                          }`}
                    </td>
                    <td className="py-4 font-semibold text-[#171717]/58">
                      {row.trend || "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyInlineState>Tablo verisi bulunamadı</EmptyInlineState>
      )}
    </AnalyticsCard>
  );
}

export default function IsYatirimWeeklyDashboard({
  response,
  previousParticipationResponse,
  selectedSegment,
  weekFilter,
  dailyToken,
  weeklyToken,
  isLoading,
  isUpdating,
  errorMessage,
  onSegmentSelect,
  onWeekFilterChange,
}: WeeklyDashboardProps) {
  const activeSegment =
    response?.meta.selectedSegmentId || selectedSegment || "all";
  const periodLabel = response?.meta.periodLabel || getWeekOptionLabel(weekFilter);
  const comparisonLegendLabels = useMemo(
    () => getComparisonLegendLabels(response),
    [response],
  );
  const participationSeries = useMemo(() => {
    if (!response) {
      return [];
    }

    const mode = response.meta.weekFilter.mode;
    const isMultiWeek = mode === "last_4_weeks" || mode === "last_8_weeks";

    if (!isMultiWeek) {
      const currentSeries = {
        id: "current",
        label: response.meta.periodLabel || "Seçili dönem",
        days: response.selectedSegment.participation.days,
      };
      const previousSeries =
        previousParticipationResponse?.selectedSegment.participation.days.length
          ? [
              {
                id: "previous",
                label:
                  previousParticipationResponse.meta.periodLabel || "Önceki dönem",
                days: previousParticipationResponse.selectedSegment.participation.days,
              },
            ]
          : [];

      return [
        ...previousSeries,
        currentSeries,
      ];
    }

    return response.selectedSegment.participation.weeklySeries.length
      ? response.selectedSegment.participation.weeklySeries
      : response.selectedSegment.weeklySeries;
  }, [previousParticipationResponse, response]);

  return (
    <AnalyticsDashboardPageShell>
      <AnalyticsDashboardBody>
        <WeeklyHeader
          isUpdating={isUpdating}
          onWeekFilterChange={onWeekFilterChange}
          response={response}
          selectedSegment={activeSegment}
          dailyToken={dailyToken}
          weeklyToken={weeklyToken}
          weekFilter={weekFilter}
        />

        {response?.meta.segments.length ? (
          <SegmentTabs
            onSegmentSelect={onSegmentSelect}
            segments={response.meta.segments}
            selectedSegment={activeSegment}
          />
        ) : null}

        {isLoading || isUpdating ? (
          <AnalyticsLoadingState />
        ) : errorMessage ? (
          <AnalyticsErrorState message={errorMessage} />
        ) : response ? (
          <>
            <KpiGrid response={response} />

            <AnalyticsSectionHeading>DUYGU DAĞILIMI</AnalyticsSectionHeading>
            <section className="grid gap-4 xl:grid-cols-2">
              <VerticalComparisonChart
                currentLabel={comparisonLegendLabels.current}
                dotColor="#0057FF"
                items={response.selectedSegment.experiencedFeelings}
                previousLabel={comparisonLegendLabels.previous}
                title={`DENEYİMLENEN DUYGULAR - ${periodLabel}`}
              />
              <VerticalComparisonChart
                currentLabel={comparisonLegendLabels.current}
                dotColor="#985DF8"
                items={response.selectedSegment.desiredFeelings}
                previousLabel={comparisonLegendLabels.previous}
                title={`İSTENEN DUYGULAR - ${periodLabel}`}
              />
            </section>

            <AnalyticsSectionHeading>BEKLENTİ VE KATILIM</AnalyticsSectionHeading>
            <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
              <ExpectationBalanceChart
                items={response.selectedSegment.expectationBalance}
                periodLabel={periodLabel}
              />
              <ParticipationChart series={participationSeries} />
            </section>

            <AnalyticsSectionHeading>ÖZET</AnalyticsSectionHeading>
            <WeeklySummaryTable rows={response.selectedSegment.table.rows} />
          </>
        ) : (
          <AnalyticsEmptyState
            description="İş Yatırım haftalık dashboard'u canlı backend verisiyle çalışır."
            title="Dashboard verisi bekleniyor"
          />
        )}
      </AnalyticsDashboardBody>
    </AnalyticsDashboardPageShell>
  );
}
