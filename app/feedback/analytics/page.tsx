"use client";

import { type ReactNode, startTransition, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { Activity, BarChart3, Gauge, Sparkles, Users } from "lucide-react";
import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import LottieSpinner from "@/components/global/loader/lottie-spinner";
import {
  DASHBOARD_INTERVALS,
  type DashboardCultureQuestion,
  type DashboardIntervalHours,
  type GroupedRatingWindow,
  groupHourlyRatings,
  parseDashboardReceiverFilters,
  parseDashboardReceiverIdsInput,
} from "@/lib/dashboardSummary";
import { getDashboardSummary } from "@/lib/dashboardSummaryClient";

type ScoreTone = {
  text: string;
  surface: string;
  fill: string;
  line: string;
  dot: string;
};

const PALETTE = {
  blue: "#0057FF",
  sand: "#F3EAD7",
  black: "#171717",
  white: "#FFFFFF",
  orange: "#FC7700",
  orchid: "#985DF8",
  turquoise: "#00D9C0",
} as const;

function FeedbackPageShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen min-h-[100dvh] overflow-hidden bg-[#F3EAD7]"
      style={{ color: PALETTE.black }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.08] bg-[radial-gradient(circle_at_top_left,_#0057FF_0,_transparent_28%),radial-gradient(circle_at_top_right,_#985DF8_0,_transparent_24%),radial-gradient(circle_at_bottom_left,_#00D9C0_0,_transparent_20%),linear-gradient(180deg,_#F8F2E7_0%,_#F3EAD7_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),transparent)]"
      />
      {children}
    </div>
  );
}

function formatApiError(error: unknown) {
  const raw = error instanceof Error ? error.message : `${error}`;
  const [codePart, ...rest] = raw.split(":");
  const code = codePart?.trim();
  const message = rest.join(":").trim();

  if (code === "VAL_002") {
    return (
      message ||
      "Receiver ID formatini kontrol et. Yalnızca gecerli UUID degerleri kullanilabilir."
    );
  }

  return message || raw || "Dashboard verileri su anda yuklenemedi.";
}

function getScoreTone(value: number, maxRating: number): ScoreTone {
  const ratio = maxRating > 0 ? value / maxRating : 0;

  if (ratio >= 0.85) {
    return {
      text: "text-[#00D9C0]",
      surface: "bg-[#00D9C0]/12 text-[#0E7468]",
      fill: "#CFFAF4",
      line: "#00B8A2",
      dot: "#00D9C0",
    };
  }

  if (ratio >= 0.7) {
    return {
      text: "text-[#0057FF]",
      surface: "bg-[#0057FF]/10 text-[#0039A8]",
      fill: "#DCE9FF",
      line: "#0057FF",
      dot: "#0057FF",
    };
  }

  if (ratio >= 0.55) {
    return {
      text: "text-[#FC7700]",
      surface: "bg-[#FC7700]/12 text-[#A84E00]",
      fill: "#FFE6CF",
      line: "#FC7700",
      dot: "#FC7700",
    };
  }

  return {
    text: "text-[#985DF8]",
    surface: "bg-[#985DF8]/12 text-[#6330B4]",
    fill: "#E8D9FF",
    line: "#985DF8",
    dot: "#985DF8",
  };
}

function formatScore(value: number) {
  return value.toFixed(2);
}

function MetricCard({
  title,
  value,
  subtitle,
  accent,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent: "orange" | "blue";
  icon: ReactNode;
}) {
  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-[#171717]/10 bg-[#FFFFFF]/90 p-6 shadow-[0_18px_40px_rgba(23,23,23,0.08)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-white/40 hover:bg-white/35 hover:shadow-[0_24px_50px_rgba(23,23,23,0.14)] hover:backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),rgba(255,255,255,0.08)_42%,rgba(255,255,255,0.18)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          accent === "orange"
            ? "bg-gradient-to-r from-[#FC7700] via-[#FF9B45] to-[#F3EAD7]"
            : "bg-gradient-to-r from-[#0057FF] via-[#3F81FF] to-[#00D9C0]"
        }`}
      />
      <div className="relative z-10 mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/55">
            {title}
          </p>
          <p className="mt-3 font-righteous text-5xl leading-none text-[#171717]">
            {value}
          </p>
        </div>
        <div
          className={`rounded-2xl p-3 ${
            accent === "orange"
              ? "bg-[#FC7700]/12 text-[#FC7700]"
              : "bg-[#0057FF]/10 text-[#0057FF]"
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="relative z-10 font-poppins text-sm text-[#171717]/65">
        {subtitle}
      </p>
    </article>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
  maxRating,
  windows,
}: {
  active?: boolean;
  payload?: Array<{ payload: GroupedRatingWindow }>;
  label?: string;
  maxRating: number;
  windows: GroupedRatingWindow[];
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;
  const currentIndex = windows.findIndex(
    (window) =>
      window.startHour === point.startHour && window.endHour === point.endHour,
  );
  const previousPoint = currentIndex > 0 ? windows[currentIndex - 1] : null;
  const diffPercent = previousPoint
    ? previousPoint.averageRating > 0
      ? Number(
          (
            ((point.averageRating - previousPoint.averageRating) /
              previousPoint.averageRating) *
            100
          ).toFixed(1),
        )
      : point.averageRating > 0
        ? 100
        : 0
    : null;

  return (
    <div className="rounded-2xl border border-[#171717]/10 bg-[#171717] px-4 py-3 text-white shadow-2xl">
      <p className="font-poppins text-xs uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
      <p className="mt-2 font-righteous text-3xl leading-none">
        {formatScore(point.averageRating)}
      </p>
      <div className="mt-2 space-y-1 font-poppins text-sm text-white/80">
        <p>{`Ortalama puan / ${formatScore(maxRating)}`}</p>
        <p>{`${point.totalFeedbacks} geri bildirim`}</p>
        {diffPercent !== null ? (
          <p
            className={
              diffPercent > 0
                ? "text-[#00D9C0]"
                : diffPercent < 0
                  ? "text-[#FC7700]"
                  : "text-white/65"
            }
          >
            {`${diffPercent > 0 ? "+" : ""}${diffPercent}% onceki zaman dilimine gore`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function TrendChart({
  data,
  maxRating,
  maxDomainValue,
}: {
  data: GroupedRatingWindow[];
  maxRating: number;
  maxDomainValue: number;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={data}
        margin={{ top: 18, right: 8, left: -18, bottom: 0 }}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0057FF" stopOpacity={0.26} />
            <stop offset="65%" stopColor="#00D9C0" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="#171717"
          strokeOpacity={0.08}
          strokeDasharray="3 3"
          vertical={false}
        />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={18}
          tick={{
            fill: "#171717",
            fillOpacity: 0.55,
            fontFamily: "var(--font-poppins)",
            fontSize: 11,
          }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          domain={[0, maxDomainValue]}
          tick={{
            fill: "#171717",
            fillOpacity: 0.55,
            fontFamily: "var(--font-poppins)",
            fontSize: 11,
          }}
          tickFormatter={(value: number) => value.toFixed(1)}
          tickLine={false}
          width={42}
        />
        <Tooltip
          content={<TrendTooltip maxRating={maxRating} windows={data} />}
          cursor={{ stroke: "#985DF8", strokeDasharray: "4 4" }}
        />
        <Area
          dataKey="averageRating"
          fill="url(#trendFill)"
          stroke="none"
          type="monotone"
        />
        <Line
          activeDot={{
            fill: "#0057FF",
            r: 6,
            stroke: "#FFFFFF",
            strokeWidth: 3,
          }}
          dataKey="averageRating"
          dot={({ cx, cy, payload }: any) => {
            if (typeof cx !== "number" || typeof cy !== "number") {
              return <g />;
            }
            const tone = getScoreTone(payload.averageRating, maxRating);

            return (
              <circle
                cx={cx}
                cy={cy}
                fill={tone.dot}
                r={5}
                stroke="#FFFFFF"
                strokeWidth={3}
              />
            );
          }}
          stroke="#0057FF"
          strokeWidth={3}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CultureQuestionRow({
  question,
  maxRating,
}: {
  question: DashboardCultureQuestion;
  maxRating: number;
}) {
  const tone = getScoreTone(question.averageRating, maxRating);
  const width =
    maxRating > 0
      ? `${Math.min((question.averageRating / maxRating) * 100, 100)}%`
      : "0%";

  return (
    <div className="group relative flex items-center gap-4 rounded-2xl border border-[#171717]/8 bg-[#FFFFFF]/70 px-4 py-4 transition-all duration-300 hover:scale-[1.015] hover:border-white/40 hover:bg-white/35 hover:shadow-[0_18px_35px_rgba(23,23,23,0.1)] hover:backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgba(255,255,255,0.22),rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.14)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FC7700]/14 font-poppins text-xs font-semibold text-[#A84E00]">
        {question.order}
      </div>
      <div className="relative z-10 min-w-0 flex-1">
        <p className="font-poppins text-sm leading-6 text-[#171717]/86">
          {question.questionText}
        </p>
        <p className="mt-1 font-poppins text-xs uppercase tracking-[0.18em] text-[#171717]/42">
          {question.totalFeedbacks} yanit
        </p>
      </div>
      <div className="relative z-10 hidden w-20 shrink-0 rounded-full bg-[#171717]/8 md:block">
        <div
          className="h-1.5 rounded-full transition-[width] duration-700"
          style={{ width, backgroundColor: tone.dot }}
        />
      </div>
      <p
        className={`relative z-10 w-14 shrink-0 text-right font-righteous text-3xl ${tone.text}`}
      >
        {formatScore(question.averageRating)}
      </p>
    </div>
  );
}

function AnalyticsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filters = parseDashboardReceiverFilters(searchParams);
  const hasRequestedFilters = filters.receiverIds.length > 0;
  const hasInvalidFilters = filters.invalidReceiverIds.length > 0;
  const [receiverInput, setReceiverInput] = useState("");
  const [activeInterval, setActiveInterval] =
    useState<DashboardIntervalHours>(5);

  useEffect(() => {
    setReceiverInput(filters.receiverIds.join(", "));
  }, [filters.receiverIds]);

  const summaryQuery = useQuery({
    queryKey: ["dashboardSummary", filters.receiverIds.join(",")],
    queryFn: () => getDashboardSummary(filters.receiverIds),
    enabled: hasRequestedFilters && !hasInvalidFilters,
    refetchOnWindowFocus: false,
  });

  const summary = summaryQuery.data;
  const maxRating = summary?.maxRating ?? 4;
  const trendData = summary
    ? groupHourlyRatings(summary.hourlyRatings, activeInterval)
    : [];
  const cultureQuestions = summary?.cultureScore.questions || [];
  const chartMaxValue = Math.max(
    maxRating,
    ...trendData.map((item) => item.averageRating),
  );
  const averageTone = getScoreTone(
    summary?.overallAverageRating ?? 0,
    maxRating,
  );
  const cultureTone = getScoreTone(
    summary?.cultureScore.overallAverageRating ?? 0,
    summary?.cultureScore.maxRating ?? 4,
  );

  const applyFilters = () => {
    const receiverIds = parseDashboardReceiverIdsInput(receiverInput);
    const query = new URLSearchParams(searchParams.toString());

    query.delete("feedbackReceiverId");
    query.delete("feedbackReceiverIds");

    if (receiverIds.length === 1) {
      query.set("feedbackReceiverId", receiverIds[0]);
    }

    if (receiverIds.length > 1) {
      query.set("feedbackReceiverIds", receiverIds.join(","));
    }

    startTransition(() => {
      const nextUrl = query.toString()
        ? `/feedback/analytics?${query.toString()}`
        : "/feedback/analytics";
      router.replace(nextUrl);
    });
  };

  const clearFilters = () => {
    setReceiverInput("");
    startTransition(() => {
      router.replace("/feedback/analytics");
    });
  };

  return (
    <FeedbackPageShell>
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-3 py-6 sm:px-4 sm:py-8">
        <header className="group rounded-[30px] border border-[#171717]/10 bg-[#FFFFFF]/88 p-5 shadow-[0_24px_60px_rgba(23,23,23,0.08)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:border-white/45 hover:bg-white/40 hover:shadow-[0_28px_70px_rgba(23,23,23,0.14)] hover:backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Image
                alt="UP"
                className="h-14 w-auto sm:h-16"
                height={64}
                src="/up.svg"
                width={96}
              />
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#0057FF]/10 px-3 py-1 font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-[#0057FF]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Feedback Analytics
                </div>
                <div className="space-y-1">
                  <h1 className="font-righteous text-3xl text-[#171717] sm:text-4xl">
                    UP Pulse Dashboard
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2">
          <MetricCard
            accent="orange"
            icon={<Users className="h-6 w-6" />}
            subtitle={
              summary
                ? "Eslesen tamamlanmis anket sayisi"
                : "Dashboard sorgusu geldiginde tamamlanan anket sayisi burada gorunur"
            }
            title="Total Feedbacks"
            value={String(summary?.totalFeedbacks ?? 0)}
          />
          <MetricCard
            accent="blue"
            icon={<Gauge className="h-6 w-6" />}
            subtitle={`Maksimum puan ${formatScore(maxRating)}`}
            title="Overall Average Rating"
            value={summary ? formatScore(summary.overallAverageRating) : "0.00"}
          />
        </section>

        <section className="group overflow-hidden rounded-[30px] border border-[#171717]/10 bg-[linear-gradient(140deg,#FFFDF8_0%,#F3EAD7_48%,#EFE4FF_100%)] p-5 text-[#171717] shadow-[0_24px_60px_rgba(23,23,23,0.08)] transition-all duration-300 hover:scale-[1.01] hover:border-white/45 hover:bg-[linear-gradient(140deg,rgba(255,255,255,0.7)_0%,rgba(243,234,215,0.6)_48%,rgba(239,228,255,0.7)_100%)] hover:shadow-[0_28px_70px_rgba(23,23,23,0.14)] hover:backdrop-blur-xl sm:p-6">
          <div className="relative">
            <div className="pointer-events-none absolute inset-0 rounded-[30px] bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.04)_45%,rgba(255,255,255,0.16)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            <div className="absolute right-[-72px] top-[-120px] h-72 w-72 rounded-full bg-[#0057FF]/10 blur-2xl" />
            <div className="absolute bottom-[-100px] left-[12%] h-56 w-56 rounded-full bg-[#00D9C0]/12 blur-2xl" />
            <div className="absolute left-[45%] top-[18%] h-44 w-44 rounded-full bg-[#985DF8]/12 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/48">
                    YGA Culture Score
                  </p>
                  <h2 className="mt-2 font-righteous text-3xl text-[#171717] sm:text-4xl">
                    Culture Score
                  </h2>
                </div>
                <div className="sm:text-right">
                  <div
                    className={`font-righteous text-6xl leading-none ${cultureTone.text}`}
                  >
                    {summary
                      ? formatScore(summary.cultureScore.overallAverageRating)
                      : "0.00"}
                  </div>
                  <p className="mt-2 font-poppins text-sm uppercase tracking-[0.22em] text-[#171717]/38">
                    / {formatScore(summary?.cultureScore.maxRating ?? 4)}{" "}
                    overall
                  </p>
                </div>
              </div>

              <div className="h-px bg-[#171717]/10" />

              {!hasRequestedFilters ? (
                <div className="rounded-2xl border border-[#171717]/10 bg-[#FFFFFF]/60 p-6 text-center">
                  <p className="font-poppins text-base text-[#171717]/72">
                    Culture score bolumu receiver secildiginde dolacak.
                  </p>
                </div>
              ) : cultureQuestions.length === 0 ? (
                <div className="rounded-2xl border border-[#171717]/10 bg-[#FFFFFF]/60 p-6 text-center"></div>
              ) : (
                <div className="space-y-3">
                  {cultureQuestions.map((question) => (
                    <CultureQuestionRow
                      key={question.questionId}
                      maxRating={summary?.cultureScore.maxRating ?? 4}
                      question={question}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="group rounded-[30px] border border-[#171717]/10 bg-[#FFFFFF]/90 p-5 shadow-[0_24px_60px_rgba(23,23,23,0.08)] backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] hover:border-white/45 hover:bg-white/40 hover:shadow-[0_28px_70px_rgba(23,23,23,0.14)] hover:backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-[#171717]/55">
                Average Rating Trend
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#171717]/8 bg-[#F3EAD7] p-2">
              <span className="px-2 font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-[#171717]/55">
                Interval
              </span>
              {DASHBOARD_INTERVALS.map((interval) => (
                <button
                  key={interval}
                  className={`rounded-xl px-4 py-2 font-poppins text-sm font-semibold transition-colors ${
                    activeInterval === interval
                      ? "bg-[#171717] text-[#FFFFFF] shadow-sm"
                      : "text-[#171717]/60 hover:bg-[#FFFFFF] hover:text-[#171717]"
                  }`}
                  onClick={() => setActiveInterval(interval)}
                  type="button"
                >
                  {interval}h
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[26px] border border-[#171717]/8 bg-[linear-gradient(180deg,#FFFDF8_0%,#F8F2E7_100%)] p-4 transition-all duration-300 group-hover:border-white/35 group-hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.62)_0%,rgba(248,242,231,0.55)_100%)] group-hover:backdrop-blur-lg">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-poppins text-sm text-[#171717]/62">
                {summary
                  ? `${trendData.length} grouped window · interval ${activeInterval} saat`
                  : "Trend, aktif receiver filtresiyle yuklenecek"}
              </p>
              {summary ? (
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-poppins text-xs font-semibold ${averageTone.surface}`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Ortalama {formatScore(summary.overallAverageRating)}
                </div>
              ) : null}
            </div>

            {summaryQuery.isLoading ? (
              <div className="flex min-h-[320px] items-center justify-center">
                <LottieSpinner className="py-6" size={150} />
              </div>
            ) : summaryQuery.error ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[#FC7700]/20 bg-[#FC7700]/8 p-8 text-center">
                <div className="space-y-3">
                  <p className="font-righteous text-3xl text-[#171717]">
                    Veri yuklenemedi
                  </p>
                  <p className="font-poppins text-base text-[#A84E00]">
                    {formatApiError(summaryQuery.error)}
                  </p>
                </div>
              </div>
            ) : !hasRequestedFilters ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#171717]/18 bg-[#FFFFFF]/66 p-8 text-center">
                <div className="space-y-3">
                  <Activity className="mx-auto h-10 w-10 text-[#0057FF]/55" />
                  <p className="font-righteous text-3xl text-[#171717]">
                    Receiver sec ve dashboardu calistir
                  </p>
                  <p className="max-w-xl font-poppins text-base text-[#171717]/62">
                    En az bir `feedbackReceiverId` veya `feedbackReceiverIds`
                    parametresi olmadan API cagrisi yapilmaz.
                  </p>
                </div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-[#171717]/18 bg-[#FFFFFF]/66 p-8 text-center">
                <div className="space-y-3">
                  <BarChart3 className="mx-auto h-10 w-10 text-[#985DF8]/60" />
                  <p className="font-righteous text-3xl text-[#171717]">
                    Trend verisi yok
                  </p>
                  <p className="max-w-xl font-poppins text-base text-[#171717]/62">
                    API gecerli yanit dondu ancak `hourlyRatings` bos geldi.
                    Tasarim geregi bos trend durumu render edildi.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[320px]">
                <TrendChart
                  data={trendData}
                  maxDomainValue={chartMaxValue}
                  maxRating={maxRating}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </FeedbackPageShell>
  );
}

export default function FeedbackAnalyticsPage() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsPageContent />
    </QueryClientProvider>
  );
}
