import assert from "node:assert/strict";
import test from "node:test";
import {
  AgentStreamProtocolError,
  consumeAgentNdjsonStream,
  type AgentStreamEvent,
} from "../../lib/isYatirimAgentStream";

function chunkedStream(bytes: Uint8Array, boundaries: number[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      let offset = 0;
      for (const boundary of boundaries) {
        controller.enqueue(bytes.slice(offset, boundary));
        offset = boundary;
      }
      controller.enqueue(bytes.slice(offset));
      controller.close();
    },
  });
}

test("parses fragmented UTF-8 and coalesced NDJSON progressively", async () => {
  const payload = [
    { type: "meta", requestId: "request-1", conversationId: "conversation-1" },
    { type: "status", status: "agent_started" },
    { type: "delta", content: "Bağ" },
    { type: "delta", content: "lantı" },
    {
      type: "done",
      response: "Bağlantı hazır.",
      result: "Bağlantı hazır.",
      toolCalls: [],
      toolResponses: [],
      observability: {
        totalDurationMs: 35,
        steps: {
          requestValidationMs: 1,
          routingModelMs: 10,
          toolExecutionMs: 12,
          finalSynthesisModelMs: 10,
          runtimeOverheadMs: 2,
        },
        analytics: [],
      },
    },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n")
    .concat("\n");
  const bytes = new TextEncoder().encode(payload);
  const firstTurkishByte = bytes.indexOf(0xc4);
  const events: AgentStreamEvent[] = [];

  const terminal = await consumeAgentNdjsonStream(
    chunkedStream(
      bytes,
      [5, 97, firstTurkishByte + 1, firstTurkishByte + 2].sort(
        (left, right) => left - right,
      ),
    ),
    (event) => events.push(event),
  );

  assert.deepEqual(
    events.map((event) => event.type),
    ["meta", "status", "delta", "delta", "done"],
  );
  assert.equal(
    events
      .filter((event) => event.type === "delta")
      .map((event) => event.content)
      .join(""),
    "Bağlantı",
  );
  assert.equal(terminal.type, "done");
  if (terminal.type === "done") {
    assert.equal(terminal.observability?.steps.toolExecutionMs, 12);
  }
});

test("rejects streams with multiple terminal events", async () => {
  const payload = [
    {
      type: "done",
      response: "ilk",
      result: "ilk",
      toolCalls: [],
      toolResponses: [],
    },
    { type: "error", code: "LATE_ERROR", message: "geç hata" },
  ]
    .map((event) => JSON.stringify(event))
    .join("\n");

  await assert.rejects(
    consumeAgentNdjsonStream(
      chunkedStream(new TextEncoder().encode(payload), []),
      () => undefined,
    ),
    AgentStreamProtocolError,
  );
});

test("rejects a completed stream without a terminal event", async () => {
  const payload = `${JSON.stringify({ type: "delta", content: "yarım" })}\n`;

  await assert.rejects(
    consumeAgentNdjsonStream(
      chunkedStream(new TextEncoder().encode(payload), []),
      () => undefined,
    ),
    /terminal event/,
  );
});
