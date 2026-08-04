export type AgentAnalyticsObservation = {
  operation: "daily" | "weekly" | "comment_search";
  source: "response_cache" | "s3" | "dynamodb" | "s3+dynamodb" | "none";
  toolDurationMs: number;
  lambdaDurationMs: number;
  responseCache: {
    eligible: boolean;
    lookupStatus: string;
    writeStatus: string;
    created: boolean;
  };
  historicalS3: { status: string; readCount: number };
  dynamodb: { surveyDataUsed: boolean; surveyQueryCount: number };
};

export type AgentObservability = {
  totalDurationMs: number;
  steps: {
    requestValidationMs: number;
    routingModelMs: number;
    toolExecutionMs: number;
    finalSynthesisModelMs: number;
    runtimeOverheadMs: number;
  };
  analytics: AgentAnalyticsObservation[];
};

export type AgentStreamEvent =
  | { type: "meta"; requestId: string; conversationId: string }
  | { type: "status"; status: "agent_started" }
  | { type: "delta"; content: string }
  | { type: "heartbeat"; timestamp: string }
  | {
      type: "done";
      response: string;
      result: string;
      toolCalls: unknown[];
      toolResponses: unknown[];
      observability?: AgentObservability;
    }
  | { type: "error"; code: string; message: string };

export type AgentTerminalEvent = Extract<
  AgentStreamEvent,
  { type: "done" | "error" }
>;

export class AgentStreamProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentStreamProtocolError";
  }
}

function requiredString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field];
  if (typeof value !== "string") {
    throw new AgentStreamProtocolError(`Invalid ${field} field`);
  }
  return value;
}

function objectRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentStreamProtocolError(`Invalid ${field} field`);
  }
  return value as Record<string, unknown>;
}

function nonNegativeNumber(record: Record<string, unknown>, field: string) {
  const value = record[field];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new AgentStreamProtocolError(`Invalid ${field} field`);
  }
  return value;
}

function parseObservability(value: unknown): AgentObservability {
  const record = objectRecord(value, "observability");
  const steps = objectRecord(record.steps, "observability.steps");
  if (!Array.isArray(record.analytics)) {
    throw new AgentStreamProtocolError("Invalid observability.analytics field");
  }

  const analytics = record.analytics.map((item): AgentAnalyticsObservation => {
    const observation = objectRecord(item, "observability.analytics");
    const responseCache = objectRecord(observation.responseCache, "responseCache");
    const historicalS3 = objectRecord(observation.historicalS3, "historicalS3");
    const dynamodb = objectRecord(observation.dynamodb, "dynamodb");
    if (
      !["daily", "weekly", "comment_search"].includes(String(observation.operation)) ||
      !["response_cache", "s3", "dynamodb", "s3+dynamodb", "none"].includes(
        String(observation.source),
      ) ||
      typeof responseCache.eligible !== "boolean" ||
      typeof responseCache.lookupStatus !== "string" ||
      typeof responseCache.writeStatus !== "string" ||
      typeof responseCache.created !== "boolean" ||
      typeof historicalS3.status !== "string" ||
      typeof dynamodb.surveyDataUsed !== "boolean"
    ) {
      throw new AgentStreamProtocolError("Invalid observability analytics field");
    }
    return {
      operation: observation.operation as AgentAnalyticsObservation["operation"],
      source: observation.source as AgentAnalyticsObservation["source"],
      toolDurationMs: nonNegativeNumber(observation, "toolDurationMs"),
      lambdaDurationMs: nonNegativeNumber(observation, "lambdaDurationMs"),
      responseCache: {
        eligible: responseCache.eligible,
        lookupStatus: responseCache.lookupStatus,
        writeStatus: responseCache.writeStatus,
        created: responseCache.created,
      },
      historicalS3: {
        status: historicalS3.status,
        readCount: nonNegativeNumber(historicalS3, "readCount"),
      },
      dynamodb: {
        surveyDataUsed: dynamodb.surveyDataUsed,
        surveyQueryCount: nonNegativeNumber(dynamodb, "surveyQueryCount"),
      },
    };
  });

  return {
    totalDurationMs: nonNegativeNumber(record, "totalDurationMs"),
    steps: {
      requestValidationMs: nonNegativeNumber(steps, "requestValidationMs"),
      routingModelMs: nonNegativeNumber(steps, "routingModelMs"),
      toolExecutionMs: nonNegativeNumber(steps, "toolExecutionMs"),
      finalSynthesisModelMs: nonNegativeNumber(steps, "finalSynthesisModelMs"),
      runtimeOverheadMs: nonNegativeNumber(steps, "runtimeOverheadMs"),
    },
    analytics,
  };
}

function parseEvent(line: string): AgentStreamEvent {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    throw new AgentStreamProtocolError("Invalid NDJSON record");
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AgentStreamProtocolError("Invalid stream event");
  }

  const record = value as Record<string, unknown>;
  switch (record.type) {
    case "meta":
      return {
        type: "meta",
        requestId: requiredString(record, "requestId"),
        conversationId: requiredString(record, "conversationId"),
      };
    case "status":
      if (record.status !== "agent_started") {
        throw new AgentStreamProtocolError("Invalid status event");
      }
      return { type: "status", status: "agent_started" };
    case "delta":
      return { type: "delta", content: requiredString(record, "content") };
    case "heartbeat":
      return {
        type: "heartbeat",
        timestamp: requiredString(record, "timestamp"),
      };
    case "done":
      if (!Array.isArray(record.toolCalls) || !Array.isArray(record.toolResponses)) {
        throw new AgentStreamProtocolError("Invalid done event");
      }
      return {
        type: "done",
        response: requiredString(record, "response"),
        result: requiredString(record, "result"),
        toolCalls: record.toolCalls,
        toolResponses: record.toolResponses,
        ...(record.observability === undefined
          ? {}
          : { observability: parseObservability(record.observability) }),
      };
    case "error":
      return {
        type: "error",
        code: requiredString(record, "code"),
        message: requiredString(record, "message"),
      };
    default:
      throw new AgentStreamProtocolError("Unsupported stream event");
  }
}

export class AgentNdjsonParser {
  private readonly decoder = new TextDecoder("utf-8", { fatal: true });
  private buffered = "";

  push(chunk: Uint8Array): AgentStreamEvent[] {
    this.buffered += this.decoder.decode(chunk, { stream: true });
    return this.drain(false);
  }

  finish(): AgentStreamEvent[] {
    this.buffered += this.decoder.decode();
    return this.drain(true);
  }

  private drain(flush: boolean): AgentStreamEvent[] {
    const lines = this.buffered.split("\n");
    this.buffered = flush ? "" : (lines.pop() ?? "");
    const completedLines = flush ? lines : lines;

    if (flush && this.buffered) {
      completedLines.push(this.buffered);
      this.buffered = "";
    }

    return completedLines
      .map((line) => line.replace(/\r$/, "").trim())
      .filter(Boolean)
      .map(parseEvent);
  }
}

function abortError() {
  return new DOMException("The stream was cancelled", "AbortError");
}

export async function consumeAgentNdjsonStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal,
): Promise<AgentTerminalEvent> {
  const reader = stream.getReader();
  const parser = new AgentNdjsonParser();
  let terminal: AgentTerminalEvent | null = null;

  const emit = (event: AgentStreamEvent) => {
    if (terminal) {
      throw new AgentStreamProtocolError("Event received after terminal event");
    }
    onEvent(event);
    if (event.type === "done" || event.type === "error") {
      terminal = event;
    }
  };
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };

  signal?.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      if (signal?.aborted) throw abortError();
      const { done, value } = await reader.read();
      if (done) break;
      for (const event of parser.push(value)) emit(event);
    }
    if (signal?.aborted) throw abortError();
    for (const event of parser.finish()) emit(event);
  } finally {
    signal?.removeEventListener("abort", cancel);
    reader.releaseLock();
  }

  if (!terminal) {
    throw new AgentStreamProtocolError("Stream ended without a terminal event");
  }
  return terminal;
}
