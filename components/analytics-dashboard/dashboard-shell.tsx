"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import LottieSpinner from "@/components/global/loader/lottie-spinner";

const MOCK_COMPANY_TABS = [
  { id: "all", slug: "all", label: "TÜM ŞİRKETLER", disabled: false },
  { id: "esan", slug: "esan", label: "ESAN", disabled: true },
  { id: "eyap", slug: "eyap", label: "EYAP", disabled: true },
  { id: "eip", slug: "eip", label: "EİP", disabled: true },
  { id: "gensenta", slug: "gensenta", label: "GENSENTA", disabled: true },
  { id: "holding", slug: "holding", label: "HOLDİNG", disabled: true },
  { id: "saniverse", slug: "saniverse", label: "SANIVERSE", disabled: true },
  { id: "vitra-fliesen", slug: "vitra-fliesen", label: "VİTRA FLIESEN", disabled: true },
  { id: "vitra-karo", slug: "vitra-karo", label: "VİTRA KARO", disabled: true },
] as const;

export function AnalyticsDashboardPageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen min-h-[100dvh] overflow-hidden bg-[#F3EAD7] text-[#171717]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_#0057FF_0,_transparent_28%),radial-gradient(circle_at_top_right,_#985DF8_0,_transparent_24%),radial-gradient(circle_at_bottom_left,_#00D9C0_0,_transparent_20%),linear-gradient(180deg,_#F8F2E7_0%,_#F3EAD7_100%)] opacity-[0.08]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),transparent)]"
      />
      <div className="relative z-10">{children}</div>
    </main>
  );
}

export function AnalyticsDashboardBody({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-5 sm:py-8 lg:px-6">
      {children}
    </div>
  );
}

export function AnalyticsDashboardHeader({
  companies,
  selectedCompany,
  onCompanySelect,
  isUpdating,
}: {
  companies: Array<{ id: string; slug: string; label: string }>;
  selectedCompany: string;
  onCompanySelect: (slug: string) => void;
  isUpdating: boolean;
}) {
  const usesMockTabs = companies.length <= 1;
  const displayedTabs = usesMockTabs
    ? MOCK_COMPANY_TABS
    : companies.map((company) => ({
        ...company,
        label: company.label.toLocaleUpperCase("tr-TR"),
        disabled: false,
      }));

  return (
    <div className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-5 sm:pt-8 lg:px-6">
      <div className="group relative overflow-hidden rounded-[30px] border border-[#171717]/10 bg-[#FFFFFF]/88 p-5 shadow-[0_24px_60px_rgba(23,23,23,0.08)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:border-white/45 hover:bg-white/40 hover:shadow-[0_28px_70px_rgba(23,23,23,0.14)] hover:backdrop-blur-xl sm:p-6">
        <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[linear-gradient(135deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08)_42%,rgba(255,255,255,0.18)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Image
                alt="UP"
                className="h-14 w-auto shrink-0 sm:h-16"
                height={64}
                src="/up.svg"
                width={96}
              />
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0057FF]/10 px-3 py-1 font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-[#0057FF]">
                  <Sparkles className="h-3.5 w-3.5" />
                  UP Pulse
                </div>
                <div>
                  <div className="flex flex-col gap-1 md:flex-row md:items-end md:gap-6">
                    <h1 className="font-righteous text-[2.7rem] leading-[0.9] tracking-[-0.05em] text-[#171717] sm:text-[4.35rem] lg:text-[4.95rem]">
                      Eczacıbaşı
                    </h1>
                    <p className="pb-1 font-righteous text-[1.22rem] uppercase leading-none tracking-[0.06em] text-[#171717] [text-shadow:0.55px_0_0_currentColor,-0.55px_0_0_currentColor] sm:text-[1.85rem] lg:pb-2 lg:text-[2.45rem]">
                      SİNYAL ANALİZ PANELİ
                    </p>
                  </div>
                </div>
              </div>
            </div>
            {isUpdating ? (
              <div className="inline-flex items-center gap-3 self-start rounded-full border border-[#D7B154] bg-[#FFF2BF] px-4 py-2 font-poppins text-sm font-semibold text-[#A06C00]">
                <span className="inline-flex items-center gap-2">
                  <LottieSpinner className="!py-0" size={24} />
                  Güncelleniyor
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto border-y border-[#171717]/10 bg-[#FFFFFF]/82 shadow-[0_10px_26px_rgba(23,23,23,0.05)] backdrop-blur-sm">
        <div className="flex min-w-max items-center gap-8 px-4 py-4 sm:px-5 lg:px-6">
          {displayedTabs.map((company) => {
            const isActive = company.slug === selectedCompany;

            return (
              <button
                aria-disabled={company.disabled}
                className={`font-poppins text-[17px] font-semibold uppercase tracking-[0.01em] transition-colors ${
                  isActive
                    ? "text-[#A06C00]"
                    : company.disabled
                      ? "cursor-not-allowed text-[#171717]/48"
                      : "text-[#171717]/62 hover:text-[#171717]"
                }`}
                disabled={company.disabled}
                key={company.id}
                onClick={() => onCompanySelect(company.slug)}
                type="button"
              >
                {company.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AnalyticsSectionHeading({
  children,
}: {
  children: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <h2 className="shrink-0 font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/55">
        {children}
      </h2>
      <div className="h-px flex-1 bg-[#171717]/10" />
    </div>
  );
}

export function AnalyticsCard({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "trend";
}) {
  const cardTone =
    variant === "trend"
      ? "bg-[linear-gradient(140deg,#FFFDF8_0%,#F3EAD7_48%,#EFF1FF_100%)] backdrop-blur-md hover:border-white/45 hover:bg-[linear-gradient(140deg,rgba(255,255,255,0.7)_0%,rgba(243,234,215,0.6)_48%,rgba(239,241,255,0.7)_100%)] hover:backdrop-blur-xl"
      : "bg-[#FFFFFF]/90 backdrop-blur-sm hover:border-white/45 hover:bg-white/40 hover:backdrop-blur-xl";

  const baseOverlay =
    variant === "trend"
      ? "bg-[radial-gradient(circle_at_top_right,rgba(99,140,255,0.13),transparent_28%),radial-gradient(circle_at_18%_14%,rgba(255,255,255,0.88),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(202,226,255,0.1),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_45%,rgba(211,226,255,0.16)_100%)]"
      : "bg-transparent";

  const hoverOverlay =
    variant === "trend"
      ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.32),rgba(255,255,255,0.08)_45%,rgba(193,214,255,0.2)_100%)]"
      : "bg-[linear-gradient(135deg,rgba(255,255,255,0.3),rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.18)_100%)]";

  return (
    <section
      className={`group relative overflow-hidden rounded-[30px] border border-[#171717]/10 p-5 shadow-[0_24px_60px_rgba(23,23,23,0.08)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_28px_70px_rgba(23,23,23,0.14)] sm:p-6 ${cardTone} ${className}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${baseOverlay}`} />
      {variant === "trend" ? (
        <>
          <div className="pointer-events-none absolute inset-x-12 top-0 h-16 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.76)_0%,rgba(255,255,255,0)_72%)] blur-2xl" />
          <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-[#DDE8FF]/35 blur-3xl transition-transform duration-300 group-hover:scale-110" />
        </>
      ) : null}
      <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${hoverOverlay}`} />
      <div className="relative z-10">{children}</div>
    </section>
  );
}

export function AnalyticsSubheading({
  dotColor,
  children,
}: {
  dotColor: string;
  children: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-2 font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/55">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: dotColor }}
      />
      <span>{children}</span>
    </div>
  );
}

export function AnalyticsSegmentedToggle({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex rounded-2xl border border-[#171717]/8 bg-[#F3EAD7] p-2">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            className={`rounded-xl px-4 py-2 font-poppins text-sm font-semibold transition-colors ${
              isActive
                ? "bg-[#171717] text-[#FFFFFF] shadow-sm"
                : "text-[#171717]/60 hover:bg-[#FFFFFF] hover:text-[#171717]"
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function AnalyticsEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AnalyticsCard className="py-16">
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <p className="font-righteous text-3xl text-[#171717]">{title}</p>
        <p className="font-poppins text-base text-[#171717]/62">{description}</p>
      </div>
    </AnalyticsCard>
  );
}

export function AnalyticsErrorState({ message }: { message: string }) {
  return (
    <AnalyticsCard className="py-16">
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <p className="font-righteous text-3xl text-[#171717]">
          Dashboard verisi yüklenemedi
        </p>
        <p className="font-poppins text-base text-[#A84E00]">{message}</p>
      </div>
    </AnalyticsCard>
  );
}

export function AnalyticsLoadingState() {
  return (
    <AnalyticsCard className="py-16">
      <div className="flex justify-center">
        <LottieSpinner size={160} />
      </div>
    </AnalyticsCard>
  );
}

export function formatAnalyticsNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}
