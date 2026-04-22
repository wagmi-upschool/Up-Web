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
  activeTab: FeedbackTab;
  lastQuestionReceiver: string | null;
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
): SuccessOverlayCloseState {
  return {
    receiverId: "",
    activeTab: "survey",
    lastQuestionReceiver: null,
    selectedValuesQuestionId: "",
    moduleStartTimes: {
      survey: null,
      values: null,
    },
    successOverlay: createClosedSuccessOverlay(),
    forms: {
      survey: createEmptyModuleFormValues(),
      values: createEmptyModuleFormValues(),
    },
  };
}
