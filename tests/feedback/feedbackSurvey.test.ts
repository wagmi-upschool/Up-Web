import assert from "node:assert/strict";
import test from "node:test";
import type { FeedbackQuestion } from "../../lib/feedbackClient";
import {
  buildFeedbackSubmitAnswers,
  getLikertGuideText,
  getLikertLevelLabel,
  getOrderedChoiceOptions,
  getQuestionScaleMax,
  getQuestionScaleMin,
  hasAnyAnsweredFeedbackQuestion,
  sanitizePercentageInput,
  validateFeedbackAnswer,
} from "../../lib/feedbackSurvey";

const questions: FeedbackQuestion[] = [
  {
    question_id: "likert-1",
    question_text: "Likert question",
    type: "likert",
    order: 1,
    scale_min: 1,
    scale_max: 4,
  },
  {
    question_id: "percentage-1",
    question_text: "Percentage question",
    type: "percentage",
    order: 2,
    scale_min: 0,
    scale_max: 100,
  },
  {
    question_id: "free-text-1",
    question_text: "Free text question",
    type: "free_text",
    order: 3,
  },
  {
    question_id: "values-1",
    question_text: "Values question",
    type: "boolean",
    order: 4,
  },
  {
    question_id: "emoji-1",
    question_text: "Emoji choice question",
    type: "emoji_choice",
    order: 5,
    answer_options: [
      { option_id: "great", label: "Harika", emoji: "🤩", order: 4 },
      {
        option_id: "bad",
        label: "Kotu",
        description: "Bekledigim destegi alamadim.",
        emoji: "😔",
        order: 1,
      },
      { option_id: "okay", label: "Iyi", emoji: "🙂", order: 3 },
      { option_id: "meh", label: "Eh iste", emoji: "😐", order: 2 },
    ],
  },
  {
    question_id: "text-choice-1",
    question_text: "Text choice question",
    type: "text_choice",
    order: 6,
    answer_options: [
      { option_id: "no", label: "Hayir", order: 3 },
      { option_id: "yes", label: "Evet", order: 1 },
      { option_id: "partial", label: "Kismen", order: 2 },
    ],
  },
  {
    question_id: "multi-select-1",
    question_text: "Multi select question",
    type: "multi_select",
    order: 7,
    answer_options: [
      { option_id: "support", label: "Destek", order: 2 },
      { option_id: "clarity", label: "Netlik", order: 1 },
      { option_id: "speed", label: "Hiz", order: 3 },
    ],
  },
];

test("validateFeedbackAnswer applies rules per question type", () => {
  assert.equal(validateFeedbackAnswer(questions[0], "3"), true);
  assert.equal(validateFeedbackAnswer(questions[1], "73,5"), true);
  assert.equal(validateFeedbackAnswer(questions[2], "Clear written feedback"), true);
  assert.equal(validateFeedbackAnswer(questions[0], ""), true);
  assert.equal(validateFeedbackAnswer(questions[1], null), true);
  assert.equal(validateFeedbackAnswer(questions[2], undefined), true);
  assert.equal(validateFeedbackAnswer(questions[3], "did"), true);
  assert.equal(validateFeedbackAnswer(questions[3], "didnt"), true);
  assert.equal(validateFeedbackAnswer(questions[4], "great"), true);
  assert.equal(validateFeedbackAnswer(questions[5], "partial"), true);
  assert.equal(
    validateFeedbackAnswer(questions[6], ["clarity", "support"]),
    true,
  );
});

test("validateFeedbackAnswer rejects invalid percentage values", () => {
  assert.equal(
    validateFeedbackAnswer(questions[1], "101"),
    "En fazla 100 olmalı.",
  );
  assert.equal(
    validateFeedbackAnswer(questions[1], "-1"),
    "En az 0 olmalı.",
  );
  assert.equal(
    validateFeedbackAnswer(questions[1], "abc"),
    "Lütfen sayı girin.",
  );
  assert.equal(
    validateFeedbackAnswer(questions[1], "73.5"),
    "Ondalık ayırıcı olarak virgül kullanın.",
  );
});

test("validateFeedbackAnswer rejects invalid choice option ids", () => {
  assert.equal(
    validateFeedbackAnswer(questions[4], "missing"),
    "Lütfen geçerli bir seçim yapın.",
  );
  assert.equal(
    validateFeedbackAnswer(questions[5], "maybe"),
    "Lütfen geçerli bir seçim yapın.",
  );
  assert.equal(
    validateFeedbackAnswer(questions[6], ["clarity", "missing"]),
    "Lütfen geçerli bir seçim yapın.",
  );
  assert.equal(
    validateFeedbackAnswer(questions[6], ["clarity", "clarity"]),
    "Aynı seçenek birden fazla gönderilemez.",
  );
});

test("buildFeedbackSubmitAnswers submits raw numeric percentage answers", () => {
  const answers = buildFeedbackSubmitAnswers(questions, {
    "likert-1": "4",
    "percentage-1": "73,5",
    "free-text-1": "  Strong collaborator  ",
    "values-1": "did",
    "emoji-1": "great",
    "text-choice-1": "partial",
    "multi-select-1": ["speed", "clarity"],
  });

  assert.deepEqual(answers, [
    {
      question_id: "likert-1",
      answer_type: "likert",
      answer_value: 4,
    },
    {
      question_id: "percentage-1",
      answer_type: "percentage",
      answer_value: 73.5,
    },
    {
      question_id: "free-text-1",
      answer_type: "free_text",
      answer_value: "Strong collaborator",
    },
    {
      question_id: "values-1",
      answer_type: "boolean",
      answer_value: "did",
    },
    {
      question_id: "emoji-1",
      answer_type: "emoji_choice",
      answer_value: "great",
    },
    {
      question_id: "text-choice-1",
      answer_type: "text_choice",
      answer_value: "partial",
    },
    {
      question_id: "multi-select-1",
      answer_type: "multi_select",
      answer_value: ["clarity", "speed"],
    },
  ]);
});

test("buildFeedbackSubmitAnswers serializes unanswered questions as null", () => {
  const answers = buildFeedbackSubmitAnswers(questions, {
    "likert-1": "",
    "free-text-1": "  ",
  });

  assert.deepEqual(answers, [
    {
      question_id: "likert-1",
      answer_type: "likert",
      answer_value: null,
    },
    {
      question_id: "percentage-1",
      answer_type: "percentage",
      answer_value: null,
    },
    {
      question_id: "free-text-1",
      answer_type: "free_text",
      answer_value: null,
    },
    {
      question_id: "values-1",
      answer_type: "boolean",
      answer_value: null,
    },
    {
      question_id: "emoji-1",
      answer_type: "emoji_choice",
      answer_value: null,
    },
    {
      question_id: "text-choice-1",
      answer_type: "text_choice",
      answer_value: null,
    },
    {
      question_id: "multi-select-1",
      answer_type: "multi_select",
      answer_value: null,
    },
  ]);
});

test("buildFeedbackSubmitAnswers can omit unanswered values answers", () => {
  const answers = buildFeedbackSubmitAnswers(
    [questions[3]],
    {
      "values-1": "",
    },
    { omitEmpty: true },
  );

  assert.deepEqual(answers, []);
});

test("hasAnyAnsweredFeedbackQuestion requires a non-empty question answer", () => {
  assert.equal(
    hasAnyAnsweredFeedbackQuestion(questions, {
      "free-text-1": "   ",
    }),
    false,
  );
  assert.equal(
    hasAnyAnsweredFeedbackQuestion(questions, {
      "likert-1": "4",
    }),
    true,
  );
  assert.equal(
    hasAnyAnsweredFeedbackQuestion(questions, {
      "values-1": "did",
    }),
    true,
  );
  assert.equal(
    hasAnyAnsweredFeedbackQuestion(questions, {
      "emoji-1": "great",
    }),
    true,
  );
  assert.equal(
    hasAnyAnsweredFeedbackQuestion(questions, {
      "multi-select-1": ["clarity"],
    }),
    true,
  );
});

test("getOrderedChoiceOptions sorts object answer options by order", () => {
  assert.deepEqual(
    getOrderedChoiceOptions(questions[4]).map((option) => option.option_id),
    ["bad", "meh", "okay", "great"],
  );
  assert.equal(
    getOrderedChoiceOptions(questions[4])[0]?.description,
    "Bekledigim destegi alamadim.",
  );
  assert.deepEqual(
    getOrderedChoiceOptions(questions[5]).map((option) => option.option_id),
    ["yes", "partial", "no"],
  );
  assert.deepEqual(
    getOrderedChoiceOptions(questions[6]).map((option) => option.option_id),
    ["clarity", "support", "speed"],
  );
  assert.deepEqual(getOrderedChoiceOptions(questions[3]), []);
});

test("numeric scale helpers fall back to type defaults", () => {
  const percentageQuestion: FeedbackQuestion = {
    question_id: "percentage-defaults",
    question_text: "Default percentage",
    type: "percentage",
    order: 1,
  };

  assert.equal(getQuestionScaleMin(percentageQuestion), 0);
  assert.equal(getQuestionScaleMax(percentageQuestion), 100);
});

test("likert label helpers use configured scale labels", () => {
  const likertQuestion: FeedbackQuestion = {
    question_id: "likert-labels",
    question_text: "Configured likert",
    type: "likert",
    order: 1,
    scale_min: 1,
    scale_max: 4,
    scale_labels: {
      min: "Hayır, bu hafta hiç olmadı",
      max: "Evet, birden fazla kez",
      display:
        "1 - Hayır, bu hafta hiç olmadı, 2 - Oldu ama spesifik değildi, 3 - Evet, en az bir kez, 4 - Evet, birden fazla kez",
      label_1: "Hayır, bu hafta hiç olmadı",
      label_2: "Oldu ama spesifik değildi",
      label_3: "Evet, en az bir kez",
      label_4: "Evet, birden fazla kez",
      labels: [
        { value: 1, label: "Hayır, bu hafta hiç olmadı" },
        { value: 2, label: "Oldu ama spesifik değildi" },
        { value: 3, label: "Evet, en az bir kez" },
        { value: 4, label: "Evet, birden fazla kez" },
      ],
      by_value: {
        1: "Hayır, bu hafta hiç olmadı",
        2: "Oldu ama spesifik değildi",
        3: "Evet, en az bir kez",
        4: "Evet, birden fazla kez",
      },
    },
  };

  assert.equal(
    getLikertGuideText(likertQuestion),
    "1 - Hayır, bu hafta hiç olmadı, 2 - Oldu ama spesifik değildi, 3 - Evet, en az bir kez, 4 - Evet, birden fazla kez",
  );
  assert.equal(
    getLikertLevelLabel(likertQuestion, 2),
    "Oldu ama spesifik değildi",
  );
});

test("likert label helpers fall back to default labels", () => {
  assert.equal(
    getLikertGuideText(questions[0]),
    "1 - Zayıf, 2 - Kısmen yeterli, 3 - Güçlü, 4 - Rol Model",
  );
  assert.equal(getLikertLevelLabel(questions[0], 4), "Rol Model");
});

test("sanitizePercentageInput keeps only digits and a single comma", () => {
  assert.equal(sanitizePercentageInput("7a3.5,9"), "735,9");
  assert.equal(sanitizePercentageInput("12,,34"), "12,34");
});
