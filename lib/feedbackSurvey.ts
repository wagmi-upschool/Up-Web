import type {
  FeedbackAnswerFormValue,
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

const DEFAULT_LIKERT_GUIDE_TEXT =
  "1 - Zayıf, 2 - Kısmen yeterli, 3 - Güçlü, 4 - Rol Model";

const DEFAULT_LIKERT_LEVEL_LABELS: Record<number, string> = {
  1: "Zayıf",
  2: "Kısmen yeterli",
  3: "Güçlü",
  4: "Rol Model",
};

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

function normalizeScaleLabel(label?: string) {
  const normalizedLabel = label?.trim();
  return normalizedLabel || undefined;
}

function getConfiguredScaleLabel(question: FeedbackQuestion, value: number) {
  const scaleLabels = question.scale_labels;
  if (!scaleLabels) return undefined;

  const labelKey = `label_${value}` as const;
  const directLabel = normalizeScaleLabel(scaleLabels[labelKey]);
  if (directLabel) return directLabel;

  const byValueLabel = normalizeScaleLabel(scaleLabels.by_value?.[String(value)]);
  if (byValueLabel) return byValueLabel;

  const listLabel = normalizeScaleLabel(
    scaleLabels.labels?.find((label) => Number(label.value) === value)?.label,
  );
  if (listLabel) return listLabel;

  const { min, max } = getNumericBounds(question);
  if (value === min) return normalizeScaleLabel(scaleLabels.min);
  if (value === max) return normalizeScaleLabel(scaleLabels.max);

  return undefined;
}

export function isNumericQuestion(
  question: FeedbackQuestion,
): question is FeedbackQuestion & { type: NumericQuestionType } {
  return question.type === "likert" || question.type === "percentage";
}

export function isChoiceQuestion(question: FeedbackQuestion) {
  return (
    question.type === "emoji_choice" ||
    question.type === "text_choice" ||
    question.type === "multi_select"
  );
}

export function isMultiSelectQuestion(question: FeedbackQuestion) {
  return question.type === "multi_select";
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

export function normalizeMultiSelectAnswer(
  question: FeedbackQuestion,
  optionIds: string[],
) {
  const selectedOptionIds = new Set(optionIds);
  return getOrderedChoiceOptions(question)
    .filter((option) => selectedOptionIds.has(option.option_id))
    .map((option) => option.option_id);
}

export function isEmptyFeedbackAnswerValue(
  value?: FeedbackAnswerFormValue | null,
) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
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
  value?: FeedbackAnswerFormValue | null,
) {
  if (isEmptyFeedbackAnswerValue(value)) {
    return true;
  }

  if (question.type === "multi_select") {
    if (!Array.isArray(value)) {
      return "Lütfen geçerli bir seçim yapın.";
    }

    if (value.some((optionId) => typeof optionId !== "string")) {
      return "Lütfen geçerli bir seçim yapın.";
    }

    if (new Set(value).size !== value.length) {
      return "Aynı seçenek birden fazla gönderilemez.";
    }

    if (value.some((optionId) => !isValidChoiceAnswer(question, optionId))) {
      return "Lütfen geçerli bir seçim yapın.";
    }

    return true;
  }

  if (Array.isArray(value)) {
    return "Lütfen geçerli bir seçim yapın.";
  }

  if (typeof value !== "string") {
    return "Lütfen geçerli bir seçim yapın.";
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
  value?: FeedbackAnswerFormValue | null,
) {
  if (isEmptyFeedbackAnswerValue(value)) {
    return false;
  }

  if (Array.isArray(value)) {
    return question.type === "multi_select" && value.length > 0;
  }

  if (typeof value !== "string") {
    return false;
  }

  if (question.type === "free_text") {
    return value.trim().length > 0;
  }

  return true;
}

export function hasAnyAnsweredFeedbackQuestion(
  questions: FeedbackQuestion[],
  answers: Record<string, FeedbackAnswerFormValue>,
) {
  return questions.some((question) =>
    hasAnsweredFeedbackQuestion(question, answers[question.question_id]),
  );
}

export function serializeFeedbackAnswer(
  question: FeedbackQuestion,
  value?: FeedbackAnswerFormValue | null,
): SubmitSurveyPayload["answers"][number] {
  if (
    isEmptyFeedbackAnswerValue(value) ||
    (question.type === "free_text" &&
      typeof value === "string" &&
      value.trim() === "")
  ) {
    return {
      question_id: question.question_id,
      answer_type: question.type,
      answer_value: null,
    };
  }

  if (question.type === "multi_select") {
    return {
      question_id: question.question_id,
      answer_type: question.type,
      answer_value: Array.isArray(value)
        ? normalizeMultiSelectAnswer(question, value)
        : null,
    };
  }

  if (Array.isArray(value)) {
    return {
      question_id: question.question_id,
      answer_type: question.type,
      answer_value: null,
    };
  }

  if (typeof value !== "string") {
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
  answers: Record<string, FeedbackAnswerFormValue>,
  options?: { omitEmpty?: boolean },
): SubmitSurveyPayload["answers"] {
  return questions.flatMap((question) => {
    const value = answers[question.question_id] ?? "";
    if (options?.omitEmpty && isEmptyFeedbackAnswerValue(value)) {
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

export function getLikertLevelLabel(question: FeedbackQuestion, value: number) {
  return (
    getConfiguredScaleLabel(question, value) ??
    DEFAULT_LIKERT_LEVEL_LABELS[value]
  );
}

export function getLikertGuideText(question: FeedbackQuestion) {
  const displayLabel = normalizeScaleLabel(question.scale_labels?.display);
  if (displayLabel) return displayLabel;

  const { min, max } = getNumericBounds(question);
  if (typeof min !== "number" || typeof max !== "number") {
    return DEFAULT_LIKERT_GUIDE_TEXT;
  }

  const labels = [];
  for (let value = min; value <= max; value += 1) {
    const label = getConfiguredScaleLabel(question, value);
    if (!label) continue;
    labels.push(`${value} - ${label}`);
  }

  return labels.length > 0
    ? labels.join(", ")
    : DEFAULT_LIKERT_GUIDE_TEXT;
}
