import type { FeedbackModuleKey } from "./feedbackClient";

export type FeedbackTab = FeedbackModuleKey;

export type ModuleFormValues = {
  answers: Record<string, string>;
  finalComment: string;
};

export type ModuleFormState = Record<FeedbackTab, ModuleFormValues>;
export type ModuleStartTimes = Record<FeedbackTab, number | null>;

export type SuccessOverlayState = {
  open: boolean;
  message: string;
  module: FeedbackTab | null;
};

export type SuccessOverlayCloseState = {
  receiverId: string;
  selectedValuesQuestionId: string;
  moduleStartTimes: ModuleStartTimes;
  successOverlay: SuccessOverlayState;
  forms: ModuleFormState;
};

export function createEmptyModuleFormValues(): ModuleFormValues {
  return { answers: {}, finalComment: "" };
}

export function createClosedSuccessOverlay(): SuccessOverlayState {
  return { open: false, message: "", module: null };
}

export function getStateAfterSuccessOverlayClose(
  state: SuccessOverlayCloseState,
  timestamp: number,
): SuccessOverlayCloseState {
  const targetModule = state.successOverlay.module;

  if (!targetModule) {
    return {
      ...state,
      successOverlay: createClosedSuccessOverlay(),
    };
  }

  return {
    receiverId: state.receiverId,
    selectedValuesQuestionId:
      targetModule === "values" ? "" : state.selectedValuesQuestionId,
    moduleStartTimes: {
      ...state.moduleStartTimes,
      [targetModule]: timestamp,
    },
    successOverlay: createClosedSuccessOverlay(),
    forms: {
      ...state.forms,
      [targetModule]: createEmptyModuleFormValues(),
    },
  };
}
