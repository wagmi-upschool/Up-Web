import {
  agentDbRecordKey,
  type AgentDbRecord,
  type StoredAgentDbSnapshot,
} from "@/lib/isYatirimAgentDb";

const MOOD_SCORE: Record<string, number> = {
  bad: 1,
  meh: 2,
  good: 3,
  great: 4,
};

function csvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"' && cell.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  row.push(cell.replace(/\r$/, ""));
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function unmarshallAttribute(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(unmarshallAttribute);
  if (!value || typeof value !== "object") return value;
  const attribute = value as Record<string, unknown>;
  if (typeof attribute.S === "string") return attribute.S;
  if (typeof attribute.N === "string") return Number(attribute.N);
  if (typeof attribute.BOOL === "boolean") return attribute.BOOL;
  if (attribute.NULL === true) return null;
  if (Array.isArray(attribute.L)) return attribute.L.map(unmarshallAttribute);
  if (
    attribute.M &&
    typeof attribute.M === "object" &&
    !Array.isArray(attribute.M)
  ) {
    return Object.fromEntries(
      Object.entries(attribute.M as Record<string, unknown>).map(
        ([key, item]) => [key, unmarshallAttribute(item)],
      ),
    );
  }
  return Object.fromEntries(
    Object.entries(attribute).map(([key, item]) => [
      key,
      unmarshallAttribute(item),
    ]),
  );
}

function jsonField(value: string) {
  if (!value) return undefined;
  try {
    return unmarshallAttribute(JSON.parse(value));
  } catch {
    return value;
  }
}

function moodScoreOf(answers: unknown) {
  if (!Array.isArray(answers)) return undefined;
  for (const answer of answers) {
    if (!answer || typeof answer !== "object" || Array.isArray(answer))
      continue;
    const value = (answer as Record<string, unknown>).answer_value;
    if (typeof value === "string" && MOOD_SCORE[value])
      return MOOD_SCORE[value];
  }
  return undefined;
}

function normalizeCsvRecord(
  headers: string[],
  values: string[],
): AgentDbRecord | undefined {
  const raw = Object.fromEntries(
    headers.map((header, index) => [header, values[index] ?? ""]),
  );
  if (!raw.feedback_receiver_id || !raw.giver_competency_submitted_at) {
    return undefined;
  }

  const answers = jsonField(raw.answers);
  const questions = jsonField(raw.questions);
  const record: AgentDbRecord = {};
  const mutableRecord = record as Record<string, unknown>;
  for (const [key, value] of Object.entries(raw)) {
    if (!value || key === "answers" || key === "questions") continue;
    if (key === "overall_score" || key === "completion_time_seconds") {
      const numberValue = Number(value);
      mutableRecord[key] = Number.isFinite(numberValue) ? numberValue : value;
    } else {
      mutableRecord[key] = value;
    }
  }
  if (Array.isArray(answers)) record.answers = answers;
  if (Array.isArray(questions)) record.questions = questions;
  const moodScore = moodScoreOf(answers);
  if (moodScore !== undefined) record.mood_score = moodScore;
  return record;
}

export function parseAgentDbCsv(source: string) {
  const rows = csvRows(source.replace(/^\uFEFF/, ""));
  if (rows.length < 2) return [];
  const [headers, ...values] = rows;
  return values
    .map((row) => normalizeCsvRecord(headers, row))
    .filter((record): record is AgentDbRecord => Boolean(record));
}

function recordsFromJson(value: unknown) {
  const records = Array.isArray(value)
    ? value
    : value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).records
      : undefined;
  if (!Array.isArray(records))
    throw new Error("JSON dosyasında records listesi yok.");
  return records.filter(
    (record): record is AgentDbRecord =>
      Boolean(record) && typeof record === "object" && !Array.isArray(record),
  );
}

export async function parseAgentDbFile(file: File) {
  const source = await file.text();
  if (file.name.toLocaleLowerCase("tr-TR").endsWith(".json")) {
    return recordsFromJson(JSON.parse(source));
  }
  return parseAgentDbCsv(source);
}

export function buildAgentDbSnapshot(
  records: AgentDbRecord[],
  previous?: StoredAgentDbSnapshot,
) {
  const byKey = new Map<string, AgentDbRecord>();
  for (const record of previous?.records ?? []) {
    byKey.set(agentDbRecordKey(record), record);
  }
  for (const record of records) {
    byKey.set(agentDbRecordKey(record), record);
  }
  const merged = Array.from(byKey.values()).sort((left, right) =>
    String(right.submitted_at ?? "").localeCompare(
      String(left.submitted_at ?? ""),
    ),
  );
  return {
    schemaVersion: 1,
    snapshotId: crypto.randomUUID(),
    generatedAt: new Date().toISOString(),
    cursor: merged.reduce(
      (latest, record) =>
        typeof record.submitted_at === "string" && record.submitted_at > latest
          ? record.submitted_at
          : latest,
      previous?.cursor ?? "",
    ),
    records: merged,
  } satisfies StoredAgentDbSnapshot;
}

export function incrementalAgentDbRecords(
  records: AgentDbRecord[],
  cursor: string,
) {
  return records.filter(
    (record) =>
      typeof record.submitted_at === "string" && record.submitted_at >= cursor,
  );
}
