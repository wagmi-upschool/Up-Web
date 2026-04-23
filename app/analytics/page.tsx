"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import LottieSpinner from "@/components/global/loader/lottie-spinner";
import type { AnalyticsSummaryResponse } from "@/lib/analyticsCompetencies";
import type { DashboardCultureQuestion } from "@/lib/dashboardSummary";

type DailySignalPoint = {
  date: string;
  label: string;
  totalFeedbacks: number;
};

const COLORS = {
  background: "#f4f2ed",
  surface: "#ffffff",
  surfaceMuted: "#f8f6f1",
  border: "#e5e1d8",
  gold: "#9a6f00",
  goldLight: "#f5e6b0",
  blue: "#2d52b8",
  green: "#156b54",
  red: "#a8253c",
  purple: "#5e2fa0",
  text: "#19170f",
  muted: "#7a7568",
} as const;

const QUESTION_COLORS = [
  COLORS.blue,
  COLORS.red,
  COLORS.gold,
  COLORS.purple,
  COLORS.green,
];

const MONTH_LABELS = [
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
] as const;

async function getAnalyticsSummary(competencyId: string) {
  const response = await fetch(
    `/analytics/summary?competencyId=${encodeURIComponent(competencyId)}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const code = json?.errorCode || response.status;
    const message =
      json?.errorMessage || response.statusText || "Dashboard verisi alınamadı.";
    throw new Error(`${code}: ${message}`);
  }

  return json as AnalyticsSummaryResponse;
}

function parseDashboardDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2})/);

  if (!match) {
    const fallback = new Date(value);
    return Number.isFinite(fallback.getTime()) ? fallback : null;
  }

  const [, year, month, day, hour] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
  );

  return Number.isFinite(date.getTime()) ? date : null;
}

function formatDayKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatDayLabel(date: Date) {
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
}

function buildDailySignals(summary: AnalyticsSummaryResponse | undefined) {
  if (!summary) return [];

  const byDay = new Map<string, DailySignalPoint>();

  for (const rating of summary.hourlyRatings) {
    const date = parseDashboardDate(rating.hour);
    if (!date) continue;

    const key = formatDayKey(date);
    const current =
      byDay.get(key) ||
      ({
        date: key,
        label: formatDayLabel(date),
        totalFeedbacks: 0,
      } satisfies DailySignalPoint);

    current.totalFeedbacks += rating.totalFeedbacks;
    byDay.set(key, current);
  }

  return Array.from(byDay.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
}

function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [, ...messageParts] = raw.split(":");
  return messageParts.join(":").trim() || raw;
}

function KpiCard({
  color,
  label,
  value,
  subtitle,
}: {
  color: string;
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-xl border border-[#e5e1d8] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_3px_12px_rgba(0,0,0,0.06)]">
      <div className="mb-4 h-[3px] rounded-full" style={{ background: color }} />
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7a7568]">
        {label}
      </p>
      <p
        className="text-5xl font-bold leading-none text-[#9a6f00]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-[#7a7568]">{subtitle}</p>
    </article>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <div className="mt-7 flex items-center gap-3 text-[10px] uppercase tracking-[0.28em] text-[#7a7568]">
      <span>{children}</span>
      <div className="h-px flex-1 bg-[#e5e1d8]" />
    </div>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload: DailySignalPoint }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-lg border border-[#e5e1d8] bg-white px-4 py-3 text-sm shadow-lg">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#7a7568]">
        {label}
      </p>
      <p
        className="mt-1 text-2xl font-bold text-[#9a6f00]"
        style={{ fontFamily: "Georgia, serif" }}
      >
        {point.totalFeedbacks}
      </p>
      <p className="text-xs text-[#3e3b30]">sinyal</p>
    </div>
  );
}

function DailySignalsChart({ data }: { data: DailySignalPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed border-[#d0ccc0] bg-[#f8f6f1] text-sm text-[#7a7568]">
        Trend verisi bulunamadı.
      </div>
    );
  }

  return (
    <div className="h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 22, right: 18, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="signalsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={COLORS.gold} stopOpacity={0.2} />
              <stop offset="100%" stopColor={COLORS.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e5e1d8" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tick={{ fill: COLORS.muted, fontSize: 12 }}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<TrendTooltip />} />
          <Area
            activeDot={{ fill: COLORS.gold, r: 7, stroke: "#fff", strokeWidth: 3 }}
            dataKey="totalFeedbacks"
            fill="url(#signalsFill)"
            stroke={COLORS.gold}
            strokeWidth={3}
            type="monotone"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function QuestionScoreRow({
  question,
  maxRating,
  index,
}: {
  question: DashboardCultureQuestion;
  maxRating: number;
  index: number;
}) {
  const color = QUESTION_COLORS[index % QUESTION_COLORS.length];
  const percent =
    maxRating > 0 ? Math.min((question.averageRating / maxRating) * 100, 100) : 0;

  return (
    <div className="rounded-lg border border-[#e5e1d8] bg-[#f8f6f1] px-4 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-6 text-[#19170f]">
            {question.questionText}
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#7a7568]">
            {question.totalFeedbacks} yanıt
          </p>
        </div>
        <div className="flex items-center gap-4 md:w-48">
          <div className="h-2 flex-1 overflow-hidden rounded-full border border-[#e5e1d8] bg-[#f0ede6]">
            <div
              className="h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: color }}
            />
          </div>
          <p
            className="w-12 text-right text-2xl font-bold"
            style={{ color, fontFamily: "Georgia, serif" }}
          >
            {question.averageRating.toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  const rawCompetencyId = searchParams.get("competencyId") || "";
  const competencyId = rawCompetencyId.trim();
  const hasCompetencyId = competencyId.length > 0;

  const summaryQuery = useQuery({
    queryKey: ["analyticsSummary", competencyId],
    queryFn: () => getAnalyticsSummary(competencyId),
    enabled: hasCompetencyId,
    refetchOnWindowFocus: false,
  });

  const summary = summaryQuery.data;
  const dailySignals = useMemo(() => buildDailySignals(summary), [summary]);
  const questions = summary?.cultureScore.questions || [];
  const maxRating = summary?.cultureScore.maxRating || summary?.maxRating || 4;
  const totalResponses = questions.reduce(
    (sum, question) => sum + question.totalFeedbacks,
    0,
  );

  return (
    <main className="min-h-screen bg-[#f4f2ed] text-[#19170f]">
      <header className="sticky top-0 z-20 border-b border-[#e5e1d8] bg-white px-5 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.06)] md:px-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1
              className="text-2xl font-black leading-none text-[#9a6f00]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {summary?.competency.displayName || "Eczacıbaşı"} · UP Pulse
            </h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-[#7a7568]">
              Sinyal analiz paneli ·{" "}
              {summary?.competency.periodLabel || "Canlı veri"}
            </p>
          </div>
          <div className="w-fit rounded-full border border-[#9a6f00] bg-[#f5e6b0] px-4 py-1 text-xs font-semibold text-[#9a6f00]">
            {summary ? `${summary.totalFeedbacks} Sinyal` : "Canlı Panel"}
          </div>
        </div>
      </header>

      <div className="px-5 py-7 md:px-10">
        {!hasCompetencyId ? (
          <div className="rounded-xl border border-[#e5e1d8] bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.05),0_3px_12px_rgba(0,0,0,0.06)]">
            <p className="text-lg font-semibold">competencyId gerekli</p>
            <p className="mt-2 text-sm text-[#7a7568]">
              Bu sayfa `/analytics?competencyId=&lt;uuid&gt;` formatıyla çalışır.
            </p>
          </div>
        ) : summaryQuery.isLoading ? (
          <div className="flex min-h-[420px] items-center justify-center">
            <LottieSpinner className="py-6" size={150} />
          </div>
        ) : summaryQuery.error ? (
          <div className="rounded-xl border border-[#a8253c]/25 bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.05),0_3px_12px_rgba(0,0,0,0.06)]">
            <p
              className="text-3xl font-bold text-[#a8253c]"
              style={{ fontFamily: "Georgia, serif" }}
            >
              Veri yüklenemedi
            </p>
            <p className="mt-3 text-sm text-[#7a7568]">
              {formatApiError(summaryQuery.error)}
            </p>
          </div>
        ) : summary ? (
          <div className="space-y-7">
            <section className="grid gap-4 lg:grid-cols-4">
              <KpiCard
                color={COLORS.gold}
                label="Toplam Sinyal"
                subtitle="Canlı feedback verisi"
                value={String(summary.totalFeedbacks)}
              />
              <KpiCard
                color={COLORS.blue}
                label="Genel Ortalama"
                subtitle={`Maksimum puan ${summary.maxRating.toFixed(2)}`}
                value={summary.overallAverageRating.toFixed(2)}
              />
              <KpiCard
                color={COLORS.green}
                label="Soru Başlığı"
                subtitle="Davranış özeti kapsamı"
                value={String(questions.length)}
              />
              <KpiCard
                color={COLORS.red}
                label="Soru Yanıtı"
                subtitle="Soru bazlı toplam yanıt"
                value={String(totalResponses)}
              />
            </section>

            <section>
              <SectionHeader>Zaman Trendi</SectionHeader>
              <div className="mt-4 rounded-xl border border-[#e5e1d8] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_3px_12px_rgba(0,0,0,0.06)]">
                <div className="mb-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#7a7568]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#9a6f00]" />
                  Günlük Sinyal Trendi
                </div>
                <DailySignalsChart data={dailySignals} />
              </div>
            </section>

            <section>
              <SectionHeader>Davranış / Soru Özeti</SectionHeader>
              <div className="mt-4 rounded-xl border border-[#e5e1d8] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05),0_3px_12px_rgba(0,0,0,0.06)]">
                <div className="mb-5 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[#7a7568]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#5e2fa0]" />
                  Canlı API soru skorları
                </div>
                {questions.length ? (
                  <div className="space-y-3">
                    {questions.map((question, index) => (
                      <QuestionScoreRow
                        index={index}
                        key={question.questionId}
                        maxRating={maxRating}
                        question={question}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#d0ccc0] bg-[#f8f6f1] p-8 text-center text-sm text-[#7a7568]">
                    Davranış / soru verisi bulunamadı.
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

export default function AnalyticsPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsPageContent />
    </QueryClientProvider>
  );
}
