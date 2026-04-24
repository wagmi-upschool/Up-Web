"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ANALYTICS_COLOR_STYLES,
  type AnalyticsDashboardViewModel,
  getAnalyticsChartMax,
} from "@/lib/analyticsDashboardAdapter";
import { type AnalyticsGranularity } from "@/lib/analyticsDashboard";
import {
  AnalyticsCard,
  AnalyticsSectionHeading,
  AnalyticsSegmentedToggle,
  AnalyticsSubheading,
  formatAnalyticsNumber,
} from "@/components/analytics-dashboard/dashboard-shell";

const GRANULARITY_OPTIONS: Array<{ value: AnalyticsGranularity; label: string }> = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
];

function AnalyticsChartTooltip({
  active,
  payload,
  color,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number } }>;
  color: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-2xl border border-[#171717]/10 bg-[#171717] px-4 py-3 text-white shadow-2xl">
      <p className="font-poppins text-xs uppercase tracking-[0.2em] text-white/55">
        {point.label}
      </p>
      <p className="mt-2 font-righteous text-3xl leading-none" style={{ color }}>
        {formatAnalyticsNumber(point.value)}
      </p>
    </div>
  );
}

function AnalyticsLineChartCard({
  points,
  colorToken,
}: {
  points: Array<{ label: string; value: number }>;
  colorToken: keyof typeof ANALYTICS_COLOR_STYLES;
}) {
  const colorStyle = ANALYTICS_COLOR_STYLES[colorToken];
  const maxValue = getAnalyticsChartMax(points);

  if (!points.length) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#E4DCCF] bg-[#FCFBF8] text-sm text-[#8B8376]">
        Trend verisi bulunamadı.
      </div>
    );
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={points} margin={{ top: 18, right: 18, left: 18, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${colorToken}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={colorStyle.line} stopOpacity={0.16} />
              <stop offset="100%" stopColor={colorStyle.line} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#E8E0D4" strokeDasharray="0" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{
              fill: "#171717",
              fillOpacity: 0.55,
              fontFamily: "var(--font-poppins)",
              fontSize: 11,
            }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            domain={[0, maxValue]}
            tick={{
              fill: "#171717",
              fillOpacity: 0.55,
              fontFamily: "var(--font-poppins)",
              fontSize: 11,
            }}
            tickLine={false}
            width={42}
          />
          <Tooltip content={<AnalyticsChartTooltip color={colorStyle.line} />} />
          <Area
            dataKey="value"
            fill={`url(#fill-${colorToken})`}
            stroke="none"
            type="monotone"
          />
          <Line
            activeDot={{
              fill: colorStyle.line,
              r: 7,
              stroke: "#FFFFFF",
              strokeWidth: 3,
            }}
            dataKey="value"
            dot={{
              fill: colorStyle.line,
              r: 6,
              stroke: "#FFFFFF",
              strokeWidth: 3,
            }}
            stroke={colorStyle.line}
            strokeWidth={4}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProgressBar({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[#EFEAE0]">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{
          width: `${Math.max(0, Math.min(progress, 100))}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

export function KpiSection({
  items,
}: {
  items: AnalyticsDashboardViewModel["kpis"];
}) {
  return (
    <section className="grid gap-4 xl:grid-cols-4">
      {items.map((item) => {
        const colorStyle = ANALYTICS_COLOR_STYLES[item.colorToken];

        return (
          <AnalyticsCard key={item.id}>
            <div className="mb-4 h-1 rounded-full" style={{ backgroundColor: colorStyle.line }} />
            <p className="font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/55">
              {item.label}
            </p>
            <p className="mt-3 font-righteous text-5xl leading-none text-[#171717]">
              {formatAnalyticsNumber(item.value)}
            </p>
            <p className="mt-2 font-poppins text-sm text-[#171717]/65">{item.subtitle}</p>
          </AnalyticsCard>
        );
      })}
    </section>
  );
}

export function OverallTrendSection({
  overallTrend,
  behaviorTotals,
  availableGranularities,
}: {
  overallTrend: AnalyticsDashboardViewModel["overallTrend"];
  behaviorTotals: AnalyticsDashboardViewModel["behaviorTotals"];
  availableGranularities: AnalyticsDashboardViewModel["filters"]["availableGranularities"];
}) {
  const [granularity, setGranularity] = useState<AnalyticsGranularity>(
    availableGranularities[0] || "daily",
  );

  return (
    <>
      <AnalyticsSectionHeading>Zaman Trendi</AnalyticsSectionHeading>
      <section className="grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <AnalyticsCard variant="trend">
          <AnalyticsSubheading dotColor="#AD7A00">
            Günlük Sinyal Trendi
          </AnalyticsSubheading>
          <div className="mb-6">
            <AnalyticsSegmentedToggle
              onChange={(value) => setGranularity(value as AnalyticsGranularity)}
              options={GRANULARITY_OPTIONS.filter((option) =>
                availableGranularities.includes(option.value),
              )}
              value={granularity}
            />
          </div>
          <AnalyticsLineChartCard
            colorToken="gold"
            points={overallTrend.granularities[granularity].points}
          />
        </AnalyticsCard>

        <AnalyticsCard>
          <AnalyticsSubheading dotColor="#1C8067">
            Davranış Başına Toplam Sinyal
          </AnalyticsSubheading>
          <div className="space-y-7">
            {behaviorTotals.map((item) => {
              const colorStyle = ANALYTICS_COLOR_STYLES[item.colorToken];

              return (
                <div key={item.id}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <p className="font-poppins text-sm leading-6 text-[#171717]/86 sm:text-base">
                      {item.label}
                    </p>
                    <p className="font-righteous text-3xl leading-none" style={{ color: colorStyle.line }}>
                      {formatAnalyticsNumber(item.value)}
                    </p>
                  </div>
                  <ProgressBar color={colorStyle.line} progress={item.progress} />
                </div>
              );
            })}
          </div>
        </AnalyticsCard>
      </section>
    </>
  );
}

export function CompanyComparisonSection({
  items,
}: {
  items: AnalyticsDashboardViewModel["companyComparison"];
}) {
  const leftColumn = items.filter((_, index) => index % 2 === 0);
  const rightColumn = items.filter((_, index) => index % 2 === 1);

  return (
    <>
      <AnalyticsSectionHeading>Şirket Karşılaştırması</AnalyticsSectionHeading>
      <AnalyticsCard>
        <AnalyticsSubheading dotColor="#375CCB">
          Şirket Başına Toplam Sinyal
        </AnalyticsSubheading>
        <div className="grid gap-8 lg:grid-cols-2">
          {[leftColumn, rightColumn].map((column, index) => (
            <div className="space-y-7" key={index}>
              {column.map((item) => {
                const colorStyle = ANALYTICS_COLOR_STYLES[item.colorToken];

                return (
                  <div key={item.id}>
                    <div className="mb-2 flex items-center justify-between gap-4">
                      <p className="font-poppins text-base text-[#171717]/86">
                        {item.label}
                      </p>
                      <p className="font-righteous text-3xl leading-none" style={{ color: colorStyle.line }}>
                        {formatAnalyticsNumber(item.value)}
                      </p>
                    </div>
                    <ProgressBar color={colorStyle.line} progress={item.progress} />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </AnalyticsCard>
    </>
  );
}

export function PeopleAndSummarySection({
  topSenders,
  behaviorSummary,
}: {
  topSenders: AnalyticsDashboardViewModel["topSenders"];
  behaviorSummary: AnalyticsDashboardViewModel["behaviorSummary"];
}) {
  return (
    <>
      <AnalyticsSectionHeading>Sinyal Gönderenler & Davranış Özeti</AnalyticsSectionHeading>
      <section className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <AnalyticsCard>
          <AnalyticsSubheading dotColor="#B52E45">
            En Çok Sinyal Verenler
          </AnalyticsSubheading>
          <div className="space-y-3">
            {topSenders.map((sender) => {
              const colorStyle = ANALYTICS_COLOR_STYLES[sender.dominantColorToken];

              return (
                <div
                  className="grid grid-cols-[36px_48px_minmax(0,1fr)_120px] items-center gap-4 rounded-2xl border border-[#171717]/8 bg-[#FFFFFF]/70 px-4 py-4 transition-all duration-300 hover:scale-[1.015] hover:border-white/40 hover:bg-white/35 hover:shadow-[0_18px_35px_rgba(23,23,23,0.1)] hover:backdrop-blur-xl"
                  key={sender.personId}
                >
                  <p
                    className="font-righteous text-3xl text-[#AD7A00]"
                  >
                    {sender.rank}
                  </p>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-poppins text-sm font-semibold text-white"
                    style={{ backgroundColor: colorStyle.line }}
                  >
                    {sender.initials}
                  </div>
                  <p className="truncate font-poppins text-sm leading-6 text-[#171717]/86 sm:text-base">
                    {sender.fullName}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <ProgressBar color={colorStyle.line} progress={sender.progress} />
                    </div>
                    <p className="font-righteous text-3xl leading-none" style={{ color: colorStyle.line }}>
                      {formatAnalyticsNumber(sender.totalSignals)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </AnalyticsCard>

        <AnalyticsCard>
          <AnalyticsSubheading dotColor="#6B3AB2">Davranış Özeti</AnalyticsSubheading>
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/55">
                  <th className="pb-2">Davranış</th>
                  <th className="pb-2">Toplam</th>
                  <th className="pb-2">En Yoğun Gün</th>
                </tr>
              </thead>
              <tbody>
                {behaviorSummary.map((item) => (
                  <tr className="border-b border-[#F0E8DB]" key={item.behaviorId}>
                    <td className="py-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 font-poppins text-sm font-semibold ${item.toneClass}`}
                      >
                        {item.label}
                      </span>
                    </td>
                    <td
                      className="py-2 font-righteous text-3xl leading-none"
                      style={{ color: ANALYTICS_COLOR_STYLES[item.colorToken].line }}
                    >
                      {formatAnalyticsNumber(item.totalSignals)}
                    </td>
                    <td className="py-2 font-poppins text-base text-[#5F574B]">
                      {item.peakDayLabel}:{" "}
                      <span
                        className="font-semibold"
                        style={{ color: ANALYTICS_COLOR_STYLES[item.colorToken].line }}
                      >
                        {formatAnalyticsNumber(item.peakDayValue)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnalyticsCard>
      </section>
    </>
  );
}

function BehaviorTrendCard({
  trend,
  availableGranularities,
}: {
  trend: AnalyticsDashboardViewModel["behaviorTrends"][number];
  availableGranularities: AnalyticsDashboardViewModel["filters"]["availableGranularities"];
}) {
  const [granularity, setGranularity] = useState<AnalyticsGranularity>(
    availableGranularities[0] || "daily",
  );
  const colorStyle = ANALYTICS_COLOR_STYLES[trend.colorToken];
  const points = trend.granularities[granularity].points;

  return (
        <AnalyticsCard variant="trend">
      <AnalyticsSubheading dotColor={colorStyle.line}>{trend.label}</AnalyticsSubheading>
      <div className="mb-6">
        <AnalyticsSegmentedToggle
          onChange={(value) => setGranularity(value as AnalyticsGranularity)}
          options={GRANULARITY_OPTIONS.filter((option) =>
            availableGranularities.includes(option.value),
          )}
          value={granularity}
        />
      </div>
      <AnalyticsLineChartCard colorToken={trend.colorToken} points={points} />
    </AnalyticsCard>
  );
}

export function BehaviorTrendGridSection({
  items,
  availableGranularities,
}: {
  items: AnalyticsDashboardViewModel["behaviorTrends"];
  availableGranularities: AnalyticsDashboardViewModel["filters"]["availableGranularities"];
}) {
  return (
    <>
      <AnalyticsSectionHeading>Davranış Trendleri</AnalyticsSectionHeading>
      <section className="grid gap-4 xl:grid-cols-2">
        {items.map((trend) => (
          <BehaviorTrendCard
            availableGranularities={availableGranularities}
            key={trend.behaviorId}
            trend={trend}
          />
        ))}
      </section>
    </>
  );
}
