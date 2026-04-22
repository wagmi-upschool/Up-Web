import assert from "node:assert/strict";
import test from "node:test";
import {
  createClosedSuccessOverlay,
  createEmptyModuleFormValues,
  getStateAfterSuccessOverlayClose,
} from "../../lib/feedbackFormState";

test("closing survey success overlay clears receiver and resets page state", () => {
  const state = {
    receiverId: "receiver-1",
    activeTab: "values" as const,
    lastQuestionReceiver: "receiver-1",
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

  const nextState = getStateAfterSuccessOverlayClose(state);

  assert.equal(nextState.receiverId, "");
  assert.equal(nextState.activeTab, "survey");
  assert.equal(nextState.lastQuestionReceiver, null);
  assert.equal(nextState.selectedValuesQuestionId, "");
  assert.deepEqual(nextState.forms.survey, createEmptyModuleFormValues());
  assert.deepEqual(nextState.forms.values, createEmptyModuleFormValues());
  assert.deepEqual(nextState.moduleStartTimes, {
    survey: null,
    values: null,
  });
  assert.deepEqual(nextState.successOverlay, createClosedSuccessOverlay());
});

test("closing values success overlay also clears receiver and resets page state", () => {
  const state = {
    receiverId: "receiver-2",
    activeTab: "values" as const,
    lastQuestionReceiver: "receiver-2",
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

  const nextState = getStateAfterSuccessOverlayClose(state);

  assert.equal(nextState.receiverId, "");
  assert.equal(nextState.activeTab, "survey");
  assert.equal(nextState.lastQuestionReceiver, null);
  assert.equal(nextState.selectedValuesQuestionId, "");
  assert.deepEqual(nextState.forms.values, createEmptyModuleFormValues());
  assert.deepEqual(nextState.forms.survey, createEmptyModuleFormValues());
  assert.deepEqual(nextState.moduleStartTimes, {
    survey: null,
    values: null,
  });
  assert.deepEqual(nextState.successOverlay, createClosedSuccessOverlay());
});
