import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT,
  IS_YATIRIM_WEEKLY_COMPETENCY_ID,
  IS_YATIRIM_WEEKLY_LIKERT_CUTOVER_WEEK,
  IS_YATIRIM_WEEKLY_PICKER_MIN_DATE,
  IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE,
  IS_YATIRIM_WEEKLY_CLIENT,
  WEEKLY_PARTICIPATION_DAYS,
  getIsYatirimWeeklyQuestionModel,
  getMondayForIsoDate,
  normalizeIsYatirimWeekFilter,
  normalizeIsYatirimWeeklySegment,
  normalizeIsYatirimWeeklyToken,
  normalizeWeeklyDashboardResponse,
} from "../../lib/isYatirimWeeklyDashboard";
import { buildIsYatirimWeeklyDashboardUrl } from "../../lib/isYatirimWeeklyDashboardRoute";

test("normalizeIsYatirimWeeklySegment defaults blank segment to all", () => {
  assert.equal(
    normalizeIsYatirimWeeklySegment(null),
    DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT,
  );
  assert.equal(normalizeIsYatirimWeeklySegment(""), DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT);
  assert.equal(normalizeIsYatirimWeeklySegment("  "), DEFAULT_IS_YATIRIM_WEEKLY_SEGMENT);
  assert.equal(normalizeIsYatirimWeeklySegment("gmy-1"), "gmy-1");
});

test("normalizeIsYatirimWeeklyToken trims URL token", () => {
  assert.equal(normalizeIsYatirimWeeklyToken(null), "");
  assert.equal(normalizeIsYatirimWeeklyToken("  weekly-token  "), "weekly-token");
});

test("getMondayForIsoDate normalizes selected date to Monday", () => {
  assert.equal(getMondayForIsoDate("2026-06-10"), "2026-06-08");
  assert.equal(getMondayForIsoDate("2026-06-08"), "2026-06-08");
  assert.equal(getMondayForIsoDate("invalid"), "");
});

test("normalizeIsYatirimWeekFilter falls back when week date is missing", () => {
  assert.deepEqual(
    normalizeIsYatirimWeekFilter({
      weekMode: "week",
      weekStartDate: "",
    }),
    { mode: "last_week" },
  );
});

test("normalizeIsYatirimWeekFilter clamps weekly selection before 20 May 2026", () => {
  assert.equal(IS_YATIRIM_WEEKLY_PICKER_MIN_DATE, "2026-05-20");
  assert.equal(IS_YATIRIM_WEEKLY_PICKER_MIN_WEEK_START_DATE, "2026-05-18");
  assert.deepEqual(
    normalizeIsYatirimWeekFilter({
      weekMode: "week",
      weekStartDate: "2026-05-01",
    }),
    { mode: "week", weekStartDate: "2026-05-18" },
  );
});

test("normalizeIsYatirimWeekFilter excludes the holiday week", () => {
  assert.deepEqual(
    normalizeIsYatirimWeekFilter({
      weekMode: "week",
      weekStartDate: "2026-05-25",
    }),
    { mode: "last_week" },
  );
});

test("weekly question model switches at the H7 cutover even with zero responses", () => {
  assert.equal(IS_YATIRIM_WEEKLY_LIKERT_CUTOVER_WEEK, "2026-07-06");
  assert.equal(
    getIsYatirimWeeklyQuestionModel({
      weekFilter: { mode: "week", weekStartDate: "2026-06-29" },
      todayIsoDate: "2026-07-13",
    }),
    "legacy",
  );
  assert.equal(
    getIsYatirimWeeklyQuestionModel({
      weekFilter: { mode: "week", weekStartDate: "2026-07-06" },
      todayIsoDate: "2026-07-13",
    }),
    "likert",
  );
});

test("weekly question model honors Likert responses on an older single week", () => {
  assert.equal(
    getIsYatirimWeeklyQuestionModel({
      weekFilter: { mode: "week", weekStartDate: "2026-06-29" },
      recognitionQuestions: [
        {
          id: "manager_recognition",
          questionId: "manager",
          questionText: "Manager recognition",
          respondentCount: 1,
          averageScore: 4,
          positiveRate: 100,
          distribution: {},
        },
      ],
      todayIsoDate: "2026-07-13",
    }),
    "likert",
  );
});

test("weekly question model keeps legacy and Likert weeks separate in ranges", () => {
  assert.equal(
    getIsYatirimWeeklyQuestionModel({
      weekFilter: { mode: "last_4_weeks" },
      todayIsoDate: "2026-07-13",
    }),
    "mixed",
  );
  assert.equal(
    getIsYatirimWeeklyQuestionModel({
      weekFilter: { mode: "last_4_weeks" },
      todayIsoDate: "2026-08-03",
    }),
    "likert",
  );
});

test("buildIsYatirimWeeklyDashboardUrl sends isolated weekly request parameters", () => {
  const url = buildIsYatirimWeeklyDashboardUrl({
    baseUrl: "https://example.com/base/",
    segment: "",
  });

  assert.equal(url.origin, "https://example.com");
  assert.equal(url.pathname, "/base/analytics/dashboard");
  assert.equal(url.searchParams.get("client"), IS_YATIRIM_WEEKLY_CLIENT);
  assert.equal(url.searchParams.get("isWeekly"), "true");
  assert.equal(url.searchParams.get("segment"), "all");
  assert.equal(
    url.searchParams.get("competencyId"),
    IS_YATIRIM_WEEKLY_COMPETENCY_ID,
  );
  assert.equal(url.searchParams.get("weekMode"), "last_week");
  assert.equal(url.searchParams.get("weekStartDate"), null);
});

test("buildIsYatirimWeeklyDashboardUrl forwards segment token and preset week modes", () => {
  for (const weekMode of ["last_week", "last_4_weeks"] as const) {
    const url = buildIsYatirimWeeklyDashboardUrl({
      baseUrl: "https://example.com",
      segment: "gmy-1",
      token: " secure-token ",
      weekFilter: { mode: weekMode },
    });

    assert.equal(url.searchParams.get("client"), "is-yatirim");
    assert.equal(url.searchParams.get("isWeekly"), "true");
    assert.equal(url.searchParams.get("segment"), "gmy-1");
    assert.equal(url.searchParams.get("token"), "secure-token");
    assert.equal(url.searchParams.get("weekMode"), weekMode);
    assert.equal(url.searchParams.get("weekStartDate"), null);
    assert.equal(
      url.searchParams.get("competencyId"),
      IS_YATIRIM_WEEKLY_COMPETENCY_ID,
    );
  }
});

test("normalizeIsYatirimWeekFilter falls back for unsupported weekly ranges", () => {
  assert.deepEqual(
    normalizeIsYatirimWeekFilter({ weekMode: "last_8_weeks" }),
    { mode: "last_week" },
  );
});

test("buildIsYatirimWeeklyDashboardUrl only sends weekStartDate for week mode", () => {
  const weeklyUrl = buildIsYatirimWeeklyDashboardUrl({
    baseUrl: "https://example.com",
    weekFilter: {
      mode: "week",
      weekStartDate: "2026-06-10",
    },
  });

  assert.equal(weeklyUrl.searchParams.get("weekMode"), "week");
  assert.equal(weeklyUrl.searchParams.get("weekStartDate"), "2026-06-08");

  const presetUrl = buildIsYatirimWeeklyDashboardUrl({
    baseUrl: "https://example.com",
    weekFilter: {
      mode: "last_week",
      weekStartDate: "2026-06-08",
    },
  });

  assert.equal(presetUrl.searchParams.get("weekMode"), "last_week");
  assert.equal(presetUrl.searchParams.get("weekStartDate"), null);
});

test("buildIsYatirimWeeklyDashboardUrl forwards selected unvan for weekly requests", () => {
  const url = buildIsYatirimWeeklyDashboardUrl({
    baseUrl: "https://example.com",
    segment: "",
    unvan: "  mudur  ",
    weekFilter: { mode: "last_week" },
  });

  assert.equal(url.searchParams.get("isWeekly"), "true");
  assert.equal(url.searchParams.get("segment"), "all");
  assert.equal(url.searchParams.get("unvan"), "mudur");
  assert.equal(url.searchParams.get("isUnvan"), null);
});

test("normalizeWeeklyDashboardResponse fills safe weekly fallbacks", () => {
  const response = normalizeWeeklyDashboardResponse({
    meta: {
      periodLabel: "Bu Hafta",
      segments: [{ id: "all", label: "Tüm Şirket", type: "all" }],
      categories: [{ id: "takdir", label: "Takdir" }],
    },
    selectedSegment: {
      kpis: {
        participant: { value: 207 },
        noneOnly: { value: 23.2 },
        topExpectationGap: {
          label: "Takdir",
          value: 16.4,
        },
      },
      participation: {
        days: [
          { day: "Pazartesi", value: 12 },
          { day: "Cuma", value: 8 },
        ],
      },
      table: {},
    },
  });

  assert.equal(response.meta.segments.length, 1);
  assert.deepEqual(response.meta.unvans, []);
  assert.equal(response.meta.categories[0]?.label, "Takdir");
  assert.equal(response.selectedSegment.kpis.participant.value, 207);
  assert.deepEqual(
    response.selectedSegment.participation.days.map((day) => day.day),
    [...WEEKLY_PARTICIPATION_DAYS],
  );
  assert.equal(response.selectedSegment.participation.days[0]?.value, 8);
  assert.equal(response.selectedSegment.participation.days[3]?.value, 12);
  assert.deepEqual(response.selectedSegment.experiencedFeelings, []);
  assert.deepEqual(response.selectedSegment.table.rows, []);
});

test("normalizeWeeklyDashboardResponse maps additive weekly unvan fields", () => {
  const response = normalizeWeeklyDashboardResponse({
    meta: {
      selectedUnvanId: "mudur",
      unvans: [
        {
          id: "mudur",
          label: "Müdür",
          respondentCount: 12,
        },
      ],
    },
    selectedSegment: {
      kpis: {
        participant: { value: 207 },
      },
    },
    selectedUnvan: {
      kpis: {
        participant: { value: 12 },
        noneOnly: { percentage: 10 },
        topExpectationGap: { label: "Takdir", balancePp: 8.4 },
      },
      experiencedFeelings: [
        {
          category: "appreciation",
          label: "Takdir",
          percentage: 22.5,
        },
      ],
      participation: {
        days: [{ day: "Cuma", respondentCount: 4 }],
      },
      table: {
        rows: [
          {
            label: "Takdir",
            experiencePercentage: 22.5,
          },
        ],
      },
    },
  });

  assert.equal(response.meta.selectedUnvanId, "mudur");
  assert.equal(response.meta.unvans[0]?.id, "mudur");
  assert.equal(response.meta.unvans[0]?.label, "Müdür");
  assert.equal(response.meta.unvans[0]?.respondentCount, 12);
  assert.equal(response.selectedSegment.kpis.participant.value, 207);
  assert.equal(response.selectedUnvan?.kpis.participant.value, 12);
  assert.equal(response.selectedUnvan?.kpis.noneOnly.value, 10);
  assert.equal(response.selectedUnvan?.kpis.topExpectationGap.value, 8.4);
  assert.equal(response.selectedUnvan?.experiencedFeelings[0]?.current, 22.5);
  assert.equal(response.selectedUnvan?.participation.days[0]?.value, 4);
  assert.equal(response.selectedUnvan?.table.rows[0]?.experienced, 22.5);
});

test("normalizeWeeklyDashboardResponse maps weekly recognition questions", () => {
  const response = normalizeWeeklyDashboardResponse({
    selectedSegment: {
      weeklySeries: [
        {
          weekStartDate: "2026-07-06",
          recognitionQuestions: [
            {
              id: "manager_recognition",
              respondentCount: 4,
              distribution: {},
            },
          ],
        },
      ],
      recognitionQuestions: [
        {
          id: "manager_recognition",
          questionId: "c0fc2147-9f0a-4201-b3b3-fa670f0b12e6",
          questionText:
            "Bu hafta yöneticim katkımı açık ve net olarak takdir etti.",
          respondentCount: 179,
          averageScore: 2.67,
          positiveRate: 62.9,
          distribution: {
            1: {
              score: 1,
              label: "Hayır, bu hafta hiç olmadı",
              respondentCount: 24,
              percentage: 10.2,
            },
            2: {
              score: 2,
              label: "Oldu ama net değildi",
              respondentCount: 63,
              percentage: 26.8,
            },
            3: {
              score: 3,
              label: "Evet, en az bir kez",
              respondentCount: 115,
              percentage: 48.9,
            },
            4: {
              score: 4,
              label: "Evet, birden fazla kez",
              respondentCount: 33,
              percentage: 14,
            },
          },
        },
      ],
    },
    selectedUnvan: {
      period: {
        recognitionQuestions: [
          {
            id: "peer_recognition",
            questionId: "850f6051-89ff-496a-8b83-7586a178754f",
            questionText:
              "Bu hafta bir ekip arkadaşımın katkısını açıkça ve spesifik olarak takdir ettim.",
            respondentCount: 0,
            averageScore: 0,
            distribution: {
              1: { score: 1, label: "Hayır, bu hafta hiç olmadı" },
              2: { score: 2, label: "Oldu ama spesifik değildi" },
              3: { score: 3, label: "Evet, en az bir kez" },
              4: { score: 4, label: "Evet, birden fazla kez" },
            },
          },
        ],
      },
    },
  });

  const managerRecognition = response.selectedSegment.recognitionQuestions[0];
  assert.equal(managerRecognition?.id, "manager_recognition");
  assert.equal(managerRecognition?.averageScore, 2.67);
  assert.equal(managerRecognition?.positiveRate, 62.9);
  assert.equal(
    managerRecognition?.distribution["2"]?.label,
    "Oldu ama net değildi",
  );
  assert.equal(managerRecognition?.distribution["4"]?.percentage, 14);
  assert.equal(
    response.selectedSegment.weeklySeries[0]?.recognitionQuestions?.[0]
      ?.respondentCount,
    4,
  );

  const peerRecognition = response.selectedUnvan?.recognitionQuestions[0];
  assert.equal(peerRecognition?.id, "peer_recognition");
  assert.equal(peerRecognition?.respondentCount, 0);
  assert.equal(peerRecognition?.averageScore, 0);
  assert.equal(peerRecognition?.positiveRate, 0);
  assert.equal(
    peerRecognition?.distribution["3"]?.label,
    "Evet, en az bir kez",
  );
});

test("normalizeWeeklyDashboardResponse preserves expectation balance signs", () => {
  const response = normalizeWeeklyDashboardResponse({
    selectedSegment: {
      expectationBalance: [
        { label: "Takdir", value: 16.4 },
        { label: "Neşe", value: -7.7 },
      ],
    },
  });

  assert.equal(response.selectedSegment.expectationBalance[0]?.value, 16.4);
  assert.equal(response.selectedSegment.expectationBalance[1]?.value, -7.7);
});

test("normalizeWeeklyDashboardResponse preserves week comparison labels", () => {
  const response = normalizeWeeklyDashboardResponse({
    meta: {
      periodLabel: "H3 · 8-14 Haz",
      weekFilter: {
        mode: "last_week",
        periodLabel: "H3 · 8-14 Haz",
      },
      previousWeekFilter: {
        mode: "week",
        weekStartDate: "2026-06-01",
        periodLabel: "H2 · 1-7 Haz",
      },
    },
  });

  assert.equal(response.meta.weekFilter.periodLabel, "H3 · 8-14 Haz");
  assert.equal(response.meta.previousWeekFilter?.periodLabel, "H2 · 1-7 Haz");
});

test("normalizeWeeklyDashboardResponse labels participant when previous week is missing", () => {
  const response = normalizeWeeklyDashboardResponse({
    selectedSegment: {
      kpis: {
        participant: {
          total: 235,
          previousTotal: 0,
          deltaPercentage: null,
        },
      },
    },
  });

  assert.equal(response.selectedSegment.kpis.participant.value, 235);
  assert.equal(response.selectedSegment.kpis.participant.delta, undefined);
  assert.equal(
    response.selectedSegment.kpis.participant.deltaLabel,
    "Önceki hafta yok",
  );
});

test("normalizeWeeklyDashboardResponse filters unavailable weekly participation series", () => {
  const response = normalizeWeeklyDashboardResponse({
    selectedSegment: {
      participation: {
        days: [],
        weeklySeries: [
          {
            weekStart: "2026-05-04",
            label: "H-1 · 4-10 May",
            days: [{ day: "friday", respondentCount: 10 }],
          },
          {
            weekStart: "2026-05-18",
            label: "H1 · 18-24 May",
            days: [{ day: "friday", respondentCount: 201 }],
          },
          {
            weekStart: "2026-05-25",
            label: "H2 · 25-31 May",
            days: [{ day: "friday", respondentCount: 157 }],
          },
          {
            weekStart: "2026-06-15",
            label: "H4 · 15-21 Haz",
            days: [{ day: "friday", respondentCount: 0 }],
          },
        ],
      },
    },
  });

  assert.deepEqual(
    response.selectedSegment.participation.weeklySeries.map((series) => ({
      label: series.label,
      weekStartDate: series.weekStartDate,
      friday: series.days[0]?.value,
    })),
    [{ label: "H1 · 18-24 May", weekStartDate: "2026-05-18", friday: 201 }],
  );
});

test("normalizeWeeklyDashboardResponse maps backend weekly dashboard fields", () => {
  const response = normalizeWeeklyDashboardResponse({
    meta: {
      periodLabel: "H3 · 8-14 Haz",
      categories: {
        experienced: [{ id: "appreciation", label: "Takdir" }],
        desired: [{ id: "appreciation", label: "Takdir" }],
      },
    },
    selectedSegment: {
      kpis: {
        participant: {
          total: 164,
          weeklyAverage: 164,
          previousTotal: 157,
          deltaPercentage: 4.5,
        },
        noneOnly: { percentage: 25, count: 41, previousPercentage: 23.8, deltaPp: 1.2 },
        topExpectationGap: {
          category: "appreciation",
          label: "Takdir",
          balancePp: 15.2,
          desiredPercentage: 34.1,
          experiencedPercentage: 18.9,
        },
      },
      experiencedFeelings: [
        {
          category: "appreciation",
          label: "Takdir",
          percentage: 18.9,
          previousPercentage: 16.1,
          deltaPp: 2.8,
        },
      ],
      expectationBalance: [
        {
          category: "appreciation",
          label: "Takdir",
          balancePp: 15.2,
          previousBalancePp: 17.6,
          deltaPp: -2.4,
        },
      ],
      table: {
        rows: [
          {
            category: "appreciation",
            label: "Takdir",
            experiencePercentage: 18.9,
            experienceChangePp: 2.8,
            desiredPercentage: 34.1,
            balancePp: 15.2,
            balanceLabel: "+15.2pp · açık",
          },
        ],
      },
    },
  });

  assert.equal(response.meta.categories[0]?.id, "appreciation");
  assert.equal(response.selectedSegment.kpis.participant.value, 164);
  assert.equal(response.selectedSegment.kpis.participant.delta, 4.5);
  assert.equal(response.selectedSegment.kpis.participant.deltaUnit, "percent");
  assert.equal(response.selectedSegment.kpis.noneOnly.value, 25);
  assert.equal(response.selectedSegment.kpis.noneOnly.delta, 1.2);
  assert.equal(response.selectedSegment.kpis.topExpectationGap.value, 15.2);
  assert.equal(response.selectedSegment.experiencedFeelings[0]?.current, 18.9);
  assert.equal(response.selectedSegment.experiencedFeelings[0]?.previous, 16.1);
  assert.equal(response.selectedSegment.experiencedFeelings[0]?.delta, 2.8);
  assert.equal(response.selectedSegment.expectationBalance[0]?.value, 15.2);
  assert.equal(response.selectedSegment.expectationBalance[0]?.previous, 17.6);
  assert.equal(response.selectedSegment.expectationBalance[0]?.trend, -2.4);
  assert.equal(response.selectedSegment.table.rows[0]?.experienced, 18.9);
  assert.equal(response.selectedSegment.table.rows[0]?.change, 2.8);
  assert.equal(response.selectedSegment.table.rows[0]?.desired, 34.1);
  assert.equal(response.selectedSegment.table.rows[0]?.balance, 15.2);
  assert.equal(response.selectedSegment.table.rows[0]?.trend, "+15.2pp · açık");
});
