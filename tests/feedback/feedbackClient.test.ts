import assert from "node:assert/strict";
import test from "node:test";
import {
  getReceivers,
  getQuestions,
  parseFeedbackApiErrorPayload,
  submitSurvey,
} from "../../lib/feedbackClient";

const apiBase = "https://feedback-api.test";

function mockFetch(json: unknown = { body: {} }) {
  const calls: { url: string; init?: RequestInit }[] = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: `${input}`, init });
    return new Response(JSON.stringify(json), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  return calls;
}

test("getQuestions includes token when provided", async () => {
  process.env.NEXT_PUBLIC_REMOTE_URL = apiBase;
  const calls = mockFetch({ body: { feedback_receiver_id: "receiver-1" } });

  await getQuestions("giver-1", "receiver-1", undefined, "v1.token");

  assert.equal(
    calls[0]?.url,
    `${apiBase}/feedback/questions?feedbackGiverId=giver-1&feedbackReceiverId=receiver-1&token=v1.token`,
  );
});

test("getReceivers includes token when provided", async () => {
  process.env.NEXT_PUBLIC_REMOTE_URL = apiBase;
  const calls = mockFetch({
    body: { is_isy: false, feedback_receivers: [] },
  });

  await getReceivers("giver-1", undefined, "v1.token");

  assert.equal(
    calls[0]?.url,
    `${apiBase}/feedback/receivers?feedbackGiverId=giver-1&token=v1.token`,
  );
});

test("getQuestions keeps legacy query shape when token is absent", async () => {
  process.env.NEXT_PUBLIC_REMOTE_URL = apiBase;
  const calls = mockFetch({ body: { feedback_receiver_id: "receiver-1" } });

  await getQuestions("giver-1", "receiver-1");

  assert.equal(
    calls[0]?.url,
    `${apiBase}/feedback/questions?feedbackGiverId=giver-1&feedbackReceiverId=receiver-1`,
  );
});

test("submitSurvey serializes optional token in the request body", async () => {
  process.env.NEXT_PUBLIC_REMOTE_URL = apiBase;
  const calls = mockFetch({
    body: { survey_id: "survey-1", submitted_at: "now" },
  });

  await submitSurvey({
    feedback_giver_id: "giver-1",
    feedback_receiver_id: "receiver-1",
    competency_id: "competency-1",
    feedback_module: "survey",
    survey_type: "peer",
    answers: [],
    token: "v1.token",
  });

  assert.deepEqual(JSON.parse(`${calls[0]?.init?.body}`), {
    feedback_giver_id: "giver-1",
    feedback_receiver_id: "receiver-1",
    competency_id: "competency-1",
    feedback_module: "survey",
    survey_type: "peer",
    answers: [],
    token: "v1.token",
  });
});

test("submitSurvey omits token when payload does not include it", async () => {
  process.env.NEXT_PUBLIC_REMOTE_URL = apiBase;
  const calls = mockFetch({
    body: { survey_id: "survey-1", submitted_at: "now" },
  });

  await submitSurvey({
    feedback_giver_id: "giver-1",
    feedback_receiver_id: "receiver-1",
    competency_id: "competency-1",
    feedback_module: "survey",
    survey_type: "peer",
    answers: [],
  });

  const body = JSON.parse(`${calls[0]?.init?.body}`);
  assert.equal("token" in body, false);
});

test("parseFeedbackApiErrorPayload supports top-level and wrapped backend errors", () => {
  assert.deepEqual(
    parseFeedbackApiErrorPayload(
      {
        errorCode: "LINK_EXPIRED",
        errorMessage: "Feedback link has expired",
        feedback_link_type: "weekly",
      },
      410,
      "Gone",
    ),
    {
      code: "LINK_EXPIRED",
      message: "Feedback link has expired",
      feedbackLinkType: "weekly",
    },
  );

  assert.deepEqual(
    parseFeedbackApiErrorPayload(
      {
        body: {
          errorCode: "LINK_USED",
          errorMessage: "Feedback link was already used",
          feedback_link_type: "weekly",
        },
      },
      409,
      "Conflict",
    ),
    {
      code: "LINK_USED",
      message: "Feedback link was already used",
      feedbackLinkType: "weekly",
    },
  );
});
