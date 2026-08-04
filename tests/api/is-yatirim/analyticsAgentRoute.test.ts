import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../../../app/api/is-yatirim/analytics-agent/chat/route";

test("forwards the Cognito ID token and returns the upstream body without buffering", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.IS_YATIRIM_AGENT_STREAM_URL;
  process.env.IS_YATIRIM_AGENT_STREAM_URL = "https://example.test/agent/isy/chat";
  let upstreamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  const upstreamBody = new ReadableStream<Uint8Array>({
    start(controller) {
      upstreamController = controller;
    },
  });
  let forwardedInit: RequestInit | undefined;

  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    forwardedInit = init;
    return new Response(upstreamBody, {
      status: 200,
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
    });
  }) as typeof fetch;

  try {
    const request = new NextRequest(
      "http://localhost/api/is-yatirim/analytics-agent/chat",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
          "x-id-token": "id-token",
        },
        body: JSON.stringify({ message: "Test" }),
      },
    );

    const response = await POST(request);

    assert.equal(response.status, 200);
    assert.equal(response.body, upstreamBody);
    assert.equal(response.headers.get("X-Accel-Buffering"), "no");
    assert.equal(
      new Headers(forwardedInit?.headers).get("Authorization"),
      "id-token",
    );
    assert.deepEqual(JSON.parse(String(forwardedInit?.body)), { message: "Test" });

    upstreamController?.enqueue(
      new TextEncoder().encode('{"type":"status","status":"agent_started"}\n'),
    );
    upstreamController?.close();
    const text = await response.text();
    assert.match(text, /agent_started/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) {
      delete process.env.IS_YATIRIM_AGENT_STREAM_URL;
    } else {
      process.env.IS_YATIRIM_AGENT_STREAM_URL = originalUrl;
    }
  }
});

test("rejects requests without an ID token before calling upstream", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    throw new Error("unexpected");
  }) as typeof fetch;

  try {
    const response = await POST(
      new NextRequest("http://localhost/api/is-yatirim/analytics-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Test" }),
      }),
    );
    assert.equal(response.status, 401);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
