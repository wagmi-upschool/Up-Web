export type AgentDbFilter = {
  startDate: string;
  endDate: string;
  overallScoreMin: string;
  overallScoreMax: string;
  moodScores: number[];
  competencyId: string;
  feedbackLinkType: string;
  search: string;
};

export type AgentDbSnapshot = {
  exists: boolean;
  snapshotId?: string;
  generatedAt?: string;
  cursor?: string;
  rowCount: number;
};

export type AgentDbSummary = {
  averageOverallScore: number | null;
  scoredRowCount: number;
  commentRowCount: number;
};

export type AgentDbRecord = {
  feedback_receiver_id?: string;
  giver_competency_submitted_at?: string;
  feedback_giver_id?: string;
  competency_id?: string;
  submitted_at?: string;
  survey_id?: string;
  survey_type?: string;
  feedback_link_type?: string;
  feedback_module?: string;
  overall_score?: number;
  mood_score?: number;
  free_text_general?: string;
  answers?: unknown[];
  questions?: unknown[];
  [key: string]: unknown;
};

export type AgentDbRecordsResponse = {
  snapshot: AgentDbSnapshot;
  records: AgentDbRecord[];
  total: number;
  page: number;
  pageSize: number;
  summary: AgentDbSummary;
  competencyIds: string[];
};

export type StoredAgentDbSnapshot = {
  schemaVersion: 1;
  snapshotId: string;
  generatedAt: string;
  cursor: string;
  records: AgentDbRecord[];
};

export type AgentDbSuiteSelection = {
  id: string;
  prompt: string;
  response: string;
  filter?: Partial<AgentDbFilter>;
};

export const EMPTY_AGENT_DB_FILTER: AgentDbFilter = {
  startDate: "",
  endDate: "",
  overallScoreMin: "",
  overallScoreMax: "",
  moodScores: [],
  competencyId: "",
  feedbackLinkType: "",
  search: "",
};

export function mergeAgentDbFilter(
  current: AgentDbFilter,
  next?: Partial<AgentDbFilter>,
) {
  if (!next) return current;
  return {
    ...current,
    ...next,
    moodScores: next.moodScores
      ? [...next.moodScores].sort()
      : current.moodScores,
  };
}

export function agentDbRecordKey(record: AgentDbRecord) {
  return `${record.feedback_receiver_id ?? ""}#${record.giver_competency_submitted_at ?? ""}`;
}

export function filterAgentDbRecords(
  records: AgentDbRecord[],
  filter: AgentDbFilter,
) {
  const scoreMin = filter.overallScoreMin
    ? Number(filter.overallScoreMin)
    : undefined;
  const scoreMax = filter.overallScoreMax
    ? Number(filter.overallScoreMax)
    : undefined;
  const query = filter.search.trim().toLocaleLowerCase("tr-TR");

  return records.filter((record) => {
    const submittedDate = record.submitted_at?.slice(0, 10) ?? "";
    if (filter.startDate && submittedDate < filter.startDate) return false;
    if (filter.endDate && submittedDate > filter.endDate) return false;
    if (
      scoreMin !== undefined &&
      (typeof record.overall_score !== "number" ||
        record.overall_score < scoreMin)
    ) {
      return false;
    }
    if (
      scoreMax !== undefined &&
      (typeof record.overall_score !== "number" ||
        record.overall_score > scoreMax)
    ) {
      return false;
    }
    if (
      filter.moodScores.length &&
      (typeof record.mood_score !== "number" ||
        !filter.moodScores.includes(record.mood_score))
    ) {
      return false;
    }
    if (filter.competencyId && record.competency_id !== filter.competencyId) {
      return false;
    }
    if (
      filter.feedbackLinkType &&
      record.feedback_link_type !== filter.feedbackLinkType
    ) {
      return false;
    }
    if (query) {
      const searchable = JSON.stringify(record).toLocaleLowerCase("tr-TR");
      if (!searchable.includes(query)) return false;
    }
    return true;
  });
}

export function summarizeAgentDbRecords(
  records: AgentDbRecord[],
): AgentDbSummary {
  const scores = records
    .map((record) => record.overall_score)
    .filter((score): score is number => typeof score === "number");
  const commentRowCount = records.filter((record) => {
    if (
      typeof record.free_text_general === "string" &&
      record.free_text_general.trim()
    ) {
      return true;
    }
    return (record.answers ?? []).some((answer) => {
      if (!answer || typeof answer !== "object" || Array.isArray(answer))
        return false;
      const item = answer as Record<string, unknown>;
      return (
        item.answer_type === "free_text" &&
        typeof item.answer_value === "string" &&
        item.answer_value.trim().length > 0
      );
    });
  }).length;

  return {
    averageOverallScore: scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null,
    scoredRowCount: scores.length,
    commentRowCount,
  };
}
