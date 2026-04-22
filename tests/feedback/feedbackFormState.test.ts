import assert from "node:assert/strict";
import test from "node:test";
import {
  createClosedSuccessOverlay,
  createEmptyModuleFormValues,
  getStateAfterSuccessOverlayClose,
} from "../../lib/feedbackFormState";

test("closing survey success overlay resets only survey form data", () => {
  const state = {
    receiverId: "receiver-1",
    selectedValuesQuestionId: "values-question-1",
    moduleStartTimes: {
      survey: 120,
      values: 240,
    },
    successOverlay: {
      open: true,
      message: "Anket yanıtların kaydedildi.",
      module: "survey" as const,
    },
    forms: {
      survey: {
        answers: { "survey-question-1": "4" },
        finalComment: "Harika iş çıkardı.",
      },
      values: {
        answers: { "values-question-1": "did" },
        finalComment: "Davranış notu",
      },
    },
  };

  const nextState = getStateAfterSuccessOverlayClose(state, 999);

  assert.equal(nextState.receiverId, "receiver-1");
  assert.equal(nextState.selectedValuesQuestionId, "values-question-1");
  assert.deepEqual(nextState.forms.survey, createEmptyModuleFormValues());
  assert.deepEqual(nextState.forms.values, state.forms.values);
  assert.deepEqual(nextState.moduleStartTimes, {
    survey: 999,
    values: 240,
  });
  assert.deepEqual(nextState.successOverlay, createClosedSuccessOverlay());
});

test("closing values success overlay resets values form data and selection", () => {
  const state = {
    receiverId: "receiver-2",
    selectedValuesQuestionId: "values-question-7",
    moduleStartTimes: {
      survey: 320,
      values: 480,
    },
    successOverlay: {
      open: true,
      message: "Davranış değerlendirmesi kaydedildi.",
      module: "values" as const,
    },
    forms: {
      survey: {
        answers: { "survey-question-2": "3" },
        finalComment: "Survey notu",
      },
      values: {
        answers: { "values-question-7": "did" },
        finalComment: "Davranış notu",
      },
    },
  };

  const nextState = getStateAfterSuccessOverlayClose(state, 1500);

  assert.equal(nextState.receiverId, "receiver-2");
  assert.equal(nextState.selectedValuesQuestionId, "");
  assert.deepEqual(nextState.forms.values, createEmptyModuleFormValues());
  assert.deepEqual(nextState.forms.survey, state.forms.survey);
  assert.deepEqual(nextState.moduleStartTimes, {
    survey: 320,
    values: 1500,
  });
  assert.deepEqual(nextState.successOverlay, createClosedSuccessOverlay());
});
