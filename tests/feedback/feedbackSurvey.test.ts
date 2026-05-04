import assert from "node:assert/strict";
import test from "node:test";
import type { FeedbackQuestion } from "../../lib/feedbackClient";
import {
  buildFeedbackSubmitAnswers,
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

test("buildFeedbackSubmitAnswers submits raw numeric percentage answers", () => {
  const answers = buildFeedbackSubmitAnswers(questions, {
    "likert-1": "4",
    "percentage-1": "73,5",
    "free-text-1": "  Strong collaborator  ",
    "values-1": "did",
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

test("sanitizePercentageInput keeps only digits and a single comma", () => {
  assert.equal(sanitizePercentageInput("7a3.5,9"), "735,9");
  assert.equal(sanitizePercentageInput("12,,34"), "12,34");
});
