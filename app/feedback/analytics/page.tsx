"use client";

import { type ReactNode, startTransition, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Gauge,
  RefreshCw,
  Sparkles,
  Users,
} from "lucide-react";
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

function FeedbackPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen min-h-[100dvh]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[url('/bg-df.png')] bg-cover bg-center bg-no-repeat"
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
      text: "text-emerald-500",
      surface: "bg-emerald-50 text-emerald-700",
      fill: "#DDF7E8",
      line: "#1FA463",
      dot: "#2BC46F",
    };
  }

  if (ratio >= 0.7) {
    return {
      text: "text-amber-500",
      surface: "bg-amber-50 text-amber-700",
      fill: "#FFF1D9",
      line: "#E4A11A",
      dot: "#F5A623",
    };
  }

  if (ratio >= 0.55) {
    return {
      text: "text-orange-500",
      surface: "bg-orange-50 text-orange-700",
      fill: "#FFE4DB",
      line: "#E8663A",
      dot: "#FF7B54",
    };
  }

  return {
    text: "text-rose-500",
    surface: "bg-rose-50 text-rose-700",
    fill: "#FFE1E3",
    line: "#D84B5B",
    dot: "#FF6B7A",
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
    <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white/95 p-6 shadow-sm">
      <div
        className={`absolute inset-x-0 top-0 h-1 ${
          accent === "orange"
            ? "bg-gradient-to-r from-[#EC692B] via-[#FF7B54] to-[#FFC2AE]"
            : "bg-gradient-to-r from-primary via-blue-500 to-[#6EC7FF]"
        }`}
      />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-description-gray">
            {title}
          </p>
          <p className="mt-3 font-righteous text-5xl leading-none text-title-black">
            {value}
          </p>
        </div>
        <div
          className={`rounded-2xl p-3 ${
            accent === "orange" ? "bg-[#FFF1EA] text-[#EC692B]" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </div>
      </div>
      <p className="font-poppins text-sm text-text-description-gray">{subtitle}</p>
    </article>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
  maxRating,
}: {
  active?: boolean;
  payload?: Array<{ payload: GroupedRatingWindow }>;
  label?: string;
  maxRating: number;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0].payload;

  return (
    <div className="rounded-2xl border border-[#21386D] bg-[#142347] px-4 py-3 text-white shadow-2xl">
      <p className="font-poppins text-xs uppercase tracking-[0.2em] text-white/55">
        {label}
      </p>
      <p className="mt-2 font-righteous text-3xl leading-none">
        {formatScore(point.averageRating)}
      </p>
      <div className="mt-2 space-y-1 font-poppins text-sm text-white/80">
        <p>{`Ortalama puan / ${formatScore(maxRating)}`}</p>
        <p>{`${point.totalFeedbacks} geri bildirim`}</p>
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
            <stop offset="0%" stopColor="#0057FF" stopOpacity={0.24} />
            <stop offset="100%" stopColor="#0057FF" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#E8ECF4" strokeDasharray="3 3" vertical={false} />
        <XAxis
          axisLine={false}
          dataKey="label"
          minTickGap={18}
          tick={{ fill: "#6B7280", fontFamily: "var(--font-poppins)", fontSize: 11 }}
          tickLine={false}
        />
        <YAxis
          axisLine={false}
          domain={[0, maxDomainValue]}
          tick={{ fill: "#6B7280", fontFamily: "var(--font-poppins)", fontSize: 11 }}
          tickFormatter={(value: number) => value.toFixed(1)}
          tickLine={false}
          width={42}
        />
        <Tooltip
          content={<TrendTooltip maxRating={maxRating} />}
          cursor={{ stroke: "#D3DCF0", strokeDasharray: "4 4" }}
        />
        <Area
          dataKey="averageRating"
          fill="url(#trendFill)"
          stroke="none"
          type="monotone"
        />
        <Line
          activeDot={{ fill: "#0057FF", r: 6, stroke: "#FFFFFF", strokeWidth: 3 }}
          dataKey="averageRating"
          dot={({ cx, cy, payload }) => {
            if (typeof cx !== "number" || typeof cy !== "number") return null;
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
    <div className="flex items-center gap-4 rounded-2xl bg-white/6 px-4 py-4 transition-colors hover:bg-white/10">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF7B54]/20 font-poppins text-xs font-semibold text-[#FFB59B]">
        {question.order}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-poppins text-sm leading-6 text-white/85">
          {question.questionText}
        </p>
        <p className="mt-1 font-poppins text-xs uppercase tracking-[0.18em] text-white/35">
          {question.totalFeedbacks} yanit
        </p>
      </div>
      <div className="hidden w-20 shrink-0 rounded-full bg-white/10 md:block">
        <div
          className="h-1.5 rounded-full transition-[width] duration-700"
          style={{ width, backgroundColor: tone.dot }}
        />
      </div>
      <p className={`w-14 shrink-0 text-right font-righteous text-3xl ${tone.text}`}>
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
  const [activeInterval, setActiveInterval] = useState<DashboardIntervalHours>(5);

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
  const trendData = summary ? groupHourlyRatings(summary.hourlyRatings, activeInterval) : [];
  const cultureQuestions = summary?.cultureScore.questions || [];
  const chartMaxValue = Math.max(
    maxRating,
    ...trendData.map((item) => item.averageRating),
  );
  const averageTone = getScoreTone(summary?.overallAverageRating ?? 0, maxRating);
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
        <header className="rounded-2xl border border-gray-200 bg-white/95 p-5 shadow-sm sm:p-6">
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
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Feedback Analytics
                </div>
                <div className="space-y-1">
                  <h1 className="font-righteous text-3xl text-title-black sm:text-4xl">
                    UP Pulse Dashboard
                  </h1>
                  <p className="max-w-3xl font-poppins text-base text-text-description-gray sm:text-lg">
                    `GET /dashboard/summary` yanitini dogrudan kullanir. KPI
                    kartlari, trend grafigi ve culture score bu sayfada backend
                    kontratina gore render edilir.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <p className="font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                  Endpoint
                </p>
                <p className="mt-2 font-righteous text-2xl text-title-black">
                  /dashboard/summary
                </p>
              </div>
              <div className="rounded-2xl border border-[#EC692B]/15 bg-[#FFF4ED] p-4">
                <p className="font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-[#EC692B]">
                  Active filters
                </p>
                <p className="mt-2 font-righteous text-2xl text-title-black">
                  {filters.receiverIds.length}
                </p>
                <p className="mt-1 font-poppins text-sm text-text-description-gray">
                  Receiver ID
                </p>
              </div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-text-description-gray">
                Receiver Filter
              </p>
              <h2 className="mt-2 font-righteous text-3xl text-title-black">
                Dashboard verisini receiver bazinda getir
              </h2>
              <p className="mt-2 max-w-2xl font-poppins text-base text-text-description-gray">
                Bir veya birden fazla UUID gir. Sayfa `feedbackReceiverId` ve
                `feedbackReceiverIds` query parametrelerini destekler, duplicate
                degerleri temizler.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 font-poppins text-sm text-text-description-gray">
              <Users className="h-4 w-4 text-primary" />
              {filters.receiverIds.length > 0
                ? `${filters.receiverIds.length} receiver secili`
                : "Receiver secilmedi"}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <textarea
              className="min-h-28 w-full rounded-2xl border border-gray-300 bg-white p-4 font-poppins text-base text-title-black outline-none transition-colors placeholder:text-gray-400 focus:border-primary"
              onChange={(event) => setReceiverInput(event.target.value)}
              placeholder="UUID gir veya birden fazla UUID icin virgulle ayir"
              value={receiverInput}
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-poppins text-sm text-text-description-gray">
                Ornek: <code>feedbackReceiverId=&lt;uuid&gt;</code> veya{" "}
                <code>feedbackReceiverIds=&lt;uuid1&gt;,&lt;uuid2&gt;</code>
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 font-poppins text-sm font-semibold text-title-black transition-colors hover:border-primary hover:text-primary"
                  onClick={clearFilters}
                  type="button"
                >
                  Temizle
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-2 font-poppins text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
                  onClick={applyFilters}
                  type="button"
                >
                  <RefreshCw className="h-4 w-4" />
                  Analitigi getir
                </button>
              </div>
            </div>

            {filters.receiverIds.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {filters.receiverIds.map((receiverId) => (
                  <span
                    key={receiverId}
                    className={`rounded-full px-3 py-1 font-poppins text-xs font-semibold ${
                      filters.invalidReceiverIds.includes(receiverId)
                        ? "bg-red-50 text-red-700"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {receiverId}
                  </span>
                ))}
              </div>
            ) : null}

            {hasInvalidFilters ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  <div>
                    <p className="font-poppins text-sm font-semibold text-red-700">
                      Gecersiz receiver ID bulundu
                    </p>
                    <p className="mt-1 font-poppins text-sm text-red-600">
                      {filters.invalidReceiverIds.join(", ")}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

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

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-text-description-gray">
                Rating Trend
              </p>
              <h2 className="mt-2 font-righteous text-3xl text-title-black">
                Saatlik rating bucketlari UI tarafinda gruplanir
              </h2>
              <p className="mt-2 font-poppins text-base text-text-description-gray">
                Secili interval ham `hourlyRatings` uzerinden hesaplanir. Her
                pencere weighted average ve toplam feedback sayisini gosterir.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-gray-100 p-2">
              <span className="px-2 font-poppins text-xs font-semibold uppercase tracking-[0.22em] text-text-description-gray">
                Interval
              </span>
              {DASHBOARD_INTERVALS.map((interval) => (
                <button
                  key={interval}
                  className={`rounded-xl px-4 py-2 font-poppins text-sm font-semibold transition-colors ${
                    activeInterval === interval
                      ? "bg-title-black text-white shadow-sm"
                      : "text-text-description-gray hover:bg-white hover:text-title-black"
                  }`}
                  onClick={() => setActiveInterval(interval)}
                  type="button"
                >
                  {interval}h
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-[#F7F9FD] p-4">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-poppins text-sm text-text-description-gray">
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
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
                <div className="space-y-3">
                  <p className="font-righteous text-3xl text-title-black">
                    Veri yuklenemedi
                  </p>
                  <p className="font-poppins text-base text-red-700">
                    {formatApiError(summaryQuery.error)}
                  </p>
                </div>
              </div>
            ) : !hasRequestedFilters ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 p-8 text-center">
                <div className="space-y-3">
                  <Activity className="mx-auto h-10 w-10 text-primary/50" />
                  <p className="font-righteous text-3xl text-title-black">
                    Receiver sec ve dashboardu calistir
                  </p>
                  <p className="max-w-xl font-poppins text-base text-text-description-gray">
                    En az bir `feedbackReceiverId` veya
                    `feedbackReceiverIds` parametresi olmadan API cagrisi
                    yapilmaz.
                  </p>
                </div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white/70 p-8 text-center">
                <div className="space-y-3">
                  <BarChart3 className="mx-auto h-10 w-10 text-primary/50" />
                  <p className="font-righteous text-3xl text-title-black">
                    Trend verisi yok
                  </p>
                  <p className="max-w-xl font-poppins text-base text-text-description-gray">
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

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(140deg,#0F1A33_0%,#18305E_54%,#244073_100%)] p-5 text-white shadow-[0_20px_50px_rgba(15,26,51,0.18)] sm:p-6">
          <div className="relative">
            <div className="absolute right-[-72px] top-[-120px] h-72 w-72 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute bottom-[-100px] left-[12%] h-56 w-56 rounded-full bg-[#EC692B]/10 blur-2xl" />

            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-poppins text-xs font-semibold uppercase tracking-[0.24em] text-white/45">
                    YGA Culture Score
                  </p>
                  <h2 className="mt-2 font-righteous text-3xl text-white sm:text-4xl">
                    Culture Score
                  </h2>
                  <p className="mt-2 max-w-2xl font-poppins text-base text-white/65">
                    Backend sirasini korur. UI ek sort yapmaz, yalnizca
                    sorulari geldigi duzende gosterir.
                  </p>
                </div>
                <div className="sm:text-right">
                  <div className={`font-righteous text-6xl leading-none ${cultureTone.text}`}>
                    {summary
                      ? formatScore(summary.cultureScore.overallAverageRating)
                      : "0.00"}
                  </div>
                  <p className="mt-2 font-poppins text-sm uppercase tracking-[0.22em] text-white/35">
                    / {formatScore(summary?.cultureScore.maxRating ?? 4)} overall
                  </p>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {!hasRequestedFilters ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <p className="font-poppins text-base text-white/72">
                    Culture score bolumu receiver secildiginde dolacak.
                  </p>
                </div>
              ) : cultureQuestions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  <p className="font-poppins text-base text-white/72">
                    API bos culture score dondu. Bu durumda bos state render edilir.
                  </p>
                </div>
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
