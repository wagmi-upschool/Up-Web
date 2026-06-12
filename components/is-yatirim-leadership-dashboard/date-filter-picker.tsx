"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { IsYatirimDateFilter } from "@/lib/isYatirimLeadershipDashboard";
import {
  formatIsYatirimDateFilterLabel,
  getTodayDateString,
  normalizeIsYatirimDateFilter,
} from "@/lib/isYatirimLeadershipDashboard";

function shiftIsoDate(value: string, amount: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

function getQuickRangeDateFilter(dayCount: number, todayDate: string) {
  return {
    startDate: shiftIsoDate(todayDate, -(dayCount - 1)),
    endDate: todayDate,
  };
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
  setValue,
  value,
}: {
  label: string;
  setValue: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-poppins text-xs font-semibold uppercase tracking-[0.18em] text-[#171717]/45">
        {label}
      </span>
      <input
        className="rounded-2xl border border-[#171717]/10 bg-white px-4 py-3 font-poppins text-sm font-medium text-[#171717] outline-none transition-colors focus:border-[#0057FF]/40"
        onChange={(event) => setValue(event.target.value)}
        type="date"
        value={value}
      />
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
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
    draftStartDate && draftEndDate && draftStartDate > draftEndDate
      ? "Başlangıç tarihi bitiş tarihinden sonra olamaz."
      : !draftStartDate || !draftEndDate
        ? "Tarih seçimi tamamlanmalı."
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
    setDraftStartDate(nextDate);
    setDraftEndDate(nextDate);
    setIsCustomRangePickerVisible(false);
  };

  const applyRangeDates = (nextStartDate: string, nextEndDate: string) => {
    setDraftStartDate(nextStartDate);
    setDraftEndDate(nextEndDate);
    setIsCustomRangePickerVisible(false);
  };

  const closeAndReset = () => {
    setDraftStartDate(dateFilter.startDate);
    setDraftEndDate(dateFilter.endDate);
    setIsCustomRangePickerVisible(isCurrentFilterCustom);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
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
        <div className="absolute right-0 top-[calc(100%+12px)] z-[60] w-[min(92vw,420px)] rounded-[28px] border border-[#171717]/10 bg-[#FFFDF8] p-5 shadow-[0_28px_70px_rgba(23,23,23,0.16)] backdrop-blur-sm">
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
                onClick={() => applyRangeDates(range7.startDate, range7.endDate)}
              />
              <QuickButton
                isActive={
                  !isCustomRangePickerVisible &&
                  draftStartDate === range14.startDate &&
                  draftEndDate === range14.endDate
                }
                label="Son 14 Gün"
                onClick={() => applyRangeDates(range14.startDate, range14.endDate)}
              />
              <QuickButton
                isActive={
                  !isCustomRangePickerVisible &&
                  draftStartDate === range30.startDate &&
                  draftEndDate === range30.endDate
                }
                label="Son 30 Gün"
                onClick={() => applyRangeDates(range30.startDate, range30.endDate)}
              />
              <QuickButton
                isActive={isCustomRange}
                label="Özel Aralık"
                onClick={() => setIsCustomRangePickerVisible(true)}
              />
            </div>

            {isCustomRangePickerVisible ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DateInput
                  label="Başlangıç"
                  setValue={setDraftStartDate}
                  value={draftStartDate}
                />
                <DateInput
                  label="Bitiş"
                  setValue={setDraftEndDate}
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
