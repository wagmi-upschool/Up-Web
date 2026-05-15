import type {
  FeedbackChoiceOption,
  FeedbackQuestion,
  FeedbackQuestionType,
  SubmitSurveyPayload,
} from "@/lib/feedbackClient";

export const MAX_FEEDBACK_FREE_TEXT = 2000;

const DEFAULT_NUMERIC_SCALES = {
  likert: { min: 1, max: 5 },
  percentage: { min: 0, max: 100 },
} as const;

type NumericQuestionType = Extract<
  FeedbackQuestionType,
  keyof typeof DEFAULT_NUMERIC_SCALES
>;

function getNumericBounds(question: FeedbackQuestion) {
  if (!isNumericQuestion(question)) {
    return { min: undefined, max: undefined };
  }

  const defaults = DEFAULT_NUMERIC_SCALES[question.type as NumericQuestionType];

  return {
    min: question.scale_min ?? defaults.min,
    max: question.scale_max ?? defaults.max,
  };
}

export function isNumericQuestion(
  question: FeedbackQuestion,
): question is FeedbackQuestion & { type: NumericQuestionType } {
  return question.type === "likert" || question.type === "percentage";
}

export function isChoiceQuestion(question: FeedbackQuestion) {
  return question.type === "emoji_choice" || question.type === "text_choice";
}

export function getOrderedChoiceOptions(
  question: FeedbackQuestion,
): FeedbackChoiceOption[] {
  if (!isChoiceQuestion(question) || !Array.isArray(question.answer_options)) {
    return [];
  }

  const options = question.answer_options.filter(
    (option): option is FeedbackChoiceOption =>
      typeof option === "object" &&
      option !== null &&
      typeof option.option_id === "string" &&
      typeof option.label === "string" &&
      typeof option.order === "number",
  );

  return options.slice().sort((first, second) => first.order - second.order);
}

export function isValidChoiceAnswer(
  question: FeedbackQuestion,
  optionId: string,
) {
  return getOrderedChoiceOptions(question).some(
    (option) => option.option_id === optionId,
  );
}

export function sanitizePercentageInput(value: string) {
  let nextValue = "";
  let hasSeparator = false;

  for (const char of value) {
    if (/\d/.test(char)) {
      nextValue += char;
      continue;
    }

    if (char === "," && !hasSeparator) {
      nextValue += char;
      hasSeparator = true;
    }
  }

  return nextValue;
}

export function parsePercentageValue(value: string) {
  if (!value) return Number.NaN;
  if (value.includes(".")) return Number.NaN;
  return Number(value.replace(",", "."));
}

export function validateFeedbackAnswer(
  question: FeedbackQuestion,
  value?: string | null,
) {
  if (value === undefined || value === null || value === "") {
    return true;
  }

  if (question.type === "free_text") {
    if (value.length > MAX_FEEDBACK_FREE_TEXT) {
      return `En fazla ${MAX_FEEDBACK_FREE_TEXT} karakter.`;
    }

    return true;
  }

  if (question.type === "boolean") {
    if (value !== "did" && value !== "didnt") {
      return "Lütfen geçerli bir seçim yapın.";
    }

    return true;
  }

  if (isChoiceQuestion(question)) {
    if (!isValidChoiceAnswer(question, value)) {
      return "Lütfen geçerli bir seçim yapın.";
    }

    return true;
  }

  const numericValue =
    question.type === "percentage"
      ? parsePercentageValue(value)
      : Number(value);

  if (question.type === "percentage" && value.includes(".")) {
    return "Ondalık ayırıcı olarak virgül kullanın.";
  }

  if (!Number.isFinite(numericValue)) {
    return "Lütfen sayı girin.";
  }

  const { min, max } = getNumericBounds(question);

  if (typeof min === "number" && numericValue < min) {
    return `En az ${min} olmalı.`;
  }

  if (typeof max === "number" && numericValue > max) {
    return `En fazla ${max} olmalı.`;
  }

  return true;
}

export function hasAnsweredFeedbackQuestion(
  question: FeedbackQuestion,
  value?: string | null,
) {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (question.type === "free_text") {
    return value.trim().length > 0;
  }

  return true;
}

export function hasAnyAnsweredFeedbackQuestion(
  questions: FeedbackQuestion[],
  answers: Record<string, string>,
) {
  return questions.some((question) =>
    hasAnsweredFeedbackQuestion(question, answers[question.question_id]),
  );
}

export function serializeFeedbackAnswer(
  question: FeedbackQuestion,
  value?: string | null,
): SubmitSurveyPayload["answers"][number] {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    (question.type === "free_text" && value.trim() === "")
  ) {
    return {
      question_id: question.question_id,
      answer_type: question.type,
      answer_value: null,
    };
  }

  return {
    question_id: question.question_id,
    answer_type: question.type,
    answer_value:
      question.type === "boolean"
        ? value
        : isChoiceQuestion(question)
          ? value
        : question.type === "percentage"
        ? parsePercentageValue(value)
        : isNumericQuestion(question)
          ? Number(value)
          : value.trim(),
  };
}

export function buildFeedbackSubmitAnswers(
  questions: FeedbackQuestion[],
  answers: Record<string, string>,
  options?: { omitEmpty?: boolean },
): SubmitSurveyPayload["answers"] {
  return questions.flatMap((question) => {
    const value = answers[question.question_id] || "";
    if (options?.omitEmpty && value === "") {
      return [];
    }

    return [serializeFeedbackAnswer(question, value)];
  });
}

export function getQuestionScaleMin(question: FeedbackQuestion) {
  return getNumericBounds(question).min;
}

export function getQuestionScaleMax(question: FeedbackQuestion) {
  return getNumericBounds(question).max;
}
