"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { IsYatirimDateFilter } from "@/lib/isYatirimLeadershipDashboard";
import {
  formatIsYatirimDateFilterLabel,
  getTodayDateString,
  IS_YATIRIM_DATE_PICKER_MIN_DATE,
  normalizeIsYatirimDateFilter,
} from "@/lib/isYatirimLeadershipDashboard";

function shiftIsoDate(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function getQuickRangeDateFilter(dayCount: number, todayDate: string) {
  const startDate = shiftIsoDate(todayDate, -(dayCount - 1));

  return {
    startDate:
      startDate < IS_YATIRIM_DATE_PICKER_MIN_DATE
        ? IS_YATIRIM_DATE_PICKER_MIN_DATE
        : startDate,
    endDate: todayDate,
  };
}

const TURKISH_WEEKDAYS = ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"] as const;

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addMonths(date: Date, amount: number) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1),
  );
}

function isSameUtcDay(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth() &&
    left.getUTCDate() === right.getUTCDate()
  );
}

function isSameUtcMonth(left: Date, right: Date) {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() &&
    left.getUTCMonth() === right.getUTCMonth()
  );
}

function formatCalendarFieldValue(value: string) {
  const date = parseIsoDate(value);

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatCalendarMonthLabel(value: Date) {
  const label = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);

  return label.charAt(0).toLocaleUpperCase("tr-TR") + label.slice(1);
}

function getCalendarDays(viewedMonth: Date) {
  const monthStart = getMonthStart(viewedMonth);
  const weekdayOffset = (monthStart.getUTCDay() + 6) % 7;
  const nextMonthStart = addMonths(monthStart, 1);
  const daysInMonth = Math.round(
    (nextMonthStart.getTime() - monthStart.getTime()) / 86_400_000,
  );
  const totalCells = Math.ceil((weekdayOffset + daysInMonth) / 7) * 7;
  const gridStart = new Date(monthStart);
  gridStart.setUTCDate(monthStart.getUTCDate() - weekdayOffset);

  return Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(gridStart);
    date.setUTCDate(gridStart.getUTCDate() + index);
    return date;
  });
}

function isPresetDateSelection(
  startDate: string,
  endDate: string,
  todayDate: string,
  range7: { startDate: string; endDate: string },
  range14: { startDate: string; endDate: string },
  range30: { startDate: string; endDate: string },
) {
  const yesterday = shiftIsoDate(todayDate, -1);

  return (
    (startDate === todayDate && endDate === todayDate) ||
    (startDate === yesterday && endDate === yesterday) ||
    (startDate === range7.startDate && endDate === range7.endDate) ||
    (startDate === range14.startDate && endDate === range14.endDate) ||
    (startDate === range30.startDate && endDate === range30.endDate)
  );
}

function isSameFilter(left: IsYatirimDateFilter, right: IsYatirimDateFilter) {
  return (
    left.mode === right.mode &&
    left.startDate === right.startDate &&
    left.endDate === right.endDate
  );
}

function QuickButton({
  isActive,
  label,
  onClick,
}: {
  isActive: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-2 font-poppins text-sm font-semibold transition-colors ${
        isActive
          ? "border-[#0057FF] bg-[#0057FF] text-white"
          : "border-[#171717]/10 bg-white text-[#171717]/70 hover:border-[#0057FF]/25 hover:text-[#171717]"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function DateInput({
  label,
  minDate,
  maxDate,
  onOpenChange,
  onSelect,
  position,
  value,
  isOpen,
}: {
  label: string;
  minDate?: string;
  maxDate: string;
  onOpenChange: (isOpen: boolean) => void;
  onSelect: (value: string) => void;
  position: "left" | "right";
  value: string;
  isOpen: boolean;
}) {
  const maxDateValue = useMemo(
    () => parseIsoDate(maxDate) || new Date(),
    [maxDate],
  );
  const minDateValue = useMemo(
    () => (minDate ? parseIsoDate(minDate) : null),
    [minDate],
  );
  const [viewedMonth, setViewedMonth] = useState(
    () => parseIsoDate(value) || maxDateValue,
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const nextViewedMonth = parseIsoDate(value) || maxDateValue;

    if (
      minDateValue &&
      getMonthStart(nextViewedMonth).getTime() <
        getMonthStart(minDateValue).getTime()
    ) {
      setViewedMonth(minDateValue);
      return;
    }

    setViewedMonth(nextViewedMonth);
  }, [isOpen, maxDateValue, minDateValue, value]);

  const calendarDays = getCalendarDays(viewedMonth);
  const selectedDate = parseIsoDate(value);
  const isPreviousMonthDisabled = Boolean(
    minDateValue &&
      getMonthStart(viewedMonth).getTime() <=
        getMonthStart(minDateValue).getTime(),
  );
  const isNextMonthDisabled =
    getMonthStart(viewedMonth).getTime() >=
    getMonthStart(maxDateValue).getTime();

  return (
    <label className="relative flex flex-col gap-2">
      <span className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-[#171717]/45">
        {label}
      </span>
      <button
        className={`flex items-center justify-between rounded-2xl border border-[#171717]/10 bg-white px-4 py-3 font-poppins text-left text-sm font-medium text-[#171717] outline-none transition-colors ${
          isOpen ? "border-[#0057FF]/40" : "hover:border-[#0057FF]/25"
        }`}
        onClick={() => onOpenChange(!isOpen)}
        type="button"
      >
        <span>{formatCalendarFieldValue(value)}</span>
        <CalendarIcon className="h-4 w-4 shrink-0" />
      </button>

      {isOpen ? (
        <div
          className={`absolute left-0 right-0 top-[calc(100%+12px)] z-[80] w-auto rounded-[24px] border border-[#171717]/10 bg-[#FFFDF8] p-4 shadow-[0_24px_60px_rgba(23,23,23,0.16)] sm:w-[320px] ${
            position === "left"
              ? "sm:left-0 sm:right-auto"
              : "sm:left-auto sm:right-0"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <button
              className={`rounded-full border border-[#171717]/10 p-2 transition-colors ${
                isPreviousMonthDisabled
                  ? "cursor-not-allowed text-[#171717]/25"
                  : "text-[#171717]/62 hover:border-[#0057FF]/25 hover:text-[#0057FF]"
              }`}
              disabled={isPreviousMonthDisabled}
              onClick={() =>
                setViewedMonth((current) => addMonths(current, -1))
              }
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-poppins text-base font-semibold text-[#171717]">
              {formatCalendarMonthLabel(viewedMonth)}
            </p>
            <button
              className={`rounded-full border border-[#171717]/10 p-2 transition-colors ${
                isNextMonthDisabled
                  ? "cursor-not-allowed text-[#171717]/25"
                  : "text-[#171717]/62 hover:border-[#0057FF]/25 hover:text-[#0057FF]"
              }`}
              disabled={isNextMonthDisabled}
              onClick={() => setViewedMonth((current) => addMonths(current, 1))}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-1">
            {TURKISH_WEEKDAYS.map((weekday) => (
              <div
                className="pb-2 text-center font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-[#171717]/42"
                key={weekday}
              >
                {weekday}
              </div>
            ))}

            {calendarDays.map((date) => {
              const isoDate = date.toISOString().slice(0, 10);
              const isBeforeMinDate = Boolean(minDate && isoDate < minDate);
              const isAfterMaxDate = isoDate > maxDate;
              const isDisabled = isBeforeMinDate || isAfterMaxDate;
              const isSelected = selectedDate
                ? isSameUtcDay(date, selectedDate)
                : false;
              const isCurrentMonth = isSameUtcMonth(date, viewedMonth);

              if (!isCurrentMonth) {
                return <div className="h-10" key={isoDate} />;
              }

              return (
                <button
                  className={`h-10 rounded-xl font-poppins text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-[#0057FF] text-white"
                      : isDisabled
                        ? "cursor-not-allowed bg-[#171717]/[0.04] text-[#171717]/22 line-through"
                        : "text-[#171717] hover:bg-[#EEF4FF]"
                  }`}
                  disabled={isDisabled}
                  key={isoDate}
                  onClick={() => {
                    onSelect(isoDate);
                    onOpenChange(false);
                  }}
                  type="button"
                >
                  {date.getUTCDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-end">
            <button
              className={`rounded-full border px-3 py-2 font-poppins text-sm font-semibold transition-colors ${
                minDate && maxDate < minDate
                  ? "cursor-not-allowed border-[#171717]/10 bg-[#171717]/[0.04] text-[#171717]/28"
                  : "border-[#0057FF]/18 bg-[#EEF4FF] text-[#0057FF] hover:border-[#0057FF]/35"
              }`}
              disabled={Boolean(minDate && maxDate < minDate)}
              onClick={() => {
                onSelect(maxDate);
                onOpenChange(false);
              }}
              type="button"
            >
              Bugün
            </button>
          </div>
        </div>
      ) : null}
    </label>
  );
}

export default function IsYatirimDateFilterPicker({
  dateFilter,
  isUpdating,
  onApply,
  onOpenChange,
}: {
  dateFilter: IsYatirimDateFilter;
  isUpdating: boolean;
  onApply: (dateFilter: IsYatirimDateFilter) => void;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const todayDate = getTodayDateString();
  const minSelectableDate = IS_YATIRIM_DATE_PICKER_MIN_DATE;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [openCalendar, setOpenCalendar] = useState<"start" | "end" | null>(
    null,
  );
  const [draftStartDate, setDraftStartDate] = useState(dateFilter.startDate);
  const [draftEndDate, setDraftEndDate] = useState(dateFilter.endDate);
  const range7 = getQuickRangeDateFilter(7, todayDate);
  const range14 = getQuickRangeDateFilter(14, todayDate);
  const range30 = getQuickRangeDateFilter(30, todayDate);
  const isCurrentFilterCustom = !isPresetDateSelection(
    dateFilter.startDate,
    dateFilter.endDate,
    todayDate,
    range7,
    range14,
    range30,
  );
  const [isCustomRangePickerVisible, setIsCustomRangePickerVisible] = useState(
    () => isCurrentFilterCustom,
  );

  useEffect(() => {
    if (isOpen) {
      return;
    }

    setDraftStartDate(dateFilter.startDate);
    setDraftEndDate(dateFilter.endDate);
    setIsCustomRangePickerVisible(isCurrentFilterCustom);
    setOpenCalendar(null);
  }, [dateFilter.endDate, dateFilter.startDate, isCurrentFilterCustom, isOpen]);

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

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const appliedLabel = formatIsYatirimDateFilterLabel(dateFilter);
  const isSingleDaySelection =
    Boolean(draftStartDate) &&
    Boolean(draftEndDate) &&
    draftStartDate === draftEndDate;
  const isCustomRange = isCustomRangePickerVisible;

  const validationError =
    !draftStartDate || !draftEndDate
      ? "Tarih seçimi tamamlanmalı."
      : draftStartDate && draftStartDate < minSelectableDate
        ? "Başlangıç tarihi 20 Mayıs 2026 öncesi olamaz."
        : draftEndDate && draftEndDate < minSelectableDate
          ? "Bitiş tarihi 20 Mayıs 2026 öncesi olamaz."
          : draftStartDate > draftEndDate
            ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
            : null;

  const draftFilter = normalizeIsYatirimDateFilter(
    {
      dateMode: isSingleDaySelection ? "single" : "range",
      startDate: draftStartDate,
      endDate: draftEndDate,
    },
    {
      todayDate: dateFilter.startDate,
    },
  );
  const isApplyDisabled =
    Boolean(validationError) || isSameFilter(draftFilter, dateFilter);

  const applySingleDate = (nextDate: string) => {
    const normalizedDate =
      nextDate < minSelectableDate ? minSelectableDate : nextDate;

    setDraftStartDate(normalizedDate);
    setDraftEndDate(normalizedDate);
    setIsCustomRangePickerVisible(false);
    setOpenCalendar(null);
  };

  const applyRangeDates = (nextStartDate: string, nextEndDate: string) => {
    setDraftStartDate(
      nextStartDate < minSelectableDate ? minSelectableDate : nextStartDate,
    );
    setDraftEndDate(nextEndDate);
    setIsCustomRangePickerVisible(false);
    setOpenCalendar(null);
  };

  const closeAndReset = () => {
    setDraftStartDate(dateFilter.startDate);
    setDraftEndDate(dateFilter.endDate);
    setIsCustomRangePickerVisible(isCurrentFilterCustom);
    setOpenCalendar(null);
    setIsOpen(false);
  };

  return (
    <div className="static sm:relative" ref={containerRef}>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-[#0057FF]/18 bg-[#EEF4FF] px-4 py-2 font-poppins text-sm font-semibold text-[#0057FF] transition-colors hover:border-[#0057FF]/35"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <CalendarDays className="h-4 w-4" />
        <span className="max-w-[220px] truncate text-left sm:max-w-[280px]">
          {appliedLabel}
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+12px)] z-[60] w-auto rounded-[28px] border border-[#171717]/10 bg-[#FFFDF8] p-5 shadow-[0_28px_70px_rgba(23,23,23,0.16)] backdrop-blur-sm sm:left-auto sm:right-0 sm:w-[min(92vw,420px)]">
          <div className="space-y-5">
            <div>
              <p className="font-poppins text-sm font-semibold text-[#171717]">
                Tarih Aralığı
              </p>
              <p className="mt-1 font-poppins text-xs font-medium text-[#171717]/52">
                Aynı gün seçimi tek gün olarak, çoklu seçim aralık olarak
                uygulanır.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <QuickButton
                isActive={
                  !isCustomRangePickerVisible &&
                  draftStartDate === todayDate &&
                  draftEndDate === todayDate
                }
                label="Bugün"
                onClick={() => applySingleDate(todayDate)}
              />
              <QuickButton
                isActive={
                  !isCustomRangePickerVisible &&
                  draftStartDate === shiftIsoDate(todayDate, -1) &&
                  draftEndDate === shiftIsoDate(todayDate, -1)
                }
                label="Dün"
                onClick={() => applySingleDate(shiftIsoDate(todayDate, -1))}
              />
              <QuickButton
                isActive={
                  !isCustomRangePickerVisible &&
                  draftStartDate === range7.startDate &&
                  draftEndDate === range7.endDate
                }
                label="Son 7 Gün"
                onClick={() =>
                  applyRangeDates(range7.startDate, range7.endDate)
                }
              />
              <QuickButton
                isActive={
                  !isCustomRangePickerVisible &&
                  draftStartDate === range14.startDate &&
                  draftEndDate === range14.endDate
                }
                label="Son 14 Gün"
                onClick={() =>
                  applyRangeDates(range14.startDate, range14.endDate)
                }
              />
              <QuickButton
                isActive={
                  !isCustomRangePickerVisible &&
                  draftStartDate === range30.startDate &&
                  draftEndDate === range30.endDate
                }
                label="Son 30 Gün"
                onClick={() =>
                  applyRangeDates(range30.startDate, range30.endDate)
                }
              />
              <QuickButton
                isActive={isCustomRange}
                label="Özel Aralık"
                onClick={() => {
                  if (!isCustomRangePickerVisible) {
                    setDraftEndDate(todayDate);
                  }
                  setIsCustomRangePickerVisible(true);
                  setOpenCalendar("start");
                }}
              />
            </div>

            {isCustomRangePickerVisible ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DateInput
                  isOpen={openCalendar === "start"}
                  label="Başlangıç"
                  minDate={minSelectableDate}
                  maxDate={draftEndDate < todayDate ? draftEndDate : todayDate}
                  onOpenChange={(nextOpen) =>
                    setOpenCalendar(nextOpen ? "start" : null)
                  }
                  onSelect={setDraftStartDate}
                  position="left"
                  value={draftStartDate}
                />
                <DateInput
                  isOpen={openCalendar === "end"}
                  label="Bitiş"
                  minDate={
                    draftStartDate > minSelectableDate
                      ? draftStartDate
                      : minSelectableDate
                  }
                  maxDate={todayDate}
                  onOpenChange={(nextOpen) =>
                    setOpenCalendar(nextOpen ? "end" : null)
                  }
                  onSelect={setDraftEndDate}
                  position="right"
                  value={draftEndDate}
                />
              </div>
            ) : null}
          </div>

          {validationError ? (
            <p className="mt-4 font-poppins text-sm font-medium text-[#E03030]">
              {validationError}
            </p>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-[#171717]/38">
              {isSingleDaySelection
                ? "Tek gün görünümü"
                : `${draftFilter.dayCount} günlük aralık`}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-[#171717]/10 px-4 py-2 font-poppins text-sm font-semibold text-[#171717]/68 transition-colors hover:text-[#171717]"
                onClick={closeAndReset}
                type="button"
              >
                Vazgeç
              </button>
              <button
                className={`rounded-full px-4 py-2 font-poppins text-sm font-semibold text-white transition-colors ${
                  isApplyDisabled || isUpdating
                    ? "cursor-not-allowed bg-[#171717]/30"
                    : "bg-[#0057FF] hover:bg-[#0047D2]"
                }`}
                disabled={isApplyDisabled || isUpdating}
                onClick={() => {
                  onApply(draftFilter);
                  setIsOpen(false);
                }}
                type="button"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
