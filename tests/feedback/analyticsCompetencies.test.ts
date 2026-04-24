import assert from "node:assert/strict";
import test from "node:test";
import {
  isValidAnalyticsCompetencyId,
  normalizeAnalyticsCompetencyId,
} from "../../lib/analyticsCompetencies";

const COMPETENCY_ID = "e48d5549-e955-49b1-9ee6-571d5a939d97";

test("normalizeAnalyticsCompetencyId trims whitespace and lowercases UUID values", () => {
  const paddedUppercaseId = `  ${COMPETENCY_ID.toUpperCase()}  `;

  assert.equal(normalizeAnalyticsCompetencyId(paddedUppercaseId), COMPETENCY_ID);
});

test("isValidAnalyticsCompetencyId validates UUID format", () => {
  assert.equal(isValidAnalyticsCompetencyId(COMPETENCY_ID), true);
  assert.equal(isValidAnalyticsCompetencyId("unknown"), false);
  assert.equal(isValidAnalyticsCompetencyId(""), false);
});
