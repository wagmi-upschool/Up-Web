import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_IS_YATIRIM_SEGMENT,
  IS_YATIRIM_CLIENT,
  IS_YATIRIM_COMPETENCY_ID,
  normalizeIsYatirimSegment,
  normalizeLeadershipDashboardResponse,
  formatTrendWindowLabel,
} from "../../lib/isYatirimLeadershipDashboard";
import {
  buildIsYatirimDashboardUrl,
  getIsYatirimDashboardBaseUrl,
} from "../../lib/isYatirimLeadershipDashboardRoute";

test("normalizeIsYatirimSegment defaults blank segment to all", () => {
  assert.equal(normalizeIsYatirimSegment(null), DEFAULT_IS_YATIRIM_SEGMENT);
  assert.equal(normalizeIsYatirimSegment(""), DEFAULT_IS_YATIRIM_SEGMENT);
  assert.equal(normalizeIsYatirimSegment("   "), DEFAULT_IS_YATIRIM_SEGMENT);
  assert.equal(normalizeIsYatirimSegment("burak-kinalilar"), "burak-kinalilar");
});

test("buildIsYatirimDashboardUrl uses isolated fixed request parameters", () => {
  const url = buildIsYatirimDashboardUrl({
    baseUrl: "https://example.com/base/",
    segment: "",
  });

  assert.equal(url.origin, "https://example.com");
  assert.equal(url.pathname, "/base/analytics/dashboard");
  assert.equal(url.searchParams.get("client"), IS_YATIRIM_CLIENT);
  assert.equal(url.searchParams.get("competencyId"), IS_YATIRIM_COMPETENCY_ID);
  assert.equal(url.searchParams.get("segment"), "all");
});

test("getIsYatirimDashboardBaseUrl prefers İş Yatırım env names", () => {
  assert.equal(
    getIsYatirimDashboardBaseUrl({
      IS_YATIRIM_DASHBOARD_REMOTE_URL: "https://is.example.com/",
      DASHBOARD_REMOTE_URL: "https://generic.example.com",
    }),
    "https://is.example.com",
  );
  assert.equal(
    getIsYatirimDashboardBaseUrl({
      REMOTE_URL: "https://fallback.example.com/",
    }),
    "https://fallback.example.com",
  );
});

test("normalizeLeadershipDashboardResponse fills empty arrays and numeric fallbacks", () => {
  const response = normalizeLeadershipDashboardResponse({
    meta: {
      organizationName: "İş Yatırım",
      selectedSegmentId: "all",
      segments: [{ id: "all", label: "Tüm Şirket", type: "all" }],
    },
    selectedSegment: {
      latest: {
        mostFrequentWord: null,
      },
    },
    comparisons: {},
  });

  assert.equal(response.meta.organizationId, IS_YATIRIM_CLIENT);
  assert.equal(response.meta.segments.length, 1);
  assert.equal(response.selectedSegment.latest.respondentCount, 0);
  assert.equal(response.selectedSegment.latest.participationRate, 0);
  assert.equal(response.selectedSegment.latest.mostFrequentWord, null);
  assert.deepEqual(response.selectedSegment.wordClouds.bad, []);
  assert.deepEqual(response.selectedSegment.allWords, []);
  assert.equal(response.selectedSegment.engagementByMood.bad.workLinkedRate, 0);
  assert.equal(response.comparisons.gmyRanking.length, 0);
  assert.equal(response.comparisons.dateComparison.length, 0);
});

test("normalizeLeadershipDashboardResponse sorts GMY ranking by rank then score", () => {
  const response = normalizeLeadershipDashboardResponse({
    selectedSegment: {},
    comparisons: {
      gmyRanking: [
        {
          segmentId: "second",
          label: "B",
          rank: 2,
          averageMoodScore: 3.8,
        },
        {
          segmentId: "first",
          label: "A",
          rank: 1,
          averageMoodScore: 3.2,
        },
        {
          segmentId: "no-rank-high",
          label: "C",
          rank: 0,
          averageMoodScore: 3.9,
        },
      ],
    },
  });

  assert.deepEqual(
    response.comparisons.gmyRanking.map((item) => item.segmentId),
    ["first", "second", "no-rank-high"],
  );
});

test("normalizeLeadershipDashboardResponse keeps latest four date comparison rows", () => {
  const response = normalizeLeadershipDashboardResponse({
    selectedSegment: {},
    comparisons: {
      dateComparison: [
        { surveyDate: "2026-06-04" },
        { surveyDate: "2026-06-03" },
        { surveyDate: "2026-06-02" },
        { surveyDate: "2026-06-01" },
        { surveyDate: "2026-05-31" },
      ],
    },
  });

  assert.equal(response.comparisons.dateComparison.length, 4);
  assert.equal(response.comparisons.dateComparison.at(-1)?.surveyDate, "2026-06-01");
});

test("formatTrendWindowLabel derives day count and date range from trend data", () => {
  const trend = [
    { surveyDate: "2026-05-20", surveyDateLabel: "20 May" },
    { surveyDate: "2026-05-21", surveyDateLabel: "21 May" },
    { surveyDate: "2026-05-22", surveyDateLabel: "22 May" },
    { surveyDate: "2026-05-25", surveyDateLabel: "25 May" },
    { surveyDate: "2026-06-01", surveyDateLabel: "1 Haz" },
    { surveyDate: "2026-06-02", surveyDateLabel: "2 Haz" },
    { surveyDate: "2026-06-03", surveyDateLabel: "3 Haz" },
  ].map((point) => ({
    ...point,
    respondentCount: 0,
    participationRate: 0,
    averageMoodScore: 0,
    badRate: 0,
    mehRate: 0,
    goodRate: 0,
    greatRate: 0,
  }));

  assert.equal(
    formatTrendWindowLabel(trend),
    "7 günlük trend (20 May – 3 Haz)",
  );
  assert.equal(formatTrendWindowLabel([], "Fallback trend"), "Fallback trend");
});
