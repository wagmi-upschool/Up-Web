import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeAgentViewMode,
  withAgentViewMode,
} from "../../lib/isYatirimAgentMode";

test("view mode defaults safely to simple", () => {
  assert.equal(normalizeAgentViewMode(null), "simple");
  assert.equal(normalizeAgentViewMode("unexpected"), "simple");
  assert.equal(normalizeAgentViewMode("pro"), "pro");
});

test("mode query update preserves unrelated parameters", () => {
  const query = withAgentViewMode(
    new URLSearchParams("conversation=abc&mode=simple"),
    "pro",
  );
  const result = new URLSearchParams(query);
  assert.equal(result.get("conversation"), "abc");
  assert.equal(result.get("mode"), "pro");
});
