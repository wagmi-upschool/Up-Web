"use client";

const base = process.env.NEXT_PUBLIC_REMOTE_URL;

async function api<T>(path: string, init: RequestInit = {}) {
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
    const message = json?.body?.errorMessage || response.statusText;
    const code = json?.body?.errorCode;
    throw new Error(`${code || response.status}: ${message}`);
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

export type FeedbackQuestion = {
  question_id: string;
  question_text: string;
  type: "likert" | "free_text";
  order: number;
  scale_min?: number;
  scale_max?: number;
  scale_labels?: { min: string; max: string };
};

export type QuestionsResponse = {
  feedback_receiver_id: string;
  competency: {
    competency_id: string;
    name: string;
    description: string;
  };
  questions: FeedbackQuestion[];
};

export type SubmitSurveyPayload = {
  feedback_giver_id: string;
  feedback_receiver_id: string;
  competency_id: string;
  answers: {
    question_id: string;
    answer_value: string | number | null;
    answer_type: "likert" | "free_text";
  }[];
  free_text_general?: string;
  channel?: "push" | "in_app" | "email";
  completion_time_seconds?: number;
};

export const getReceivers = (giverId: string) =>
  api<{ feedback_receivers: FeedbackReceiver[] }>(
    `/feedback/receivers?feedbackGiverId=${giverId}`,
  );

export const getQuestions = (giverId: string, receiverId: string) =>
  api<QuestionsResponse>(
    `/feedback/questions?feedbackGiverId=${giverId}&feedbackReceiverId=${receiverId}`,
  );

export const submitSurvey = (payload: SubmitSurveyPayload) =>
  api<{ survey_id: string; submitted_at: string; overall_score?: number }>(
    `/feedback/submit`,
    { method: "POST", body: JSON.stringify(payload) },
  );
