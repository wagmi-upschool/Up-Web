import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_AGENT_DB_FILTER,
  filterAgentDbRecords,
  summarizeAgentDbRecords,
} from "../../lib/isYatirimAgentDb";
import {
  buildAgentDbSnapshot,
  incrementalAgentDbRecords,
  parseAgentDbCsv,
} from "../../lib/isYatirimAgentDbFile";

const answers = JSON.stringify([
  {
    M: {
      question_id: { S: "mood" },
      answer_type: { S: "emoji_choice" },
      answer_value: { S: "meh" },
    },
  },
  {
    M: {
      question_id: { S: "comment" },
      answer_type: { S: "free_text" },
      answer_value: { S: "Yönetici, iletişimi\ngeliştirmeli" },
    },
  },
]);

function csvEscape(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

test("parses DynamoDB CSV fields and derives mood score", () => {
  const csv = [
    "feedback_receiver_id,giver_competency_submitted_at,feedback_giver_id,competency_id,submitted_at,overall_score,answers,questions,free_text_general,feedback_link_type",
    [
      "receiver-1",
      "giver-1#competency-1#2026-08-04T10:00:00.000Z",
      "giver-1",
      "competency-1",
      "2026-08-04T10:00:00.000Z",
      "2.5",
      csvEscape(answers),
      csvEscape("[]"),
      csvEscape("Ek, yorum"),
      "daily",
    ].join(","),
  ].join("\n");

  const records = parseAgentDbCsv(csv);
  assert.equal(records.length, 1);
  assert.equal(records[0].overall_score, 2.5);
  assert.equal(records[0].mood_score, 2);
  assert.deepEqual(records[0].answers?.[0], {
    question_id: "mood",
    answer_type: "emoji_choice",
    answer_value: "meh",
  });
  assert.equal(records[0].free_text_general, "Ek, yorum");
});

test("incremental sync overlaps the cursor and de-duplicates primary keys", () => {
  const first = buildAgentDbSnapshot([
    {
      feedback_receiver_id: "receiver-1",
      giver_competency_submitted_at: "key-1",
      submitted_at: "2026-08-04T10:00:00.000Z",
    },
  ]);
  const delta = incrementalAgentDbRecords(
    [
      first.records[0],
      {
        feedback_receiver_id: "receiver-2",
        giver_competency_submitted_at: "key-2",
        submitted_at: "2026-08-04T10:00:00.000Z",
      },
      {
        feedback_receiver_id: "old",
        giver_competency_submitted_at: "old",
        submitted_at: "2026-08-03T10:00:00.000Z",
      },
    ],
    first.cursor,
  );
  const synced = buildAgentDbSnapshot(delta, first);
  assert.equal(delta.length, 2);
  assert.equal(synced.records.length, 2);
});

test("filters by date, mood, overall score and text and builds summaries", () => {
  const records = [
    {
      submitted_at: "2026-08-04T10:00:00.000Z",
      overall_score: 2.5,
      mood_score: 2,
      competency_id: "daily",
      free_text_general: "İletişim geliştirilmeli",
    },
    {
      submitted_at: "2026-08-05T10:00:00.000Z",
      overall_score: 4,
      mood_score: 4,
      competency_id: "daily",
    },
  ];
  const filtered = filterAgentDbRecords(records, {
    ...EMPTY_AGENT_DB_FILTER,
    startDate: "2026-08-04",
    endDate: "2026-08-04",
    overallScoreMin: "2",
    overallScoreMax: "3",
    moodScores: [2],
    search: "iletişim",
  });
  assert.equal(filtered.length, 1);
  assert.deepEqual(summarizeAgentDbRecords(filtered), {
    averageOverallScore: 2.5,
    scoredRowCount: 1,
    commentRowCount: 1,
  });
});
