"use client";

import { type ReactNode } from "react";
import LottieSpinner from "@/components/global/loader/lottie-spinner";

export function AnalyticsDashboardPageShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F3F0E9] text-[#2A241E]">{children}</main>
  );
}

export function AnalyticsDashboardBody({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[1440px] space-y-8 px-4 py-6 sm:px-6 lg:px-8">
      {children}
    </div>
  );
}

export function AnalyticsDashboardHeader({
  title,
  subtitle,
  badge,
  companies,
  selectedCompany,
  onCompanySelect,
  isUpdating,
}: {
  title: string;
  subtitle: string;
  badge: string;
  companies: Array<{ id: string; slug: string; label: string }>;
  selectedCompany: string;
  onCompanySelect: (slug: string) => void;
  isUpdating: boolean;
}) {
  const showCompanyTabs = companies.length > 1;

  return (
    <div className="border-b border-[#E3DACC] bg-white shadow-[0_1px_2px_rgba(73,52,8,0.05)]">
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <h1
              className="text-[32px] font-bold leading-none text-[#AD7A00]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {title}
            </h1>
            <p className="text-xs uppercase tracking-[0.32em] text-[#8B8376]">
              {subtitle}
            </p>
          </div>
          <div className="inline-flex items-center gap-3 self-start rounded-full border border-[#D7B154] bg-[#FFF2BF] px-4 py-2 text-sm font-semibold text-[#A06C00]">
            {isUpdating ? (
              <span className="inline-flex items-center gap-2">
                <LottieSpinner className="!py-0" size={24} />
                Güncelleniyor
              </span>
            ) : (
              badge
            )}
          </div>
        </div>

        {showCompanyTabs ? (
          <div className="mt-5 overflow-x-auto border-t border-[#E3DACC] pt-4">
            <div className="flex min-w-max items-center gap-2">
              {companies.map((company) => {
                const isActive = company.slug === selectedCompany;

                return (
                  <button
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      isActive
                        ? "bg-[#F6E8C0] text-[#A06C00]"
                        : "text-[#7B7368] hover:bg-[#F6F1E7] hover:text-[#2A241E]"
                    }`}
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
        ) : null}
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
      <h2 className="shrink-0 text-xs font-semibold uppercase tracking-[0.42em] text-[#8B8376]">
        {children}
      </h2>
      <div className="h-px flex-1 bg-[#E3DACC]" />
    </div>
  );
}

export function AnalyticsCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[24px] border border-[#E4DCCF] bg-white p-6 shadow-[0_8px_24px_rgba(84,61,18,0.08)] ${className}`}
    >
      {children}
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
    <div className="mb-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.34em] text-[#8B8376]">
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
    <div className="inline-flex rounded-xl border border-[#E4DCCF] bg-[#F7F3EB] p-1">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            className={`rounded-[10px] px-5 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-[#AD7A00] text-white"
                : "text-[#857C70] hover:text-[#2A241E]"
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
        <p className="text-2xl font-semibold text-[#2A241E]">{title}</p>
        <p className="text-sm text-[#7B7368]">{description}</p>
      </div>
    </AnalyticsCard>
  );
}

export function AnalyticsErrorState({ message }: { message: string }) {
  return (
    <AnalyticsCard className="py-16">
      <div className="mx-auto max-w-xl space-y-3 text-center">
        <p className="text-2xl font-semibold text-[#8C1F31]">
          Dashboard verisi yüklenemedi
        </p>
        <p className="text-sm text-[#7B7368]">{message}</p>
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
