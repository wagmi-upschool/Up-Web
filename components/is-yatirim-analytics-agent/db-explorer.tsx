"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileJson,
  Filter,
  LoaderCircle,
  RefreshCw,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import MessageRenderer from "@/components/messages/MessageRenderer";
import {
  EMPTY_AGENT_DB_FILTER,
  filterAgentDbRecords,
  mergeAgentDbFilter,
  summarizeAgentDbRecords,
  type AgentDbFilter,
  type AgentDbRecord,
  type AgentDbSuiteSelection,
  type StoredAgentDbSnapshot,
} from "@/lib/isYatirimAgentDb";
import {
  buildAgentDbSnapshot,
  incrementalAgentDbRecords,
  parseAgentDbFile,
} from "@/lib/isYatirimAgentDbFile";
import {
  loadAgentDbSnapshot,
  saveAgentDbSnapshot,
} from "@/lib/isYatirimAgentDbStorage";

const VERIFICATION_KEY = "is-yatirim-agent:db-verifications:v1";
const PAGE_SIZE = 50;
type VerificationStatus = "verified" | "mismatch";

function dateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function shortId(value?: string) {
  if (!value) return "—";
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value;
}

function commentsOf(record: AgentDbRecord) {
  const comments = new Set<string>();
  if (
    typeof record.free_text_general === "string" &&
    record.free_text_general.trim()
  ) {
    comments.add(record.free_text_general.trim());
  }
  for (const answer of record.answers ?? []) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer))
      continue;
    const item = answer as Record<string, unknown>;
    if (
      item.answer_type === "free_text" &&
      typeof item.answer_value === "string" &&
      item.answer_value.trim()
    ) {
      comments.add(item.answer_value.trim());
    }
  }
  return Array.from(comments).join(" · ");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#171717]/8 bg-white/75 px-4 py-3">
      <p className="font-poppins text-[9px] font-semibold uppercase tracking-[0.16em] text-[#171717]/42">
        {label}
      </p>
      <p className="mt-1.5 font-righteous text-xl text-[#171717]">{value}</p>
    </div>
  );
}

export default function DbExplorer({
  suiteSelection,
}: {
  suiteSelection?: AgentDbSuiteSelection;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importModeRef = useRef<"bootstrap" | "sync">("bootstrap");
  const [snapshot, setSnapshot] = useState<StoredAgentDbSnapshot>();
  const [filters, setFilters] = useState<AgentDbFilter>(EMPTY_AGENT_DB_FILTER);
  const [appliedFilters, setAppliedFilters] = useState<AgentDbFilter>(
    EMPTY_AGENT_DB_FILTER,
  );
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [verification, setVerification] = useState<VerificationStatus>();

  useEffect(() => {
    void loadAgentDbSnapshot()
      .then(setSnapshot)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "DB açılamadı."),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!suiteSelection) {
      setVerification(undefined);
      return;
    }
    const next = mergeAgentDbFilter(filters, suiteSelection.filter);
    setFilters(next);
    setAppliedFilters(next);
    setPage(1);
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(VERIFICATION_KEY) || "{}",
      ) as Record<string, VerificationStatus>;
      setVerification(saved[suiteSelection.id]);
    } catch {
      setVerification(undefined);
    }
    // Suite selection is the event that transfers the right-hand parameters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteSelection?.id]);

  const filteredRecords = useMemo(
    () => filterAgentDbRecords(snapshot?.records ?? [], appliedFilters),
    [appliedFilters, snapshot],
  );
  const summary = useMemo(
    () => summarizeAgentDbRecords(filteredRecords),
    [filteredRecords],
  );
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const visibleRecords = filteredRecords.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const competencyIds = useMemo(
    () =>
      Array.from(
        new Set(
          (snapshot?.records ?? [])
            .map((record) => record.competency_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ).sort(),
    [snapshot],
  );

  const chooseFile = (mode: "bootstrap" | "sync") => {
    importModeRef.current = mode;
    fileInputRef.current?.click();
  };

  const importFile = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const parsed = await parseAgentDbFile(file);
      const previous = importModeRef.current === "sync" ? snapshot : undefined;
      const candidates = previous
        ? incrementalAgentDbRecords(parsed, previous.cursor)
        : parsed;
      const next = buildAgentDbSnapshot(candidates, previous);
      await saveAgentDbSnapshot(next);
      const added = next.records.length - (previous?.records.length ?? 0);
      setSnapshot(next);
      setPage(1);
      setNotice(
        previous
          ? `${added.toLocaleString("tr-TR")} yeni kayıt eklendi. Eski kayıtlar tekrar yazılmadı.`
          : `${next.records.length.toLocaleString("tr-TR")} kayıt browser DB’ye alındı.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Dosya işlenemedi.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadJson = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `feedbackSurvey-${snapshot.cursor.slice(0, 10) || "snapshot"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveVerification = (status: VerificationStatus) => {
    if (!suiteSelection) return;
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(VERIFICATION_KEY) || "{}",
      ) as Record<string, VerificationStatus>;
      saved[suiteSelection.id] = status;
      window.localStorage.setItem(VERIFICATION_KEY, JSON.stringify(saved));
    } catch {
      // Browser-local persistence is best effort in this debug view.
    }
    setVerification(status);
  };

  return (
    <div className="flex-1 space-y-5 overflow-hidden py-6">
      <input
        accept=".csv,.json,text/csv,application/json"
        className="hidden"
        onChange={(event) => void importFile(event.target.files?.[0])}
        ref={fileInputRef}
        type="file"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Browser DB"
          value={(snapshot?.records.length ?? 0).toLocaleString("tr-TR")}
        />
        <Metric
          label="Filtre eşleşmesi"
          value={filteredRecords.length.toLocaleString("tr-TR")}
        />
        <Metric
          label="Ortalama overall"
          value={
            summary.averageOverallScore == null
              ? "—"
              : summary.averageOverallScore.toFixed(2)
          }
        />
        <Metric
          label="Yorumlu kayıt"
          value={summary.commentRowCount.toLocaleString("tr-TR")}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-[24px] border border-[#171717]/8 bg-[#F8F2E7] p-4 lg:flex-row lg:items-center">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#0057FF]/10 text-[#0057FF]">
          <FileJson className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="font-poppins text-xs font-semibold text-[#171717]">
            {snapshot
              ? "Local JSON snapshot hazır"
              : "CSV/JSON dataset bekleniyor"}
          </p>
          <p className="mt-1 truncate font-mono text-[10px] text-[#171717]/45">
            {snapshot
              ? `Son kayıt ${dateTime(snapshot.cursor)} · güncelleme ${dateTime(snapshot.generatedAt)}`
              : "Dosya yalnızca bu browser’daki IndexedDB’ye kaydedilir."}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {snapshot ? (
            <button
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#171717]/10 bg-white px-4 font-poppins text-xs font-semibold text-[#171717]/65"
              onClick={downloadJson}
              type="button"
            >
              <Download className="h-4 w-4" /> JSON indir
            </button>
          ) : null}
          <button
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#171717] px-5 font-poppins text-xs font-semibold text-white disabled:opacity-55"
            disabled={importing}
            onClick={() => chooseFile(snapshot ? "sync" : "bootstrap")}
            type="button"
          >
            {importing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : snapshot ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {snapshot ? "Yeni kayıtları sync et" : "Dataset’i oluştur"}
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-2xl border border-[#00A890]/20 bg-[#00A890]/8 px-4 py-3 font-poppins text-xs text-[#007D6B]">
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-[#FC7700]/25 bg-[#FC7700]/10 px-4 py-3 font-poppins text-sm text-[#8B4700]">
          {error}
        </div>
      ) : null}

      {suiteSelection ? (
        <div className="rounded-[24px] border border-[#0057FF]/14 bg-[#0057FF]/5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-poppins text-[9px] font-semibold uppercase tracking-[0.18em] text-[#0057FF]">
                Suite cevabı · DB doğrulama
              </p>
              <p className="mt-2 font-poppins text-xs font-semibold leading-5 text-[#171717]">
                {suiteSelection.prompt}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 font-poppins text-[10px] font-semibold ${verification === "verified" ? "bg-[#00A890] text-white" : "border border-[#00A890]/25 bg-white text-[#007D6B]"}`}
                onClick={() => saveVerification("verified")}
                type="button"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Doğrulandı
              </button>
              <button
                className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 font-poppins text-[10px] font-semibold ${verification === "mismatch" ? "bg-[#FC7700] text-white" : "border border-[#FC7700]/25 bg-white text-[#A14D00]"}`}
                onClick={() => saveVerification("mismatch")}
                type="button"
              >
                <XCircle className="h-3.5 w-3.5" /> Uyumsuz
              </button>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-[#171717]/7 bg-white/80 px-4 py-3 text-[#171717]">
            <MessageRenderer
              content={suiteSelection.response}
              role="assistant"
              sender="ai"
            />
          </div>
        </div>
      ) : null}

      <div className="rounded-[24px] border border-[#171717]/8 bg-white/70 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Filter className="h-4 w-4 text-[#0057FF]" />
          <p className="font-poppins text-xs font-semibold text-[#171717]">
            DB filtreleri
          </p>
          <button
            className="ml-auto font-poppins text-[10px] font-semibold text-[#171717]/45 hover:text-[#0057FF]"
            onClick={() => {
              setFilters(EMPTY_AGENT_DB_FILTER);
              setAppliedFilters(EMPTY_AGENT_DB_FILTER);
              setPage(1);
            }}
            type="button"
          >
            Temizle
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <input
            aria-label="Başlangıç tarihi"
            className="h-11 rounded-2xl border border-[#171717]/10 bg-white px-3 font-mono text-[11px] outline-none"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                startDate: event.target.value,
              }))
            }
            type="date"
            value={filters.startDate}
          />
          <input
            aria-label="Bitiş tarihi"
            className="h-11 rounded-2xl border border-[#171717]/10 bg-white px-3 font-mono text-[11px] outline-none"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                endDate: event.target.value,
              }))
            }
            type="date"
            value={filters.endDate}
          />
          <input
            aria-label="Minimum overall score"
            className="h-11 rounded-2xl border border-[#171717]/10 bg-white px-3 font-poppins text-xs outline-none"
            max="4"
            min="1"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                overallScoreMin: event.target.value,
              }))
            }
            placeholder="Overall min"
            step="0.1"
            type="number"
            value={filters.overallScoreMin}
          />
          <input
            aria-label="Maximum overall score"
            className="h-11 rounded-2xl border border-[#171717]/10 bg-white px-3 font-poppins text-xs outline-none"
            max="4"
            min="1"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                overallScoreMax: event.target.value,
              }))
            }
            placeholder="Overall max"
            step="0.1"
            type="number"
            value={filters.overallScoreMax}
          />
          <select
            aria-label="Competency"
            className="h-11 rounded-2xl border border-[#171717]/10 bg-white px-3 font-poppins text-[11px] outline-none"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                competencyId: event.target.value,
              }))
            }
            value={filters.competencyId}
          >
            <option value="">Tüm competency’ler</option>
            {competencyIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <select
            aria-label="Feedback link type"
            className="h-11 rounded-2xl border border-[#171717]/10 bg-white px-3 font-poppins text-[11px] outline-none"
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                feedbackLinkType: event.target.value,
              }))
            }
            value={filters.feedbackLinkType}
          >
            <option value="">Daily + weekly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((score) => {
              const selected = filters.moodScores.includes(score);
              return (
                <button
                  className={`h-11 rounded-xl font-mono text-xs font-semibold ${selected ? "bg-[#0057FF] text-white" : "border border-[#171717]/10 bg-white text-[#171717]/45"}`}
                  key={score}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      moodScores: selected
                        ? current.moodScores.filter((value) => value !== score)
                        : [...current.moodScores, score].sort(),
                    }))
                  }
                  type="button"
                >
                  {score}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#171717]/30" />
            <input
              aria-label="Yorumlarda ara"
              className="h-11 w-full rounded-2xl border border-[#171717]/10 bg-white pl-10 pr-3 font-poppins text-xs outline-none"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Yorumlarda ara…"
              value={filters.search}
            />
          </div>
        </div>
        <button
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-2xl bg-[#0057FF] px-4 font-poppins text-xs font-semibold text-white"
          onClick={() => {
            setAppliedFilters(filters);
            setPage(1);
          }}
          type="button"
        >
          <Filter className="h-4 w-4" /> Filtrele
        </button>
      </div>

      <div className="min-h-[320px] overflow-hidden rounded-[24px] border border-[#171717]/8 bg-white/75">
        <div className="flex items-center border-b border-[#171717]/8 px-4 py-3">
          <Database className="h-4 w-4 text-[#0057FF]" />
          <p className="ml-2 font-poppins text-xs font-semibold text-[#171717]">
            FeedbackSurvey satırları
          </p>
          {loading ? (
            <LoaderCircle className="ml-auto h-4 w-4 animate-spin text-[#0057FF]" />
          ) : null}
        </div>
        <div className="max-h-[680px] overflow-auto">
          <table className="w-full min-w-[1180px] border-collapse text-left font-poppins text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#F8F2E7] text-[#171717]/50">
              <tr>
                {[
                  "Tarih",
                  "Tip",
                  "Mood",
                  "Overall",
                  "Receiver",
                  "Giver",
                  "Competency",
                  "Yorum / JSON",
                ].map((label) => (
                  <th className="px-4 py-3 font-semibold" key={label}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRecords.map((record, index) => {
                const comment = commentsOf(record);
                return (
                  <tr
                    className="border-t border-[#171717]/6 align-top text-[#171717]/68"
                    key={`${record.feedback_receiver_id}-${record.giver_competency_submitted_at}-${index}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-[10px]">
                      {dateTime(record.submitted_at)}
                    </td>
                    <td className="px-4 py-3">
                      {record.feedback_link_type || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {record.mood_score ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {record.overall_score ?? "—"}
                    </td>
                    <td
                      className="px-4 py-3 font-mono"
                      title={record.feedback_receiver_id}
                    >
                      {shortId(record.feedback_receiver_id)}
                    </td>
                    <td
                      className="px-4 py-3 font-mono"
                      title={record.feedback_giver_id}
                    >
                      {shortId(record.feedback_giver_id)}
                    </td>
                    <td
                      className="px-4 py-3 font-mono"
                      title={record.competency_id}
                    >
                      {shortId(record.competency_id)}
                    </td>
                    <td className="max-w-[360px] px-4 py-3">
                      <p className="whitespace-pre-wrap leading-5 text-[#171717]">
                        {comment || "—"}
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer font-semibold text-[#0057FF]">
                          Raw JSON
                        </summary>
                        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-[#171717] p-3 font-mono text-[9px] leading-4 text-[#E9F0FF]">
                          {JSON.stringify(record, null, 2)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && snapshot && visibleRecords.length === 0 ? (
            <p className="px-6 py-16 text-center font-poppins text-sm text-[#171717]/45">
              Bu filtrelerle eşleşen kayıt yok.
            </p>
          ) : null}
          {!loading && !snapshot ? (
            <p className="px-6 py-16 text-center font-poppins text-sm text-[#171717]/45">
              Dataset oluşturulduğunda kayıtlar burada görünecek.
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-between border-t border-[#171717]/8 px-4 py-3">
          <span className="font-mono text-[10px] text-[#171717]/40">
            Sayfa {page} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              aria-label="Önceki sayfa"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#171717]/10 bg-white disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              type="button"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              aria-label="Sonraki sayfa"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#171717]/10 bg-white disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              type="button"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
