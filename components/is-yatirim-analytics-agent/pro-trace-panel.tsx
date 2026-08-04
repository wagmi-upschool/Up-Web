"use client";

import type { ReactNode } from "react";
import { Activity, Braces, Clock3, Database, Wrench } from "lucide-react";
import {
  AnalyticsCard,
  AnalyticsSubheading,
} from "@/components/analytics-dashboard/dashboard-shell";
import type {
  AgentObservability,
  AgentStreamEvent,
} from "@/lib/isYatirimAgentStream";

export type AgentTraceEntry = {
  sequence: number;
  elapsedMs: number;
  event: AgentStreamEvent;
};

type ProTracePanelProps = {
  entries: AgentTraceEntry[];
  headerLatencyMs?: number;
  firstTokenMs?: number;
  requestDurationMs?: number;
  requestId?: string;
  conversationId?: string;
  httpStatus?: number;
  terminalEvent?: Extract<AgentStreamEvent, { type: "done" }>;
};

const STEP_LABELS: Array<[keyof AgentObservability["steps"], string, string]> = [
  ["requestValidationMs", "İstek doğrulama", "#00A890"],
  ["routingModelMs", "Model yönlendirme", "#0057FF"],
  ["toolExecutionMs", "Tool çalıştırma", "#FC7700"],
  ["finalSynthesisModelMs", "Final sentez", "#7C3AED"],
  ["runtimeOverheadMs", "Runtime overhead", "#64748B"],
];

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function json(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function highlightedJson(source: string, dark = false): ReactNode[] {
  const tokenPattern = /("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)/g;
  return source.split(tokenPattern).filter(Boolean).map((token, index) => {
    let color = dark ? "text-[#D8DEE9]" : "text-[#596172]";
    if (/^".*"\s*:$/.test(token)) {
      color = dark ? "text-[#82AAFF]" : "text-[#0057FF]";
    } else if (token.startsWith('"')) {
      color = dark ? "text-[#C3E88D]" : "text-[#087F5B]";
    } else if (/^-?\d/.test(token)) {
      color = dark ? "text-[#F78C6C]" : "text-[#C75B00]";
    } else if (token === "true" || token === "false") {
      color = dark ? "text-[#C792EA]" : "text-[#7C3AED]";
    } else if (token === "null") {
      color = dark ? "text-[#FF5370]" : "text-[#D12F55]";
    }
    return <span className={color} key={`${index}-${token.slice(0, 12)}`}>{token}</span>;
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#171717]/8 bg-white/70 p-4">
      <p className="font-poppins text-[10px] font-semibold uppercase tracking-[0.16em] text-[#171717]/42">
        {label}
      </p>
      <p className="mt-2 font-righteous text-2xl text-[#171717]">{value}</p>
    </div>
  );
}

export default function ProTracePanel({
  entries,
  headerLatencyMs,
  firstTokenMs,
  requestDurationMs,
  requestId,
  conversationId,
  httpStatus,
  terminalEvent,
}: ProTracePanelProps) {
  const observability = terminalEvent?.observability;
  const toolCalls = terminalEvent?.toolCalls ?? [];
  const toolResponses = terminalEvent?.toolResponses ?? [];
  const totalForBars = Math.max(
    1,
    observability?.totalDurationMs ?? requestDurationMs ?? 1,
  );
  const streamStart = entries[0];
  const streamEnd = [...entries]
    .reverse()
    .find((entry) => entry.event.type === "done" || entry.event.type === "error");
  const timelineEntries = streamStart
    ? [
        {
          key: "start",
          label: "Stream başladı",
          elapsedMs: streamStart.elapsedMs,
          detail: `#${streamStart.sequence} · start`,
          tone: "bg-[#0057FF]",
        },
        ...(streamEnd && streamEnd.sequence !== streamStart.sequence
          ? [
              {
                key: "end",
                label:
                  streamEnd.event.type === "error"
                    ? "Stream hatayla sonlandı"
                    : "Stream tamamlandı",
                elapsedMs: streamEnd.elapsedMs,
                detail: `#${streamEnd.sequence} · ${streamEnd.event.type}`,
                tone:
                  streamEnd.event.type === "error"
                    ? "bg-[#FC7700]"
                    : "bg-[#00A890]",
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="mt-6 space-y-6">
      <AnalyticsCard>
        <AnalyticsSubheading dotColor="#0057FF">Canlı stream özeti</AnalyticsSubheading>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label="HTTP headers" value={headerLatencyMs === undefined ? "—" : `${headerLatencyMs} ms`} />
          <Metric label="İlk token" value={firstTokenMs === undefined ? "—" : `${firstTokenMs} ms`} />
          <Metric label="Toplam süre" value={requestDurationMs === undefined ? "—" : `${requestDurationMs} ms`} />
          <Metric label="Stream event" value={String(entries.length)} />
          <Metric label="Tool çağrısı" value={String(toolCalls.length)} />
        </div>
        <div className="mt-4 grid gap-3 font-poppins text-xs sm:grid-cols-3">
          {[
            ["Request ID", requestId ?? "—"],
            ["Conversation ID", conversationId ?? "—"],
            ["HTTP", httpStatus === undefined ? "—" : String(httpStatus)],
          ].map(([label, value]) => (
            <div className="min-w-0 rounded-2xl bg-[#F8F2E7] px-4 py-3" key={label}>
              <span className="text-[#171717]/45">{label}</span>
              <p className="mt-1 truncate font-mono text-[11px] text-[#171717]" title={value}>{value}</p>
            </div>
          ))}
        </div>
      </AnalyticsCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsCard>
          <AnalyticsSubheading dotColor="#00A890">Event timeline</AnalyticsSubheading>
          {timelineEntries.length ? (
            <div className="space-y-2">
              {timelineEntries.map((entry) => (
                <div
                  className="flex items-start gap-3 rounded-2xl border border-[#171717]/7 bg-white/65 px-4 py-3"
                  key={entry.key}
                >
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${entry.tone}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-3">
                      <p className="truncate font-poppins text-xs font-semibold text-[#171717]">
                        {entry.label}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-[#171717]/45">+{entry.elapsedMs} ms</span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#171717]/38">
                      {entry.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-poppins text-sm text-[#171717]/50">
              Bir mesaj gönderildiğinde stream başlangıcı ve bitişi burada görünür.
            </p>
          )}
        </AnalyticsCard>

        <AnalyticsCard>
          <AnalyticsSubheading dotColor="#FC7700">AgentCore waterfall</AnalyticsSubheading>
          {observability ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-2xl bg-[#171717] px-4 py-3 text-white">
                <Clock3 className="h-4 w-4" />
                <span className="font-poppins text-xs">AgentCore toplam</span>
                <strong className="ml-auto font-mono text-sm">{observability.totalDurationMs} ms</strong>
              </div>
              <div className="space-y-4">
                {STEP_LABELS.map(([key, label, color]) => {
                  const duration = observability.steps[key];
                  return (
                    <div key={key}>
                      <div className="mb-1.5 flex justify-between font-poppins text-xs">
                        <span className="text-[#171717]/65">{label}</span>
                        <span className="font-mono text-[#171717]">{duration} ms</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-[#171717]/7">
                        <div className="h-full rounded-full" style={{ backgroundColor: color, width: `${Math.max(duration ? 2 : 0, Math.min(100, duration / totalForBars * 100))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {observability.analytics.map((item, index) => (
                <div className="rounded-2xl border border-[#171717]/8 bg-[#F8F2E7] p-4" key={`${item.operation}-${index}`}>
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-[#0057FF]" />
                    <span className="font-poppins text-xs font-semibold text-[#171717]">{item.operation}</span>
                    <span className="ml-auto rounded-full bg-white px-2.5 py-1 font-mono text-[10px] text-[#171717]/65">{item.source}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 font-poppins text-[11px] text-[#171717]/60">
                    <span>Tool: {item.toolDurationMs} ms</span>
                    <span>Lambda: {item.lambdaDurationMs} ms</span>
                    <span>Cache: {item.responseCache.lookupStatus}</span>
                    <span>S3: {item.historicalS3.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-poppins text-sm text-[#171717]/50">Final AgentCore event’i geldiğinde model, tool ve runtime süreleri burada oluşur.</p>
          )}
        </AnalyticsCard>
      </div>

      <AnalyticsCard>
        <AnalyticsSubheading dotColor="#7C3AED">Tool çağrıları ve yanıtları</AnalyticsSubheading>
        {toolCalls.length ? (
          <div className="space-y-4">
            {toolCalls.map((call, index) => {
              const callRecord = asRecord(call);
              const response = toolResponses.find((candidate) => {
                const responseRecord = asRecord(candidate);
                return responseRecord?.toolCallId === callRecord?.id;
              });
              return (
                <div className="w-full overflow-hidden rounded-[22px] border border-[#171717]/8 bg-white/70" key={String(callRecord?.id ?? index)}>
                  <div className="flex items-center gap-2 border-b border-[#171717]/8 px-4 py-3">
                    <Wrench className="h-4 w-4 text-[#7C3AED]" />
                    <span className="truncate font-poppins text-xs font-semibold text-[#171717]">{String(callRecord?.name ?? `Tool ${index + 1}`)}</span>
                    <span className="ml-auto font-mono text-[10px] text-[#171717]/40">#{index + 1}</span>
                  </div>
                  <div className="grid min-w-0 gap-px bg-[#171717]/8 md:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
                    <div className="min-w-0 bg-[#FBF8F1]">
                      <p className="border-b border-[#171717]/8 px-4 py-2 font-poppins text-[9px] font-semibold uppercase tracking-[0.16em] text-[#171717]/40">Arguments</p>
                      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-[10px] leading-5">{highlightedJson(json(callRecord?.arguments))}</pre>
                    </div>
                    <div className="min-w-0 bg-[#F4F7FF]">
                      <p className="border-b border-[#171717]/8 px-4 py-2 font-poppins text-[9px] font-semibold uppercase tracking-[0.16em] text-[#171717]/40">Response</p>
                      <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap break-words p-4 font-mono text-[10px] leading-5">{highlightedJson(json(response))}</pre>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="font-poppins text-sm text-[#171717]/50">Bu istek için henüz tool çağrısı yok.</p>
        )}
      </AnalyticsCard>

      <AnalyticsCard>
        <div className="mb-5 flex items-center gap-2">
          <Braces className="h-4 w-4 text-[#171717]/55" />
          <p className="font-poppins text-xs font-semibold uppercase tracking-[0.2em] text-[#171717]/55">Raw NDJSON event’leri</p>
          <Activity className="ml-auto h-4 w-4 text-[#00A890]" />
        </div>
        <pre className="max-h-[520px] overflow-auto rounded-[22px] bg-[#171717] p-5 font-mono text-[10px] leading-5 text-[#E9F0FF]">{entries.length ? highlightedJson(entries.map((entry) => json({ sequence: entry.sequence, elapsedMs: entry.elapsedMs, ...entry.event })).join("\n"), true) : "// Stream bekleniyor"}</pre>
      </AnalyticsCard>
    </div>
  );
}
