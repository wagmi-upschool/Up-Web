import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAnalyticsCompetencyDashboardQuery,
  ECZACIBASI_VALUES_COMPETENCY_ID,
  isValidAnalyticsCompetencyId,
  listAnalyticsCompetencies,
  normalizeAnalyticsCompetencyId,
  resolveAnalyticsCompetency,
  type AnalyticsCompetencyConfig,
} from "../../lib/analyticsCompetencies";

test("resolveAnalyticsCompetency maps Eczacıbaşı values competency to receiver ids", () => {
  const competency = resolveAnalyticsCompetency(ECZACIBASI_VALUES_COMPETENCY_ID);

  assert.ok(competency);
  assert.equal(competency.displayName, "Eczacıbaşı");
  assert.deepEqual(competency.receiverIds, [
    "ab668687-79c5-4059-a269-5e3c44140158",
  ]);
});

test("resolveAnalyticsCompetency normalizes whitespace and UUID case", () => {
  const paddedUppercaseId = `  ${ECZACIBASI_VALUES_COMPETENCY_ID.toUpperCase()}  `;

  assert.equal(
    normalizeAnalyticsCompetencyId(paddedUppercaseId),
    ECZACIBASI_VALUES_COMPETENCY_ID,
  );
  assert.equal(
    resolveAnalyticsCompetency(paddedUppercaseId)?.competencyId,
    ECZACIBASI_VALUES_COMPETENCY_ID,
  );
});

test("resolveAnalyticsCompetency returns null for unknown competencies", () => {
  assert.equal(resolveAnalyticsCompetency("unknown"), null);
});

test("isValidAnalyticsCompetencyId validates UUID format", () => {
  assert.equal(isValidAnalyticsCompetencyId(ECZACIBASI_VALUES_COMPETENCY_ID), true);
  assert.equal(isValidAnalyticsCompetencyId("unknown"), false);
  assert.equal(isValidAnalyticsCompetencyId(""), false);
});

test("buildAnalyticsCompetencyDashboardQuery builds single receiver remote query", () => {
  assert.equal(
    buildAnalyticsCompetencyDashboardQuery(
      ECZACIBASI_VALUES_COMPETENCY_ID,
    )?.toString(),
    "feedbackReceiverId=ab668687-79c5-4059-a269-5e3c44140158",
  );
});

test("buildAnalyticsCompetencyDashboardQuery supports multi receiver configs", () => {
  const configs: AnalyticsCompetencyConfig[] = [
    {
      competencyId: "multi-competency",
      displayName: "Multi",
      periodLabel: "Pulse",
      receiverIds: [
        "7ecb39c2-7c34-4392-9e31-06ab21b206aa",
        "005939f4-849d-44c6-a5b5-319a348ed223",
      ],
    },
  ];

  assert.equal(
    buildAnalyticsCompetencyDashboardQuery(
      "multi-competency",
      configs,
    )?.toString(),
    "feedbackReceiverIds=7ecb39c2-7c34-4392-9e31-06ab21b206aa%2C005939f4-849d-44c6-a5b5-319a348ed223",
  );
});

test("listAnalyticsCompetencies exposes configured competencies", () => {
  assert.deepEqual(
    listAnalyticsCompetencies().map((competency) => competency.competencyId),
    [ECZACIBASI_VALUES_COMPETENCY_ID],
  );
});
