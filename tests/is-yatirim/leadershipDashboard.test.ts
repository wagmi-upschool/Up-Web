import assert from "node:assert/strict";
import test from "node:test";
import {
  applyIsYatirimBreakdownSelectionToSearchParams,
  DEFAULT_IS_YATIRIM_SEGMENT,
  formatIsYatirimDateFilterLabel,
  IS_YATIRIM_DATE_PICKER_MIN_DATE,
  IS_YATIRIM_CLIENT,
  IS_YATIRIM_COMPETENCY_ID,
  IS_YATIRIM_UNVAN_QUERY_PARAM,
  normalizeIsYatirimDateFilter,
  normalizeIsYatirimDateTimePickerFlag,
  normalizeIsYatirimDashboardToken,
  normalizeIsYatirimSegment,
  normalizeIsYatirimUnvan,
  normalizeIsYatirimUnvanFlag,
  normalizeLeadershipDashboardResponse,
  formatTrendWindowLabel,
  getIsYatirimComparisonItems,
  hasIsYatirimUnvanComparisons,
  resolveIsYatirimComparisonBreakdown,
  resolveIsYatirimDateFilterByPickerFlag,
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

test("normalizeIsYatirimDashboardToken trims optional URL token", () => {
  assert.equal(normalizeIsYatirimDashboardToken(null), "");
  assert.equal(normalizeIsYatirimDashboardToken(""), "");
  assert.equal(normalizeIsYatirimDashboardToken("  token-123  "), "token-123");
});

test("normalizeIsYatirimUnvan helpers keep unvan feature URL state explicit", () => {
  assert.equal(normalizeIsYatirimUnvan(null), "");
  assert.equal(normalizeIsYatirimUnvan("  mudur  "), "mudur");
  assert.equal(normalizeIsYatirimUnvanFlag(null), false);
  assert.equal(normalizeIsYatirimUnvanFlag("false"), false);
  assert.equal(normalizeIsYatirimUnvanFlag(" true "), true);
});

test("normalizeIsYatirimDateTimePickerFlag defaults enabled unless explicit false", () => {
  assert.equal(normalizeIsYatirimDateTimePickerFlag(null), true);
  assert.equal(normalizeIsYatirimDateTimePickerFlag(""), true);
  assert.equal(normalizeIsYatirimDateTimePickerFlag("false"), false);
  assert.equal(normalizeIsYatirimDateTimePickerFlag(" true "), true);
});

test("buildIsYatirimDashboardUrl uses isolated fixed request parameters", () => {
  const url = buildIsYatirimDashboardUrl({
    baseUrl: "https://example.com/base/",
    segment: "",
    dateFilter: {
      mode: "single",
      startDate: "2026-06-11",
      endDate: "2026-06-11",
    },
  });

  assert.equal(url.origin, "https://example.com");
  assert.equal(url.pathname, "/base/analytics/dashboard");
  assert.equal(url.searchParams.get("client"), IS_YATIRIM_CLIENT);
  assert.equal(url.searchParams.get("competencyId"), IS_YATIRIM_COMPETENCY_ID);
  assert.equal(url.searchParams.get("segment"), "all");
  assert.equal(url.searchParams.get("dateMode"), "single");
  assert.equal(url.searchParams.get("startDate"), "2026-06-11");
  assert.equal(url.searchParams.get("endDate"), "2026-06-11");
  assert.equal(url.searchParams.get("token"), null);
});

test("buildIsYatirimDashboardUrl forwards İş Yatırım URL token when present", () => {
  const url = buildIsYatirimDashboardUrl({
    baseUrl: "https://example.com",
    segment: "yonetim",
    token: "  secure-token  ",
    dateFilter: {
      mode: "range",
      startDate: "2026-06-01",
      endDate: "2026-06-07",
    },
  });

  assert.equal(url.searchParams.get("segment"), "yonetim");
  assert.equal(url.searchParams.get("dateMode"), "range");
  assert.equal(url.searchParams.get("startDate"), "2026-06-01");
  assert.equal(url.searchParams.get("endDate"), "2026-06-07");
  assert.equal(url.searchParams.get("token"), "secure-token");
});

test("buildIsYatirimDashboardUrl omits date params when date picker flow is disabled", () => {
  const url = buildIsYatirimDashboardUrl({
    baseUrl: "https://example.com",
    segment: "yonetim",
    token: "secure-token",
  });

  assert.equal(url.searchParams.get("segment"), "yonetim");
  assert.equal(url.searchParams.get("dateMode"), null);
  assert.equal(url.searchParams.get("startDate"), null);
  assert.equal(url.searchParams.get("endDate"), null);
  assert.equal(url.searchParams.get("token"), "secure-token");
});

test("applyIsYatirimBreakdownSelectionToSearchParams keeps GMY and Unvan mutually exclusive", () => {
  const params = new URLSearchParams("segment=gmy-1&isUnvan=true");

  applyIsYatirimBreakdownSelectionToSearchParams(params, {
    type: "unvan",
    unvan: "mudur",
    isUnvanEnabled: true,
  });

  assert.equal(params.get("segment"), null);
  assert.equal(params.get(IS_YATIRIM_UNVAN_QUERY_PARAM), "mudur");
  assert.equal(params.get("isUnvan"), "true");

  applyIsYatirimBreakdownSelectionToSearchParams(params, {
    type: "gmy",
    segment: "gmy-2",
  });

  assert.equal(params.get("segment"), "gmy-2");
  assert.equal(params.get(IS_YATIRIM_UNVAN_QUERY_PARAM), null);
  assert.equal(params.get("isUnvan"), "true");
});

test("buildIsYatirimDashboardUrl forwards selected unvan to İş Yatırım upstream URL", () => {
  const params = new URLSearchParams("isUnvan=true&unvan=mudur");
  const url = buildIsYatirimDashboardUrl({
    baseUrl: "https://example.com",
    segment: normalizeIsYatirimSegment(params.get("segment")),
    unvan: normalizeIsYatirimUnvan(params.get("unvan")),
  });

  assert.equal(params.get("unvan"), "mudur");
  assert.equal(url.searchParams.get("segment"), "all");
  assert.equal(url.searchParams.get("unvan"), "mudur");
  assert.equal(url.searchParams.get("isUnvan"), null);
});

test("normalizeIsYatirimDateFilter sanitizes invalid combinations to single today", () => {
  assert.deepEqual(
    normalizeIsYatirimDateFilter(
      {
        dateMode: "range",
        startDate: "2026-06-10",
        endDate: "2026-06-01",
      },
      { todayDate: "2026-06-11" },
    ),
    {
      mode: "single",
      startDate: "2026-06-11",
      endDate: "2026-06-11",
      dayCount: 1,
    },
  );
  assert.deepEqual(
    normalizeIsYatirimDateFilter(
      {
        dateMode: "single",
        startDate: "2026-06-10",
        endDate: "2026-06-09",
      },
      { todayDate: "2026-06-11" },
    ),
    {
      mode: "single",
      startDate: "2026-06-11",
      endDate: "2026-06-11",
      dayCount: 1,
    },
  );
});

test("normalizeIsYatirimDateFilter keeps valid range metadata", () => {
  assert.deepEqual(
    normalizeIsYatirimDateFilter(
      {
        dateMode: "range",
        startDate: "2026-06-01",
        endDate: "2026-06-07",
      },
      { todayDate: "2026-06-11" },
    ),
    {
      mode: "range",
      startDate: "2026-06-01",
      endDate: "2026-06-07",
      dayCount: 7,
    },
  );
});

test("normalizeIsYatirimDateFilter clamps dates before İş Yatırım picker minimum", () => {
  assert.equal(IS_YATIRIM_DATE_PICKER_MIN_DATE, "2026-05-20");

  assert.deepEqual(
    normalizeIsYatirimDateFilter(
      {
        dateMode: "range",
        startDate: "2026-05-01",
        endDate: "2026-06-16",
      },
      { todayDate: "2026-06-16" },
    ),
    {
      mode: "range",
      startDate: "2026-05-20",
      endDate: "2026-06-16",
      dayCount: 28,
    },
  );

  assert.deepEqual(
    normalizeIsYatirimDateFilter(
      {
        dateMode: "single",
        startDate: "2026-05-01",
        endDate: "2026-05-01",
      },
      { todayDate: "2026-06-16" },
    ),
    {
      mode: "single",
      startDate: "2026-05-20",
      endDate: "2026-05-20",
      dayCount: 1,
    },
  );
});

test("resolveIsYatirimDateFilterByPickerFlag gives picker flag priority over date params", () => {
  const dateFilter = normalizeIsYatirimDateFilter(
    {
      dateMode: "range",
      startDate: "2026-06-01",
      endDate: "2026-06-07",
    },
    { todayDate: "2026-06-11" },
  );

  assert.equal(
    resolveIsYatirimDateFilterByPickerFlag(false, dateFilter),
    undefined,
  );
  assert.deepEqual(
    resolveIsYatirimDateFilterByPickerFlag(true, dateFilter),
    dateFilter,
  );
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
  assert.equal(response.meta.dateFilter.mode, "single");
  assert.equal(response.selectedSegment.latest.respondentCount, 0);
  assert.equal(response.selectedSegment.latest.participationRate, 0);
  assert.equal(response.selectedSegment.latest.mostFrequentWord, null);
  assert.deepEqual(response.selectedSegment.wordClouds.bad, []);
  assert.deepEqual(response.selectedSegment.allWords, []);
  assert.equal(response.selectedSegment.engagementByMood.bad.workLinkedRate, 0);
  assert.equal(response.comparisons.gmyRanking.length, 0);
  assert.equal(response.comparisons.unvanRanking.length, 0);
  assert.equal(response.comparisons.unvanScoreChanges.length, 0);
  assert.equal(response.comparisons.unvanExtremes.length, 0);
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

test("normalizeLeadershipDashboardResponse maps and sorts Unvan comparison fields", () => {
  const response = normalizeLeadershipDashboardResponse({
    meta: {
      selectedUnvanId: "mudur",
      dateFilter: {
        mode: "range",
        startDate: "2026-06-01",
        endDate: "2026-06-07",
      },
    },
    selectedSegment: {},
    comparisons: {
      unvanRanking: [
        {
          unvanId: "uzman",
          label: "Uzman",
          averageMoodScore: 3.5,
        },
        {
          unvanId: "mudur",
          label: "Müdür",
          rank: 1,
          averageMoodScore: 3.1,
        },
      ],
      unvanScoreChanges: [
        {
          unvanId: "mudur",
          label: "Müdür",
          previousStartDate: "2026-05-25",
          previousEndDate: "2026-05-31",
          currentStartDate: "2026-06-01",
          currentEndDate: "2026-06-07",
          delta: 0.4,
        },
      ],
      unvanExtremes: [
        {
          unvanId: "uzman-yardimcisi",
          label: "Uzman Yardımcısı",
          badRate: 12.5,
          greatRate: 31.2,
        },
      ],
    },
  });

  assert.deepEqual(
    response.comparisons.unvanRanking.map((item) => item.segmentId),
    ["mudur", "uzman"],
  );
  assert.equal(response.comparisons.unvanScoreChanges[0]?.segmentId, "mudur");
  assert.equal(response.comparisons.unvanScoreChanges[0]?.mode, "range");
  assert.equal(
    response.comparisons.unvanExtremes[0]?.segmentId,
    "uzman-yardimcisi",
  );
});

test("resolveIsYatirimComparisonBreakdown only activates Unvan when flag, selection, and data exist", () => {
  const emptyResponse = normalizeLeadershipDashboardResponse({
    selectedSegment: {},
    comparisons: {},
  });
  const response = normalizeLeadershipDashboardResponse({
    selectedSegment: {},
    comparisons: {
      unvanRanking: [{ unvanId: "mudur", label: "Müdür" }],
    },
  });

  assert.equal(hasIsYatirimUnvanComparisons(emptyResponse.comparisons), false);
  assert.equal(hasIsYatirimUnvanComparisons(response.comparisons), true);
  assert.equal(
    resolveIsYatirimComparisonBreakdown({
      comparisons: response.comparisons,
      isUnvanComparisonEnabled: false,
      selectedUnvan: "mudur",
    }),
    "gmy",
  );
  assert.equal(
    resolveIsYatirimComparisonBreakdown({
      comparisons: response.comparisons,
      isUnvanComparisonEnabled: true,
      selectedUnvan: "",
    }),
    "gmy",
  );
  assert.equal(
    resolveIsYatirimComparisonBreakdown({
      comparisons: response.comparisons,
      isUnvanComparisonEnabled: true,
      selectedUnvan: "",
    }),
    "gmy",
  );
  assert.equal(
    resolveIsYatirimComparisonBreakdown({
      comparisons: emptyResponse.comparisons,
      isUnvanComparisonEnabled: true,
      selectedUnvan: "mudur",
    }),
    "gmy",
  );
  assert.equal(
    resolveIsYatirimComparisonBreakdown({
      comparisons: response.comparisons,
      isUnvanComparisonEnabled: true,
      selectedUnvan: "mudur",
    }),
    "unvan",
  );
});

test("getIsYatirimComparisonItems uses full Unvan comparison arrays", () => {
  const response = normalizeLeadershipDashboardResponse({
    selectedSegment: {},
    comparisons: {
      gmyRanking: [{ segmentId: "gmy-1", label: "GMY", rank: 1 }],
      gmyScoreChanges: [{ segmentId: "gmy-1", label: "GMY" }],
      gmyExtremes: [{ segmentId: "gmy-1", label: "GMY" }],
      unvanRanking: [
        { unvanId: "mudur", label: "Müdür", rank: 1 },
        { unvanId: "direktor", label: "Direktör", rank: 2 },
      ],
      unvanScoreChanges: [
        { unvanId: "mudur", label: "Müdür" },
        { unvanId: "direktor", label: "Direktör" },
      ],
      unvanExtremes: [
        { unvanId: "mudur", label: "Müdür" },
        { unvanId: "direktor", label: "Direktör" },
      ],
    },
  });

  const unvanItems = getIsYatirimComparisonItems(
    response.comparisons,
    "unvan",
  );
  assert.deepEqual(
    unvanItems.rankingItems.map((item) => item.segmentId),
    ["mudur", "direktor"],
  );
  assert.deepEqual(
    unvanItems.scoreChangeItems.map((item) => item.segmentId),
    ["mudur", "direktor"],
  );
  assert.deepEqual(
    unvanItems.extremeItems.map((item) => item.segmentId),
    ["mudur", "direktor"],
  );

  const gmyItems = getIsYatirimComparisonItems(response.comparisons, "gmy");
  assert.deepEqual(
    gmyItems.rankingItems.map((item) => item.segmentId),
    ["gmy-1"],
  );
});

test("normalizeLeadershipDashboardResponse keeps full range date comparison rows", () => {
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

  assert.equal(response.comparisons.dateComparison.length, 5);
  assert.equal(
    response.comparisons.dateComparison.at(-1)?.surveyDate,
    "2026-05-31",
  );
});

test("normalizeLeadershipDashboardResponse maps date filter metadata into response", () => {
  const response = normalizeLeadershipDashboardResponse(
    {
      meta: {
        selectedUnvanId: "mudur",
        dateFilter: {
          mode: "range",
          startDate: "2026-06-01",
          endDate: "2026-06-07",
          dayCount: 7,
        },
      },
      selectedSegment: {
        latest: {
          startDate: "2026-06-01",
          endDate: "2026-06-07",
          dateMode: "range",
          dayCount: 7,
        },
      },
      selectedUnvan: {
        segmentId: "mudur",
        segmentLabel: "Müdür",
        latest: {
          startDate: "2026-06-01",
          endDate: "2026-06-07",
          dateMode: "range",
          dayCount: 7,
          respondentCount: 14,
          targetEmployeeCount: 77,
          participationRate: 2.6,
          averageMoodScore: 3.2,
        },
        trend: [
          {
            surveyDate: "2026-06-01",
            respondentCount: 2,
            averageMoodScore: 3.5,
          },
        ],
      },
      comparisons: {
        gmyScoreChanges: [
          {
            mode: "range",
            previousStartDate: "2026-05-25",
            previousEndDate: "2026-05-31",
            currentStartDate: "2026-06-01",
            currentEndDate: "2026-06-07",
          },
        ],
      },
    },
    {
      fallbackDateFilter: {
        mode: "single",
        startDate: "2026-06-11",
        endDate: "2026-06-11",
        dayCount: 1,
      },
    },
  );

  assert.deepEqual(response.meta.dateFilter, {
    mode: "range",
    startDate: "2026-06-01",
    endDate: "2026-06-07",
    dayCount: 7,
  });
  assert.equal(response.meta.selectedUnvanId, "mudur");
  assert.equal(response.selectedSegment.latest.dateMode, "range");
  assert.equal(response.selectedSegment.latest.startDate, "2026-06-01");
  assert.equal(response.selectedSegment.latest.endDate, "2026-06-07");
  assert.equal(response.selectedSegment.latest.dayCount, 7);
  assert.equal(response.selectedUnvan?.segmentId, "mudur");
  assert.equal(response.selectedUnvan?.segmentLabel, "Müdür");
  assert.equal(response.selectedUnvan?.latest.respondentCount, 14);
  assert.equal(response.selectedUnvan?.latest.averageMoodScore, 3.2);
  assert.equal(response.selectedUnvan?.trend[0]?.respondentCount, 2);
  assert.equal(response.comparisons.gmyScoreChanges[0]?.mode, "range");
  assert.equal(
    response.comparisons.gmyScoreChanges[0]?.previousStartDate,
    "2026-05-25",
  );
  assert.equal(
    response.comparisons.gmyScoreChanges[0]?.currentEndDate,
    "2026-06-07",
  );
});

test("formatIsYatirimDateFilterLabel renders single and range labels", () => {
  assert.equal(
    formatIsYatirimDateFilterLabel({
      mode: "single",
      startDate: "2026-06-04",
      endDate: "2026-06-04",
      dayCount: 1,
    }),
    "4 Haziran 2026 Perşembe",
  );
  assert.equal(
    formatIsYatirimDateFilterLabel({
      mode: "range",
      startDate: "2026-06-04",
      endDate: "2026-06-10",
      dayCount: 7,
    }),
    "4–10 Haz 2026 · 7 gün",
  );
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
