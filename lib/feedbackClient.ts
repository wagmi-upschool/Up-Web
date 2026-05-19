"use client";

export type FeedbackSurveyType = "peer" | "self";
export type FeedbackModuleKey = "survey" | "values";
export type FeedbackQuestionType =
  | "likert"
  | "percentage"
  | "free_text"
  | "boolean"
  | "emoji_choice"
  | "text_choice";

type FeedbackApiErrorPayload = {
  errorCode?: string | number;
  errorMessage?: string;
};

export class FeedbackApiError extends Error {
  code: string;
  status: number;

  constructor({
    code,
    message,
    status,
  }: {
    code: string;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = "FeedbackApiError";
    this.code = code;
    this.status = status;
  }
}

export function parseFeedbackApiErrorPayload(
  json: unknown,
  status: number,
  statusText: string,
) {
  const payload =
    json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const body =
    payload.body && typeof payload.body === "object"
      ? (payload.body as FeedbackApiErrorPayload)
      : undefined;
  const code = body?.errorCode ?? payload.errorCode ?? status;
  const message =
    body?.errorMessage ||
    (typeof payload.errorMessage === "string" ? payload.errorMessage : "") ||
    statusText;

  return {
    code: `${code}`,
    message,
  };
}

export function getFeedbackApiErrorCode(error: unknown) {
  if (error instanceof FeedbackApiError) return error.code;

  const raw = error instanceof Error ? error.message : `${error}`;
  return raw.split(":")[0]?.trim();
}

export function getFeedbackApiErrorMessage(error: unknown) {
  if (error instanceof FeedbackApiError) return error.message;

  const raw = error instanceof Error ? error.message : `${error}`;
  const [, ...messageParts] = raw.split(":");
  const message = messageParts.join(":").trim();
  return message || raw;
}

async function api<T>(path: string, init: RequestInit = {}) {
  const base = process.env.NEXT_PUBLIC_REMOTE_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_REMOTE_URL is not configured.");
  }

  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const { code, message } = parseFeedbackApiErrorPayload(
      json,
      response.status,
      response.statusText,
    );
    throw new FeedbackApiError({
      code,
      message,
      status: response.status,
    });
  }

  return (json?.body ?? json) as T;
}

export type FeedbackReceiver = {
  feedback_receiver_id: string;
  name?: string;
  email?: string;
  email_address?: string;
  receiver_email?: string;
};

export type FeedbackReceiversResponse = {
  is_isy: boolean;
  feedback_receivers: FeedbackReceiver[];
};

export type FeedbackChoiceOption = {
  option_id: string;
  label: string;
  order: number;
  emoji?: string;
};

export type FeedbackQuestion = {
  question_id: string;
  question_text: string;
  type: FeedbackQuestionType;
  order: number;
  answer_options?: string[] | FeedbackChoiceOption[];
  scale_min?: number;
  scale_max?: number;
  scale_labels?: { min: string; max: string };
};

export type FeedbackCompetency = {
  competency_id: string;
  name: string;
  description: string;
};

export type FeedbackQuestionModule = {
  available: boolean;
  competency?: FeedbackCompetency;
  questions: FeedbackQuestion[];
};

export type QuestionsResponse = {
  feedback_receiver_id: string;
  competency?: FeedbackCompetency;
  questions?: FeedbackQuestion[];
  feedback_modules?: {
    survey: FeedbackQuestionModule;
    values: FeedbackQuestionModule;
  };
};

export type SubmitSurveyPayload = {
  feedback_giver_id: string;
  feedback_receiver_id: string;
  competency_id: string;
  feedback_module?: FeedbackModuleKey;
  answers: {
    question_id: string;
    answer_value: string | number | null;
    answer_type: FeedbackQuestionType;
  }[];
  free_text_general?: string;
  survey_type?: FeedbackSurveyType;
  channel?: "push" | "in_app" | "email";
  completion_time_seconds?: number;
  token?: string;
};

function buildFeedbackQuery(
  params: Record<string, string>,
  surveyType?: FeedbackSurveyType,
  token?: string,
) {
  const query = new URLSearchParams(params);
  if (surveyType) {
    query.set("feedbackSurveyType", surveyType);
  }
  if (token) {
    query.set("token", token);
  }
  return query.toString();
}

export const getReceivers = (
  giverId: string,
  surveyType?: FeedbackSurveyType,
  token?: string,
) =>
  api<FeedbackReceiversResponse>(
    `/feedback/receivers?${buildFeedbackQuery(
      { feedbackGiverId: giverId },
      surveyType,
      token,
    )}`,
  );

export const getQuestions = (
  giverId: string,
  receiverId: string,
  surveyType?: FeedbackSurveyType,
  token?: string,
) =>
  api<QuestionsResponse>(
    `/feedback/questions?${buildFeedbackQuery(
      {
        feedbackGiverId: giverId,
        feedbackReceiverId: receiverId,
      },
      surveyType,
      token,
    )}`,
  );

export const submitSurvey = (payload: SubmitSurveyPayload) =>
  api<{
    survey_id: string;
    submitted_at: string;
    overall_score?: number;
    survey_type?: FeedbackSurveyType;
  }>(`/feedback/submit`, { method: "POST", body: JSON.stringify(payload) });
