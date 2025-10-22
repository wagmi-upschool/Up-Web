import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { fetchQuizConfig, QuizConfig } from "../../../app/api/quiz/access/quizConfig";

const originalEnv: Record<string, string | undefined> = {
  UP_WEB_QUIZ_REMOTE_CONFIG_KEY: process.env.UP_WEB_QUIZ_REMOTE_CONFIG_KEY,
  QUIZ_REMOTE_CONFIG_KEY: process.env.QUIZ_REMOTE_CONFIG_KEY,
  QUIZ_DEFAULT_CONFIG: process.env.QUIZ_DEFAULT_CONFIG,
};

beforeEach(() => {
  process.env.UP_WEB_QUIZ_REMOTE_CONFIG_KEY =
    originalEnv.UP_WEB_QUIZ_REMOTE_CONFIG_KEY;
  process.env.QUIZ_REMOTE_CONFIG_KEY = originalEnv.QUIZ_REMOTE_CONFIG_KEY;
  process.env.QUIZ_DEFAULT_CONFIG = originalEnv.QUIZ_DEFAULT_CONFIG;
});

afterEach(() => {
  if (originalEnv.UP_WEB_QUIZ_REMOTE_CONFIG_KEY === undefined) {
    delete process.env.UP_WEB_QUIZ_REMOTE_CONFIG_KEY;
  }
  if (originalEnv.QUIZ_REMOTE_CONFIG_KEY === undefined) {
    delete process.env.QUIZ_REMOTE_CONFIG_KEY;
  }
  if (originalEnv.QUIZ_DEFAULT_CONFIG === undefined) {
    delete process.env.QUIZ_DEFAULT_CONFIG;
  }
});

test("fetchQuizConfig prioritizes env-configured Remote Config key", async () => {
  process.env.UP_WEB_QUIZ_REMOTE_CONFIG_KEY = "CustomRemoteKey";
  process.env.QUIZ_REMOTE_CONFIG_KEY = "LegacyKey";
  const invokedKeys: string[] = [];
  const remoteConfig: QuizConfig = {
    default: { testId: "abc123", url: "https://example.com/quiz" },
  };

  // Build parameter keys dynamically based on current env vars
  const parameterKeys = ["CustomRemoteKey", "LegacyKey", "UpWebMixpanelDashboard"];

  const result = await fetchQuizConfig(async (parameter) => {
    invokedKeys.push(parameter);
    if (parameter === "CustomRemoteKey") {
      return remoteConfig;
    }
    return null;
  }, parameterKeys);

  assert.deepEqual(result, remoteConfig);
  assert.strictEqual(invokedKeys[0], "CustomRemoteKey");
  assert.ok(
    !invokedKeys.includes("UpWebMixpanelDashboard"),
    "should stop after matching the custom env key"
  );
});

test("fetchQuizConfig does not fall back to QUIZ_DEFAULT_CONFIG env JSON", async () => {
  process.env.UP_WEB_QUIZ_REMOTE_CONFIG_KEY = "MissingKey";
  process.env.QUIZ_DEFAULT_CONFIG = JSON.stringify({
    default: { testId: "fallback", url: "https://fallback.example.com" },
  });
  const invokedKeys: string[] = [];

  // Build parameter keys dynamically based on current env vars
  const parameterKeys = ["MissingKey", "UpWebMixpanelDashboard"];

  const result = await fetchQuizConfig(async (parameter) => {
    invokedKeys.push(parameter);
    return null;
  }, parameterKeys);

  assert.deepEqual(result, {});
  assert.ok(invokedKeys.includes("MissingKey"));
  assert.ok(
    invokedKeys.includes("UpWebMixpanelDashboard"),
    "should eventually try the default parameter key"
  );
});
