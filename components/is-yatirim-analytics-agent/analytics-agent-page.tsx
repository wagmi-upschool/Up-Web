"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleStop,
  Database,
  ListFilter,
  LoaderCircle,
  Play,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import MessageRenderer from "@/components/messages/MessageRenderer";
import {
  AnalyticsCard,
  AnalyticsDashboardBody,
  AnalyticsDashboardHeader,
  AnalyticsDashboardPageShell,
  AnalyticsSectionHeading,
  AnalyticsSegmentedToggle,
} from "@/components/analytics-dashboard/dashboard-shell";
import ProTracePanel, {
  type AgentTraceEntry,
} from "@/components/is-yatirim-analytics-agent/pro-trace-panel";
import {
  consumeAgentNdjsonStream,
  type AgentStreamEvent,
} from "@/lib/isYatirimAgentStream";
import { isAllowedIsYatirimAgentIdentity } from "@/lib/isYatirimAgentAccess";
import type { AgentViewMode } from "@/lib/isYatirimAgentMode";
import {
  loadSuiteSnapshot,
  saveSuiteSnapshot,
} from "@/lib/isYatirimSuiteStorage";
import { IS_YATIRIM_AGENT_FEATURE_FLAGS } from "@/lib/isYatirimAgentFeatureFlags";

type UiStatus =
  | "idle"
  | "connecting"
  | "streaming"
  | "complete"
  | "cancelled"
  | "error";

type AccessStatus = "checking" | "allowed" | "denied";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type SuiteResult = {
  status: "running" | "passed" | "failed";
  durationMs?: number;
  error?: string;
  response?: string;
  toolCallCount?: number;
  agentDurationMs?: number;
};

type LiveSuiteMessage = {
  catalogIndex: number;
  userMessageId: string;
  assistantMessageId: string;
  accumulated: string;
};

type QuestionCategory = "daily" | "weekly" | "combined" | "comment";
type SuiteMode = "catalog" | "parameterized";

type PersistedSuitePreferences = {
  mode: SuiteMode;
  questionIndex: number;
  startDate: string;
  endDate: string;
  scores: number[];
};

const SUITE_PREFERENCES_KEY = "is-yatirim-agent:suite-preferences:v2";
const DEFAULT_PARAMETERIZED_QUESTION_INDEX = 23;

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultParameterizedRange() {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 2);
  return { start: dateInputValue(start), end: dateInputValue(end) };
}

function datesInRange(startValue: string, endValue: string) {
  const start = new Date(`${startValue}T00:00:00Z`);
  const end = new Date(`${endValue}T00:00:00Z`);
  if (
    !startValue ||
    !endValue ||
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return [];
  }
  const dates: Date[] = [];
  const cursor = new Date(start);
  while (cursor <= end && dates.length < 31) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function parameterizedPrompt(
  basePrompt: string,
  dateLabel: string,
  moodScore: number,
) {
  return `${dateLabel} ve ruh hali ${moodScore} filtresiyle "${basePrompt}" sorusunu yanıtla. Sorudaki göreli tarih ve ruh hali ifadeleri yerine bu parametreleri kullan.`;
}

const QUESTION_CATALOG: Array<{
  category: QuestionCategory;
  prompt: string;
}> = [
  { category: "daily", prompt: "Bugünkü genel ruh hali nasıl?" },
  { category: "daily", prompt: "En güncel ankette katılım oranı nedir?" },
  { category: "daily", prompt: "17 Temmuz 2026 tarihinde mood dağılımı nasıldı?" },
  { category: "daily", prompt: "6–19 Temmuz 2026 arasında ruh hali nasıl değişti?" },
  { category: "daily", prompt: "Düşük ruh hali oranı nedir?" },
  { category: "daily", prompt: "Mood skoru önceki güne göre arttı mı?" },
  { category: "daily", prompt: "En sık tekrarlanan aggregate kelimeler neler?" },
  { category: "daily", prompt: "Yönetim segmentinin son günlük sonucu nasıl?" },
  { category: "daily", prompt: "İç Sistemler segmentinin bu haftaki günlük trendini göster." },
  { category: "daily", prompt: "Segmentler arasında mood karşılaştırması yap." },
  { category: "weekly", prompt: "Geçen haftanın pulse sonucu nasıldı?" },
  { category: "weekly", prompt: "Geçen haftanın katılımı önceki haftaya göre değişti mi?" },
  { category: "weekly", prompt: "Son dört haftalık katılım trendi nedir?" },
  { category: "weekly", prompt: "Son dört haftada hangi temalar öne çıktı?" },
  { category: "weekly", prompt: "Geçen hafta çalışanların en çok deneyimlediği tema hangisiydi?" },
  { category: "weekly", prompt: "Geçen hafta en çok deneyimlenmek istenen tema neydi?" },
  { category: "weekly", prompt: "Geçen hafta beklenti ile deneyim arasındaki en büyük fark hangisiydi?" },
  { category: "weekly", prompt: "Geçen haftanın takdir göstergesi önceki haftaya göre nasıl değişti?" },
  { category: "weekly", prompt: "13 Temmuz 2026 haftasının sonucunu özetle." },
  { category: "weekly", prompt: "Yönetim segmentinin geçen haftaki pulse sonucunu yorumla." },
  { category: "combined", prompt: "Günlük mood ile geçen haftaki pulse sonucunu karşılaştır." },
  { category: "combined", prompt: "Katılım düşerken haftalık beklenti farklarında değişiklik olmuş mu?" },
  { category: "combined", prompt: "Son günlük ruh hali ile son dört haftalık pulse trendi uyumlu mu?" },
  { category: "comment", prompt: "Dün ruh hali 1 olanların tüm yorumlarını paylaş." },
  { category: "comment", prompt: "GMY Burak Kınalılar'ın ekibinde duygu durumu 2'nin altında olan çalışanların konuştuğu konu başlıkları nedir?" },
  { category: "comment", prompt: "GMY Evren Arslan'a bağlı çalışanların en çok bahsettiği kelimeler neler?" },
  { category: "comment", prompt: "GMY Fatih Mehmet Yılmaz'ın ekibinde son 1 ayda mobbing ile ilgili kaç yorum var?" },
  { category: "comment", prompt: "Duygu durumu 3'ün altında olan tüm çalışanların en sık kullandığı 10 kelime nedir?" },
  { category: "comment", prompt: "Duygu durumu 1-2 arasında olan çalışanlar hangi konulardan şikayetçi?" },
  { category: "comment", prompt: "Skoru 4 ve üzeri olan çalışanların hangi konularda takdir ifade ettiğini gösterir misin?" },
  { category: "comment", prompt: "Mobbing konu başlığı altında geçen yorumların hangi departmanlarda yoğunlaştığını göster." },
  { category: "comment", prompt: "Takdir ile ilgili yorumların GMY bazında dağılımı nedir?" },
  { category: "comment", prompt: "Tükenmişlik ile ilgili en çok geçen kelimeler hangileri?" },
  { category: "comment", prompt: "Son 30 günde 'yönetici' kelimesi kaç kez geçmiş?" },
  { category: "comment", prompt: "En az 5 kez tekrar eden kelimeler hangileri, hangi GMY'lerde yoğunlaşıyor?" },
  { category: "comment", prompt: "Hangi konu başlığı bu ay en çok tekrar etmiş (top 3)?" },
  { category: "comment", prompt: "Takdir ile ilgili en kısa yorumu getir." },
  { category: "comment", prompt: "En uzun yorumu getir." },
  { category: "comment", prompt: "En iyi yorumu getir." },
  { category: "comment", prompt: "Bu haftanın en kötü yorumunu getir." },
  { category: "comment", prompt: "Mobbing ile ilgili risk sinyali var mı?" },
  { category: "comment", prompt: "Benimle ilgili yorumları getir." },
  { category: "comment", prompt: "GMY Murat Kural'ın ekibinde duygu durumu 2'nin altında olup mobbing ile ilgili konuşan çalışan sayısı kaç?" },
  { category: "comment", prompt: "GMY Pınar Özyüksel'in ekibinde takdir konu başlığı altında en sık geçen kelimeler neler, kaç kez tekrar etmiş?" },
  { category: "comment", prompt: "Tüm GMY'ler arasında duygu durumu en düşük olan ekipte hangi konu başlıkları öne çıkıyor?" },
  { category: "comment", prompt: "Son 2 haftada GMY Serhat Devecioğlu'nun ekibinde duygu durumu düşüşü yaşayan çalışanların konu başlıkları neler?" },
  { category: "comment", prompt: "Bu çeyrekte mobbing konu başlığının GMY bazında trendi nasıl değişmiş?" },
];

const QUESTION_FILTERS: Array<{
  value: "all" | QuestionCategory;
  label: string;
}> = [
  { value: "all", label: "Tümü" },
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "combined", label: "Birleşik" },
  { value: "comment", label: "Yorumlar" },
];

const QUESTION_CATEGORY_LABELS: Record<QuestionCategory, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  combined: "Birleşik",
  comment: "Yorum",
};

const STATUS_LABELS: Record<UiStatus, string> = {
  idle: "Hazır",
  connecting: "Bağlanıyor",
  streaming: "Yanıt geliyor",
  complete: "Tamamlandı",
  cancelled: "İptal edildi",
  error: "Hata",
};

function streamErrorMessage(status: number, payload: unknown) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, any>;
    const message = record.error?.message || record.message;
    if (typeof message === "string") return message;
  }
  if (status === 401) return "Oturum doğrulanamadı. Lütfen yeniden giriş yapın.";
  if (status === 403) return "Bu analitik asistana erişim yetkiniz bulunmuyor.";
  return "Analitik asistan isteği başlatılamadı.";
}

export default function IsYatirimAnalyticsAgentPage() {
  const searchParams = useSearchParams();
  const proModeAvailable = searchParams.get("mode") === "pro";
  const [mode, setMode] = useState<AgentViewMode>(() =>
    proModeAvailable ? "pro" : "simple",
  );
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("checking");
  const [input, setInput] = useState("");
  const [questionFilter, setQuestionFilter] = useState<
    "all" | QuestionCategory
  >("all");
  const [questionSearch, setQuestionSearch] = useState("");
  const [questionsOpen, setQuestionsOpen] = useState(false);
  const [suiteMode, setSuiteMode] = useState<SuiteMode>("catalog");
  const [parameterizedQuestionIndex, setParameterizedQuestionIndex] = useState(
    DEFAULT_PARAMETERIZED_QUESTION_INDEX,
  );
  const [parameterizedStartDate, setParameterizedStartDate] = useState(
    () => defaultParameterizedRange().start,
  );
  const [parameterizedEndDate, setParameterizedEndDate] = useState(
    () => defaultParameterizedRange().end,
  );
  const [parameterizedScores, setParameterizedScores] = useState<number[]>([
    1, 2, 3, 4,
  ]);
  const [parameterizedConfigOpen, setParameterizedConfigOpen] = useState(true);
  const [suitePreferencesHydrated, setSuitePreferencesHydrated] =
    useState(false);
  const [suiteStorageReady, setSuiteStorageReady] = useState(false);
  const [suiteResults, setSuiteResults] = useState<Record<number, SuiteResult>>(
    {},
  );
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [viewingSuiteResultIndex, setViewingSuiteResultIndex] =
    useState<number>();
  const [liveSuiteIndex, setLiveSuiteIndex] = useState<number>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<UiStatus>("idle");
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [requestId, setRequestId] = useState<string>();
  const [traceEntries, setTraceEntries] = useState<AgentTraceEntry[]>([]);
  const [headerLatencyMs, setHeaderLatencyMs] = useState<number>();
  const [firstTokenMs, setFirstTokenMs] = useState<number>();
  const [requestDurationMs, setRequestDurationMs] = useState<number>();
  const [httpStatus, setHttpStatus] = useState<number>();
  const [terminalEvent, setTerminalEvent] = useState<
    Extract<AgentStreamEvent, { type: "done" }>
  >();
  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);
  const suiteAbortRef = useRef<AbortController | null>(null);
  const suiteStopRef = useRef(false);
  const viewingSuiteResultRef = useRef<number>();
  const liveSuiteMessageRef = useRef<LiveSuiteMessage>();
  const suiteStorageReadyKeyRef = useRef<string>();
  const suiteSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  const isRunning = status === "connecting" || status === "streaming";
  const questionsFeatureAvailable =
    mode === "pro" ||
    IS_YATIRIM_AGENT_FEATURE_FLAGS.simpleExampleQuestions;
  const parameterizedBaseQuestion =
    QUESTION_CATALOG[parameterizedQuestionIndex] ??
    QUESTION_CATALOG[DEFAULT_PARAMETERIZED_QUESTION_INDEX];
  const parameterizedQuestions = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
    return datesInRange(parameterizedStartDate, parameterizedEndDate).flatMap(
      (date) => {
        const dateLabel = `${formatter.format(date)} tarihinde`;
        return parameterizedScores.map((score) => ({
          category: parameterizedBaseQuestion.category,
          prompt: parameterizedPrompt(
            parameterizedBaseQuestion.prompt,
            dateLabel,
            score,
          ),
        }));
      },
    );
  }, [
    parameterizedBaseQuestion,
    parameterizedEndDate,
    parameterizedScores,
    parameterizedStartDate,
  ]);
  const activeSuiteQuestions =
    suiteMode === "catalog" ? QUESTION_CATALOG : parameterizedQuestions;
  const panelQuestions = mode === "pro" ? activeSuiteQuestions : QUESTION_CATALOG;
  const suiteStorageKey = useMemo(
    () =>
      suiteMode === "catalog"
        ? "catalog:v2"
        : [
            "parameterized:v2",
            parameterizedQuestionIndex,
            parameterizedStartDate,
            parameterizedEndDate,
            [...parameterizedScores].sort().join(","),
          ].join(":"),
    [
      parameterizedEndDate,
      parameterizedQuestionIndex,
      parameterizedScores,
      parameterizedStartDate,
      suiteMode,
    ],
  );

  useEffect(() => {
    try {
      const rawPreferences = window.localStorage.getItem(SUITE_PREFERENCES_KEY);
      if (rawPreferences) {
        const preferences = JSON.parse(
          rawPreferences,
        ) as Partial<PersistedSuitePreferences>;
        if (preferences.mode === "catalog" || preferences.mode === "parameterized") {
          setSuiteMode(preferences.mode);
        }
        if (
          Number.isInteger(preferences.questionIndex) &&
          Number(preferences.questionIndex) >= 0 &&
          Number(preferences.questionIndex) < QUESTION_CATALOG.length
        ) {
          setParameterizedQuestionIndex(Number(preferences.questionIndex));
        }
        if (typeof preferences.startDate === "string") {
          setParameterizedStartDate(preferences.startDate);
        }
        if (typeof preferences.endDate === "string") {
          setParameterizedEndDate(preferences.endDate);
        }
        if (Array.isArray(preferences.scores)) {
          const scores = preferences.scores.filter(
            (score): score is number =>
              typeof score === "number" && [1, 2, 3, 4].includes(score),
          );
          if (scores.length > 0) {
            setParameterizedScores(Array.from(new Set(scores)).sort());
          }
        }
      }
    } catch {
      // Corrupted preferences fall back to safe defaults.
    } finally {
      setSuitePreferencesHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!suitePreferencesHydrated) return;
    try {
      window.localStorage.setItem(
        SUITE_PREFERENCES_KEY,
        JSON.stringify({
          mode: suiteMode,
          questionIndex: parameterizedQuestionIndex,
          startDate: parameterizedStartDate,
          endDate: parameterizedEndDate,
          scores: parameterizedScores,
        } satisfies PersistedSuitePreferences),
      );
    } catch {
      // The suite remains usable when browser preference storage is unavailable.
    }
  }, [
    parameterizedEndDate,
    parameterizedQuestionIndex,
    parameterizedScores,
    parameterizedStartDate,
    suiteMode,
    suitePreferencesHydrated,
  ]);

  useEffect(() => {
    if (!suitePreferencesHydrated) return;
    let active = true;
    suiteStorageReadyKeyRef.current = undefined;
    setSuiteStorageReady(false);
    setSuiteResults({});
    viewingSuiteResultRef.current = undefined;
    liveSuiteMessageRef.current = undefined;
    setViewingSuiteResultIndex(undefined);
    setLiveSuiteIndex(undefined);

    void loadSuiteSnapshot<Record<number, SuiteResult>>(suiteStorageKey)
      .then((snapshot) => {
        if (!active) return;
        const completedResults = Object.fromEntries(
          Object.entries(snapshot ?? {}).filter(
            ([, result]) => result.status === "passed" || result.status === "failed",
          ),
        ) as Record<number, SuiteResult>;
        suiteStorageReadyKeyRef.current = suiteStorageKey;
        setSuiteResults(completedResults);
        setSuiteStorageReady(true);
      })
      .catch(() => {
        if (!active) return;
        suiteStorageReadyKeyRef.current = suiteStorageKey;
        setSuiteStorageReady(true);
      });

    return () => {
      active = false;
    };
  }, [suitePreferencesHydrated, suiteStorageKey]);

  useEffect(() => {
    if (suiteStorageReadyKeyRef.current !== suiteStorageKey) return;
    if (Object.values(suiteResults).some((result) => result.status === "running")) {
      return;
    }
    const completedResults = Object.fromEntries(
      Object.entries(suiteResults).filter(
        ([, result]) => result.status === "passed" || result.status === "failed",
      ),
    ) as Record<number, SuiteResult>;
    suiteSaveQueueRef.current = suiteSaveQueueRef.current
      .catch(() => undefined)
      .then(() => saveSuiteSnapshot(suiteStorageKey, completedResults));
  }, [suiteResults, suiteStorageKey]);

  useEffect(() => {
    setMode(proModeAvailable ? "pro" : "simple");
  }, [proModeAvailable]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(
    () => () => {
      suiteStopRef.current = true;
      suiteAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (mode === "simple") setQuestionsOpen(false);
  }, [mode]);

  useEffect(() => {
    let active = true;
    void fetchAuthSession()
      .then((session) => {
        if (!active) return;
        setAccessStatus(
          isAllowedIsYatirimAgentIdentity(session.tokens?.idToken?.payload)
            ? "allowed"
            : "denied",
        );
      })
      .catch(() => {
        if (active) setAccessStatus("denied");
      });
    return () => {
      active = false;
    };
  }, []);

  const updateAssistant = (id: string, content: string) => {
    setMessages((current) =>
      current.map((message) =>
        message.id === id ? { ...message, content } : message,
      ),
    );
  };

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    runningRef.current = false;
    setStatus("cancelled");
  };

  const authenticatedHeaders = async () => {
    const session = await fetchAuthSession();
    const { accessToken, idToken } = session.tokens ?? {};
    if (!idToken) {
      throw new Error("Oturum doğrulanamadı. Lütfen yeniden giriş yapın.");
    }
    if (!isAllowedIsYatirimAgentIdentity(idToken.payload)) {
      throw new Error("Bu analitik asistana erişim yetkiniz bulunmuyor.");
    }
    return {
      "Content-Type": "application/json",
      "x-id-token": idToken.toString(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  };

  const invokeSuiteQuestion = async (catalogIndex: number) => {
    const question = activeSuiteQuestions[catalogIndex];
    const controller = new AbortController();
    suiteAbortRef.current = controller;
    const startedAt = performance.now();
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    let accumulated = "";
    let sequence = 0;
    let firstTokenSeen = false;
    liveSuiteMessageRef.current = {
      catalogIndex,
      userMessageId,
      assistantMessageId,
      accumulated,
    };
    setLiveSuiteIndex(catalogIndex);

    setError("");
    setStatus("connecting");
    setTraceEntries([]);
    setHeaderLatencyMs(undefined);
    setFirstTokenMs(undefined);
    setRequestDurationMs(undefined);
    setHttpStatus(undefined);
    setTerminalEvent(undefined);
    if (viewingSuiteResultRef.current === undefined) {
      setMessages([
        { id: userMessageId, role: "user", content: question.prompt },
        { id: assistantMessageId, role: "assistant", content: "" },
      ]);
    }
    setSuiteResults((current) => ({
      ...current,
      [catalogIndex]: { status: "running" },
    }));

    try {
      const headers = await authenticatedHeaders();
      const response = await fetch("/api/is-yatirim/analytics-agent/chat/", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: question.prompt }),
        cache: "no-store",
        signal: controller.signal,
      });
      setHeaderLatencyMs(Math.round(performance.now() - startedAt));
      setHttpStatus(response.status);
      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(streamErrorMessage(response.status, payload));
      }
      if (!response.body) throw new Error("Stream yanıtı alınamadı.");

      const terminal = await consumeAgentNdjsonStream(
        response.body,
        (streamEvent) => {
          const elapsedMs = Math.round(performance.now() - startedAt);
          sequence += 1;
          const eventSequence = sequence;
          setTraceEntries((current) => [
            ...current,
            { sequence: eventSequence, elapsedMs, event: streamEvent },
          ]);
          switch (streamEvent.type) {
            case "meta":
              setRequestId(streamEvent.requestId);
              setConversationId(streamEvent.conversationId);
              break;
            case "status":
              setStatus("streaming");
              break;
            case "delta":
              if (!firstTokenSeen) {
                firstTokenSeen = true;
                setFirstTokenMs(elapsedMs);
              }
              accumulated += streamEvent.content;
              if (liveSuiteMessageRef.current?.catalogIndex === catalogIndex) {
                liveSuiteMessageRef.current.accumulated = accumulated;
              }
              if (viewingSuiteResultRef.current === undefined) {
                updateAssistant(assistantMessageId, accumulated);
              }
              setStatus("streaming");
              break;
            case "done":
              accumulated = streamEvent.response || accumulated;
              if (liveSuiteMessageRef.current?.catalogIndex === catalogIndex) {
                liveSuiteMessageRef.current.accumulated = accumulated;
              }
              if (viewingSuiteResultRef.current === undefined) {
                updateAssistant(assistantMessageId, accumulated);
              }
              setTerminalEvent(streamEvent);
              setRequestDurationMs(elapsedMs);
              setStatus("complete");
              break;
            case "error":
              if (liveSuiteMessageRef.current?.catalogIndex === catalogIndex) {
                liveSuiteMessageRef.current.accumulated = streamEvent.message;
              }
              if (viewingSuiteResultRef.current === undefined) {
                updateAssistant(assistantMessageId, streamEvent.message);
              }
              setRequestDurationMs(elapsedMs);
              setStatus("error");
              break;
            case "heartbeat":
              break;
          }
        },
        controller.signal,
      );
      if (terminal.type === "error") throw new Error(terminal.message);
      setSuiteResults((current) => ({
        ...current,
        [catalogIndex]: {
          status: "passed",
          durationMs: Math.round(performance.now() - startedAt),
          response: terminal.response,
          toolCallCount: terminal.toolCalls.length,
          agentDurationMs: terminal.observability?.totalDurationMs,
        },
      }));
    } catch (caught) {
      const wasStopped = controller.signal.aborted && suiteStopRef.current;
      const message = wasStopped
        ? "Çalıştırma durduruldu."
        : caught instanceof Error
          ? caught.message
          : "Senaryo tamamlanamadı.";
      if (liveSuiteMessageRef.current?.catalogIndex === catalogIndex) {
        liveSuiteMessageRef.current.accumulated = message;
      }
      if (viewingSuiteResultRef.current === undefined) {
        updateAssistant(assistantMessageId, message);
      }
      setRequestDurationMs(Math.round(performance.now() - startedAt));
      setStatus(wasStopped ? "cancelled" : "error");
      setSuiteResults((current) => ({
        ...current,
        [catalogIndex]: {
          status: "failed",
          durationMs: Math.round(performance.now() - startedAt),
          error: message,
        },
      }));
    } finally {
      if (suiteAbortRef.current === controller) suiteAbortRef.current = null;
    }
  };

  const runSingleSuiteQuestion = async (catalogIndex: number) => {
    if (suiteRunning || !suiteStorageReady) return;
    if (suiteMode === "parameterized") setParameterizedConfigOpen(false);
    viewingSuiteResultRef.current = undefined;
    setViewingSuiteResultIndex(undefined);
    suiteStopRef.current = false;
    setSuiteRunning(true);
    try {
      await invokeSuiteQuestion(catalogIndex);
    } finally {
      setSuiteRunning(false);
    }
  };

  const runFullSuite = async () => {
    if (suiteRunning || !suiteStorageReady) return;
    if (suiteMode === "parameterized") setParameterizedConfigOpen(false);
    viewingSuiteResultRef.current = undefined;
    setViewingSuiteResultIndex(undefined);
    suiteStopRef.current = false;
    setSuiteResults({});
    setSuiteRunning(true);
    try {
      for (let index = 0; index < activeSuiteQuestions.length; index += 1) {
        if (suiteStopRef.current) break;
        await invokeSuiteQuestion(index);
        if (!suiteStopRef.current && index < activeSuiteQuestions.length - 1) {
          await new Promise((resolve) => window.setTimeout(resolve, 5_000));
        }
      }
    } finally {
      setSuiteRunning(false);
    }
  };

  const stopSuite = () => {
    suiteStopRef.current = true;
    suiteAbortRef.current?.abort();
  };

  const showSuiteResponse = (catalogIndex: number) => {
    const question = activeSuiteQuestions[catalogIndex];
    const result = suiteResults[catalogIndex];
    if (!question || !result || result.status === "running") return;

    const response =
      result.response ?? result.error ?? "Bu senaryo için yanıt içeriği bulunamadı.";
    viewingSuiteResultRef.current = catalogIndex;
    setViewingSuiteResultIndex(catalogIndex);
    setMessages([
      { id: crypto.randomUUID(), role: "user", content: question.prompt },
      { id: crypto.randomUUID(), role: "assistant", content: response },
    ]);
    if (!suiteRunning) {
      setStatus(result.status === "passed" ? "complete" : "error");
    }
    setError("");
    setQuestionsOpen(false);
  };

  const returnToLiveSuite = () => {
    const live = liveSuiteMessageRef.current;
    if (!live) return;
    const question = activeSuiteQuestions[live.catalogIndex];
    if (!question) return;
    viewingSuiteResultRef.current = undefined;
    setViewingSuiteResultIndex(undefined);
    setMessages([
      { id: live.userMessageId, role: "user", content: question.prompt },
      {
        id: live.assistantMessageId,
        role: "assistant",
        content: live.accumulated,
      },
    ]);
    setStatus(suiteRunning ? "streaming" : "complete");
  };

  const selectExampleQuestion = (prompt: string) => {
    setInput(prompt);
    setQuestionsOpen(false);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    const message = input.trim();
    if (!message || runningRef.current || suiteRunning) return;

    const controller = new AbortController();
    runningRef.current = true;
    abortRef.current?.abort();
    abortRef.current = controller;
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    let accumulated = "";
    const startedAt = performance.now();
    let sequence = 0;
    let firstTokenSeen = false;

    setInput("");
    setError("");
    setStatus("connecting");
    setTraceEntries([]);
    setHeaderLatencyMs(undefined);
    setFirstTokenMs(undefined);
    setRequestDurationMs(undefined);
    setHttpStatus(undefined);
    setTerminalEvent(undefined);
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content: message },
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const headers = await authenticatedHeaders();

      const response = await fetch("/api/is-yatirim/analytics-agent/chat/", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message,
          ...(conversationId ? { conversationId } : {}),
        }),
        cache: "no-store",
        signal: controller.signal,
      });

      setHeaderLatencyMs(Math.round(performance.now() - startedAt));
      setHttpStatus(response.status);

      if (!response.ok) {
        let payload: unknown = null;
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
        throw new Error(streamErrorMessage(response.status, payload));
      }
      if (!response.body) throw new Error("Stream yanıtı alınamadı.");

      await consumeAgentNdjsonStream(
        response.body,
        (streamEvent: AgentStreamEvent) => {
          const elapsedMs = Math.round(performance.now() - startedAt);
          sequence += 1;
          const eventSequence = sequence;
          setTraceEntries((current) => [
            ...current,
            { sequence: eventSequence, elapsedMs, event: streamEvent },
          ]);
          switch (streamEvent.type) {
            case "meta":
              setConversationId(streamEvent.conversationId);
              setRequestId(streamEvent.requestId);
              break;
            case "status":
              setStatus("streaming");
              break;
            case "delta":
              if (!firstTokenSeen) {
                firstTokenSeen = true;
                setFirstTokenMs(elapsedMs);
              }
              accumulated += streamEvent.content;
              updateAssistant(assistantMessageId, accumulated);
              setStatus("streaming");
              break;
            case "done":
              accumulated = streamEvent.response || accumulated;
              updateAssistant(assistantMessageId, accumulated);
              setTerminalEvent(streamEvent);
              setRequestDurationMs(elapsedMs);
              setStatus("complete");
              break;
            case "error":
              setError(streamEvent.message);
              setRequestDurationMs(elapsedMs);
              setStatus("error");
              break;
            case "heartbeat":
              break;
          }
        },
        controller.signal,
      );
    } catch (caught) {
      if (controller.signal.aborted) {
        setRequestDurationMs(Math.round(performance.now() - startedAt));
        setStatus("cancelled");
      } else {
        const messageText =
          caught instanceof Error
            ? caught.message
            : "Analitik asistan yanıt veremedi.";
        setError(messageText);
        setRequestDurationMs(Math.round(performance.now() - startedAt));
        setStatus("error");
      }
    } finally {
      runningRef.current = false;
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  if (accessStatus !== "allowed") {
    return (
      <AnalyticsDashboardPageShell>
        <AnalyticsDashboardHeader
          brandLabel="İş Yatırım Agent"
          companies={[{ id: "is-yatirim", slug: "is-yatirim", label: "İş Yatırım" }]}
          dashboardLabel=""
          isUpdating={false}
          onCompanySelect={() => undefined}
          selectedCompany="is-yatirim"
        />
        <AnalyticsDashboardBody>
          <AnalyticsCard className="py-20">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#0057FF]/10 text-[#0057FF]">
                {accessStatus === "checking" ? (
                  <span className="h-7 w-7 animate-spin rounded-full border-2 border-[#0057FF]/25 border-t-[#0057FF]" />
                ) : (
                  <UserRound className="h-7 w-7" />
                )}
              </div>
              <h1 className="font-righteous text-3xl text-[#171717]">
                {accessStatus === "checking"
                  ? "Erişim doğrulanıyor"
                  : "Bu sayfaya erişim yetkiniz yok"}
              </h1>
              <p className="mt-3 font-poppins text-sm leading-6 text-[#171717]/60">
                {accessStatus === "checking"
                  ? "Cognito oturumunuz güvenli şekilde kontrol ediliyor."
                  : "İş Yatırım analitik asistanı yalnızca yetkilendirilmiş kullanıcılar tarafından kullanılabilir."}
              </p>
            </div>
          </AnalyticsCard>
        </AnalyticsDashboardBody>
      </AnalyticsDashboardPageShell>
    );
  }

  return (
    <AnalyticsDashboardPageShell>
      <div
        className={`transition-[padding] duration-300 ease-out ${
          questionsOpen ? "xl:pr-[520px]" : ""
        }`}
      >
      <AnalyticsDashboardHeader
        brandLabel="İş Yatırım Agent"
        companies={[{ id: "is-yatirim", slug: "is-yatirim", label: "İş Yatırım" }]}
        dashboardLabel=""
        isUpdating={false}
        onCompanySelect={() => undefined}
        selectedCompany="is-yatirim"
      />
      <AnalyticsDashboardBody>
        <AnalyticsSectionHeading>Yapay zekâ destekli analiz</AnalyticsSectionHeading>
        <AnalyticsCard className="min-h-[680px]">
          <div className="flex min-h-[630px] flex-col">
            <div className="flex flex-col gap-3 border-b border-[#171717]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#0057FF]" />
                  <h1 className="font-righteous text-2xl text-[#171717] sm:text-3xl">
                    İş Yatırım Agent
                  </h1>
                </div>
                <p className="mt-2 font-poppins text-sm text-[#171717]/60">
                  Günlük, haftalık ve yorum analizlerini doğal dille sorgulayın.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 self-start sm:justify-end">
                {viewingSuiteResultIndex !== undefined &&
                liveSuiteIndex !== undefined &&
                viewingSuiteResultIndex !== liveSuiteIndex ? (
                  <button
                    className="inline-flex h-[58px] items-center gap-2 rounded-2xl border border-[#00A890]/20 bg-[#00A890]/8 px-4 font-poppins text-xs font-semibold text-[#007D6B] transition-colors hover:bg-[#00A890]/12"
                    onClick={returnToLiveSuite}
                    type="button"
                  >
                    <LoaderCircle className={`h-4 w-4 ${suiteRunning ? "animate-spin" : ""}`} />
                    {suiteRunning ? "Canlı suite’e dön" : "Son case’e dön"}
                  </button>
                ) : null}
                {questionsFeatureAvailable ? (
                <button
                  className="inline-flex h-[58px] items-center gap-2 rounded-2xl border border-[#171717]/8 bg-white/75 px-4 font-poppins text-xs font-semibold text-[#171717]/65 transition-colors hover:border-[#0057FF]/25 hover:text-[#0057FF]"
                  onClick={() => setQuestionsOpen(true)}
                  type="button"
                >
                  <ListFilter className="h-4 w-4" />
                  {mode === "pro" ? "Test Suite" : "Örnek Sorular"}
                </button>
                ) : null}
                {proModeAvailable ? (
                  <AnalyticsSegmentedToggle
                    onChange={(value) => setMode(value as AgentViewMode)}
                    options={[
                      { value: "simple", label: "Simple" },
                      { value: "pro", label: "Pro" },
                    ]}
                    value={mode}
                  />
                ) : null}
                <div className="flex items-center gap-2 rounded-full border border-[#171717]/10 bg-[#F8F2E7] px-3 py-2 font-poppins text-xs font-semibold text-[#171717]/65">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isRunning ? "animate-pulse bg-[#0057FF]" : status === "error" ? "bg-[#FC7700]" : "bg-[#00A890]"
                    }`}
                  />
                  {STATUS_LABELS[status]}
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-5 overflow-y-auto py-6">
              {messages.length === 0 ? (
                <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center py-12 text-center">
                  <div className="mb-5 rounded-[28px] bg-[#0057FF]/10 p-5 text-[#0057FF]">
                    <Bot className="h-9 w-9" />
                  </div>
                  <h2 className="font-righteous text-3xl text-[#171717]">
                    Veriyi birlikte yorumlayalım
                  </h2>
                  <p className="mt-3 max-w-lg font-poppins text-sm leading-6 text-[#171717]/60">
                    {mode === "pro"
                      ? "Test Suite panelinden doğrulanmış senaryoları çalıştırın veya kendi analitik sorunuzu yazın."
                      : "Analitik sorunuzu yazın; yanıt canlı olarak görüntülensin."}
                  </p>
                  {questionsFeatureAvailable ? (
                  <button
                    className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#171717] px-5 py-3 font-poppins text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
                    onClick={() => setQuestionsOpen(true)}
                    type="button"
                  >
                    <ListFilter className="h-4 w-4" />
                    {mode === "pro"
                      ? "Test Suite’i aç"
                      : "Örnek soruları görüntüle"}
                  </button>
                  ) : null}
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    key={message.id}
                  >
                    {message.role === "assistant" ? (
                      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#0057FF]/10 text-[#0057FF]">
                        <Bot className="h-4 w-4" />
                      </span>
                    ) : null}
                    <div
                      className={`max-w-[85%] rounded-[24px] px-5 py-4 shadow-sm sm:max-w-[72%] ${
                        message.role === "user"
                          ? "bg-[#171717] text-white"
                          : "border border-[#171717]/8 bg-[#F8F2E7] text-[#171717]"
                      }`}
                    >
                      {message.content ? (
                        <MessageRenderer
                          content={message.content}
                          role={message.role === "user" ? "user" : "assistant"}
                          sender={message.role === "user" ? "user" : "ai"}
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 py-1">
                          {[0, 1, 2].map((dot) => (
                            <i
                              className="h-2 w-2 animate-bounce rounded-full bg-[#0057FF]/60"
                              key={dot}
                              style={{ animationDelay: `${dot * 120}ms` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                    {message.role === "user" ? (
                      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[#171717] text-white">
                        <UserRound className="h-4 w-4" />
                      </span>
                    ) : null}
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>

            {error ? (
              <div className="mb-4 rounded-2xl border border-[#FC7700]/25 bg-[#FC7700]/10 px-4 py-3 font-poppins text-sm text-[#8B4700]">
                {error}
              </div>
            ) : null}

            <form className="border-t border-[#171717]/10 pt-5" onSubmit={submit}>
              <div className="flex items-end gap-3 rounded-[26px] border border-[#171717]/10 bg-white/80 p-3 shadow-[0_14px_36px_rgba(23,23,23,0.07)] focus-within:border-[#0057FF]/30">
                <textarea
                  aria-label="Analitik sorunuzu yazın"
                  className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-2 py-3 font-poppins text-sm text-[#171717] outline-none placeholder:text-[#171717]/38"
                  disabled={isRunning || suiteRunning}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submit();
                    }
                  }}
                  placeholder="Örn. Bu haftanın en belirgin çalışan deneyimi sinyalleri neler?"
                  ref={inputRef}
                  rows={1}
                  value={input}
                />
                {isRunning ? (
                  <button
                    aria-label="Yanıtı durdur"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FC7700] text-white transition-transform hover:scale-105"
                    onClick={cancel}
                    type="button"
                  >
                    <CircleStop className="h-5 w-5" />
                  </button>
                ) : (
                  <button
                    aria-label="Soruyu gönder"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0057FF] text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={!input.trim() || suiteRunning}
                    type="submit"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 font-poppins text-[10px] uppercase tracking-[0.14em] text-[#171717]/38">
                <span>Enter gönderir · Shift + Enter yeni satır</span>
                <span>{requestId ? `İstek ${requestId.slice(0, 8)}` : "Güvenli canlı stream"}</span>
              </div>
            </form>
          </div>
        </AnalyticsCard>
        {mode === "pro" ? (
          <ProTracePanel
            conversationId={conversationId}
            entries={traceEntries}
            firstTokenMs={firstTokenMs}
            headerLatencyMs={headerLatencyMs}
            httpStatus={httpStatus}
            requestDurationMs={requestDurationMs}
            requestId={requestId}
            terminalEvent={terminalEvent}
          />
        ) : null}
      </AnalyticsDashboardBody>
      </div>

      {questionsOpen && questionsFeatureAvailable ? (
        <div className="pointer-events-none fixed inset-0 z-[100]">
          <button
            aria-label="Hazır sorular panelini kapat"
            className="pointer-events-auto absolute inset-0 bg-[#171717]/30 backdrop-blur-[2px] xl:hidden"
            onClick={() => setQuestionsOpen(false)}
            type="button"
          />
          <aside className="pointer-events-auto absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-[#171717]/10 bg-[#F8F2E7] shadow-[-28px_0_80px_rgba(23,23,23,0.18)]">
            <div className="border-b border-[#171717]/10 bg-white/70 px-5 py-5 backdrop-blur-xl sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-poppins text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0057FF]">
                    İş Yatırım Agent
                  </p>
                  <h2 className="mt-1 font-righteous text-3xl text-[#171717]">
                    {mode === "pro" ? "Test Suite" : "Örnek Sorular"}
                  </h2>
                  <p className="mt-1 font-poppins text-xs text-[#171717]/50">
                    {mode === "pro"
                      ? "Canlı AgentCore kabul kataloğu"
                      : "Bir soruyu seçerek sohbet alanına aktarın"}
                  </p>
                </div>
                <button
                  aria-label="Paneli kapat"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#171717]/10 bg-white text-[#171717]/60 transition-colors hover:text-[#171717]"
                  onClick={() => setQuestionsOpen(false)}
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {mode === "pro" ? (
                <>
              <div className="mt-5 grid grid-cols-2 rounded-2xl border border-[#171717]/8 bg-[#F3EAD7] p-1.5">
                {([
                  ["catalog", "Standart"],
                  ["parameterized", "Parametrik"],
                ] as const).map(([value, label]) => (
                  <button
                    className={`rounded-xl px-3 py-2.5 font-poppins text-[11px] font-semibold transition-colors ${
                      suiteMode === value
                        ? "bg-[#171717] text-white shadow-sm"
                        : "text-[#171717]/50 hover:bg-white"
                    }`}
                    disabled={suiteRunning}
                    key={value}
                    onClick={() => {
                      setSuiteMode(value);
                      if (value === "parameterized") {
                        setParameterizedConfigOpen(true);
                      }
                    }}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {suiteMode === "parameterized" ? (
                <button
                  className="mt-4 flex h-11 w-full items-center gap-2 rounded-2xl border border-[#0057FF]/12 bg-[#0057FF]/5 px-4 font-poppins text-[11px] font-semibold text-[#171717]/65"
                  onClick={() => setParameterizedConfigOpen((current) => !current)}
                  type="button"
                >
                  <SlidersHorizontal className="h-4 w-4 text-[#0057FF]" />
                  Parametreler
                  <span className="ml-auto font-mono text-[10px] text-[#0057FF]">
                    {parameterizedQuestions.length} case
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${parameterizedConfigOpen ? "rotate-180" : ""}`} />
                </button>
              ) : null}

              {suiteMode === "parameterized" && parameterizedConfigOpen ? (
                <div className="mt-4 space-y-3 rounded-[20px] border border-[#0057FF]/12 bg-[#0057FF]/5 p-4">
                  <label className="block">
                    <span className="font-poppins text-[9px] font-semibold uppercase tracking-[0.15em] text-[#171717]/45">
                      Baz soru · tüm katalog
                    </span>
                    <select
                      className="mt-1.5 h-10 w-full rounded-xl border border-[#171717]/10 bg-white px-3 font-poppins text-[11px] text-[#171717] outline-none focus:border-[#0057FF]/30"
                      disabled={suiteRunning}
                      onChange={(event) =>
                        setParameterizedQuestionIndex(Number(event.target.value))
                      }
                      value={parameterizedQuestionIndex}
                    >
                      {(
                        ["daily", "weekly", "combined", "comment"] as const
                      ).map((category) => (
                        <optgroup
                          key={category}
                          label={QUESTION_CATEGORY_LABELS[category]}
                        >
                          {QUESTION_CATALOG.map((question, index) =>
                            question.category === category ? (
                              <option key={question.prompt} value={index}>
                                {String(index + 1).padStart(2, "0")} · {question.prompt}
                              </option>
                            ) : null,
                          )}
                        </optgroup>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border border-[#0057FF]/10 bg-white/80 px-3 py-2.5">
                    <p className="font-poppins text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0057FF]">
                      Seçili kabul sorusu
                    </p>
                    <p className="mt-1 font-poppins text-[10px] leading-4 text-[#171717]/58">
                      {parameterizedBaseQuestion.prompt}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label>
                      <span className="font-poppins text-[9px] font-semibold uppercase tracking-[0.15em] text-[#171717]/45">
                        Başlangıç
                      </span>
                      <input
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#171717]/10 bg-white px-3 font-mono text-[10px] text-[#171717] outline-none focus:border-[#0057FF]/30"
                        disabled={suiteRunning}
                        onChange={(event) => setParameterizedStartDate(event.target.value)}
                        type="date"
                        value={parameterizedStartDate}
                      />
                    </label>
                    <label>
                      <span className="font-poppins text-[9px] font-semibold uppercase tracking-[0.15em] text-[#171717]/45">
                        Bitiş
                      </span>
                      <input
                        className="mt-1.5 h-10 w-full rounded-xl border border-[#171717]/10 bg-white px-3 font-mono text-[10px] text-[#171717] outline-none focus:border-[#0057FF]/30"
                        disabled={suiteRunning}
                        onChange={(event) => setParameterizedEndDate(event.target.value)}
                        type="date"
                        value={parameterizedEndDate}
                      />
                    </label>
                  </div>

                  <div>
                    <span className="font-poppins text-[9px] font-semibold uppercase tracking-[0.15em] text-[#171717]/45">
                      Mood score spectrum
                    </span>
                    <div className="mt-1.5 grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4].map((score) => {
                        const selected = parameterizedScores.includes(score);
                        return (
                          <button
                            className={`h-9 rounded-xl font-mono text-xs font-semibold transition-colors ${
                              selected
                                ? "bg-[#0057FF] text-white"
                                : "border border-[#171717]/10 bg-white text-[#171717]/40"
                            }`}
                            disabled={suiteRunning}
                            key={score}
                            onClick={() =>
                              setParameterizedScores((current) =>
                                selected
                                  ? current.length === 1
                                    ? current
                                    : current.filter((value) => value !== score)
                                  : [...current, score].sort(),
                              )
                            }
                            type="button"
                          >
                            {score}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 rounded-xl bg-white/80 px-3 py-2 font-poppins text-[10px] text-[#171717]/50">
                    <div className="flex justify-between">
                      <span>En fazla 31 günlük aralık</span>
                      <strong className="text-[#0057FF]">
                        {parameterizedQuestions.length} senaryo
                      </strong>
                    </div>
                    <div className="flex items-center gap-1.5 border-t border-[#171717]/6 pt-2 text-[#007D6B]">
                      <Database className="h-3.5 w-3.5" />
                      <span>
                        {suiteStorageReady
                          ? "Cevaplar bu cihazda kalıcı saklanıyor"
                          : "Kayıtlı cevaplar yükleniyor"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5">
                <div className="flex items-center justify-between font-mono text-[10px] text-[#171717]/50">
                  <span>
                    {Object.values(suiteResults).filter(
                      (result) => result.status === "passed" || result.status === "failed",
                    ).length} / {activeSuiteQuestions.length}
                  </span>
                  <span>
                    {Object.values(suiteResults).filter(
                      (result) => result.status === "passed",
                    ).length} passed
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#171717]/8">
                  <div
                    className="h-full rounded-full bg-[#00A890] transition-[width] duration-300"
                    style={{
                      width: `${
                        (Object.values(suiteResults).filter(
                          (result) =>
                            result.status === "passed" || result.status === "failed",
                        ).length /
                          Math.max(activeSuiteQuestions.length, 1)) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center gap-1.5 font-poppins text-[9px] text-[#007D6B]">
                  <Database className="h-3 w-3" />
                  {suiteStorageReady
                    ? "Tamamlanan cevaplar refresh sonrası korunur"
                    : "Kayıtlı cevaplar yükleniyor"}
                </div>
                {suiteRunning ? (
                  <button
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-[#FC7700]/30 bg-[#FC7700]/10 font-poppins text-xs font-semibold text-[#A14D00]"
                    onClick={stopSuite}
                    type="button"
                  >
                    <CircleStop className="h-4 w-4" />
                    Suite’i durdur
                  </button>
                ) : (
                  <button
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#171717] font-poppins text-xs font-semibold text-white transition-transform hover:-translate-y-0.5"
                    disabled={
                      activeSuiteQuestions.length === 0 || !suiteStorageReady
                    }
                    onClick={() => void runFullSuite()}
                    type="button"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Full Suite · {activeSuiteQuestions.length} senaryo
                  </button>
                )}
              </div>
                </>
              ) : null}

              <div className={`relative ${mode === "pro" ? "mt-5" : "mt-6"}`}>
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#171717]/35" />
                <input
                  aria-label="Hazır sorularda ara"
                  className="h-12 w-full rounded-2xl border border-[#171717]/10 bg-white pl-11 pr-4 font-poppins text-xs text-[#171717] outline-none placeholder:text-[#171717]/35 focus:border-[#0057FF]/30"
                  onChange={(event) => setQuestionSearch(event.target.value)}
                  placeholder="Sorularda ara…"
                  type="search"
                  value={questionSearch}
                />
              </div>

              {mode === "simple" || suiteMode === "catalog" ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {QUESTION_FILTERS.map((filter) => (
                  <button
                    className={`shrink-0 rounded-full px-3.5 py-2 font-poppins text-[10px] font-semibold transition-colors ${
                      questionFilter === filter.value
                        ? "bg-[#171717] text-white"
                        : "border border-[#171717]/10 bg-white text-[#171717]/55 hover:text-[#0057FF]"
                    }`}
                    key={filter.value}
                    onClick={() => setQuestionFilter(filter.value)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
              ) : null}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4 sm:p-5">
              <div className="sticky top-0 z-10 flex items-center justify-between bg-[#F8F2E7]/95 pb-2 backdrop-blur-sm">
                <p className="font-poppins text-[9px] font-semibold uppercase tracking-[0.18em] text-[#171717]/45">
                  {mode === "pro" ? "Case sonuçları" : "Soru kataloğu"}
                </p>
                <span className="font-mono text-[9px] text-[#171717]/35">
                  {panelQuestions.length} soru
                </span>
              </div>
              {panelQuestions.map((question, catalogIndex) => ({
                question,
                catalogIndex,
              })).filter(({ question }) => {
                const categoryMatches = questionFilter === "all" || question.category === questionFilter;
                const searchMatches = question.prompt.toLocaleLowerCase("tr-TR").includes(questionSearch.trim().toLocaleLowerCase("tr-TR"));
                return categoryMatches && searchMatches;
              }).map(({ question, catalogIndex }) => {
                const result = suiteResults[catalogIndex];
                return (
                <button
                  className="group flex w-full gap-3 rounded-[20px] border border-[#171717]/8 bg-white/80 p-4 text-left transition-all hover:-translate-x-1 hover:border-[#0057FF]/25 hover:shadow-md disabled:cursor-wait disabled:hover:translate-x-0"
                  disabled={
                    mode === "pro" &&
                    (!suiteStorageReady ||
                      (suiteRunning &&
                        result?.status !== "passed" &&
                        result?.status !== "failed"))
                  }
                  key={`${question.category}-${question.prompt}`}
                  onClick={() => {
                    if (mode === "simple") {
                      selectExampleQuestion(question.prompt);
                    } else if (
                      result?.status === "passed" ||
                      result?.status === "failed"
                    ) {
                      showSuiteResponse(catalogIndex);
                    } else {
                      void runSingleSuiteQuestion(catalogIndex);
                    }
                  }}
                  type="button"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0057FF]/8 font-mono text-[10px] font-semibold text-[#0057FF]">
                    {String(catalogIndex + 1).padStart(2, "0")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="font-poppins text-[9px] font-semibold uppercase tracking-[0.15em] text-[#0057FF]/65">
                      {QUESTION_CATEGORY_LABELS[question.category]}
                    </span>
                    <span className="mt-1 block font-poppins text-xs font-medium leading-5 text-[#171717]/70 group-hover:text-[#171717]">
                      {question.prompt}
                    </span>
                    {mode === "pro" && result?.error ? (
                      <span className="mt-2 block line-clamp-2 font-poppins text-[10px] leading-4 text-[#FC7700]">
                        {result.error}
                      </span>
                    ) : null}
                    {mode === "pro" && result?.response ? (
                      <span className="mt-2 block line-clamp-3 border-l-2 border-[#00A890]/25 pl-2 font-poppins text-[10px] leading-4 text-[#171717]/52">
                        {result.response}
                      </span>
                    ) : null}
                    {mode === "pro" && result?.durationMs ? (
                      <span className="mt-2 flex items-center gap-2 font-mono text-[9px] text-[#171717]/35">
                        {result.durationMs} ms
                        {result.status !== "running" ? (
                          <span className="font-poppins font-semibold text-[#0057FF]">
                            · Tam cevabı aç
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                  {mode === "pro" ? (
                  <span className="ml-auto mt-1 shrink-0">
                    {result?.status === "running" ? (
                      <LoaderCircle className="h-4 w-4 animate-spin text-[#0057FF]" />
                    ) : result?.status === "passed" ? (
                      <CheckCircle2 className="h-4 w-4 text-[#00A890]" />
                    ) : result?.status === "failed" ? (
                      <X className="h-4 w-4 text-[#FC7700]" />
                    ) : (
                      <Circle className="h-4 w-4 text-[#171717]/20" />
                    )}
                  </span>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="ml-auto mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#0057FF]/12 bg-[#0057FF]/6 text-[#0057FF] transition-colors group-hover:bg-[#0057FF] group-hover:text-white"
                    >
                      <Send className="h-4 w-4" />
                    </span>
                  )}
                </button>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}
    </AnalyticsDashboardPageShell>
  );
}
