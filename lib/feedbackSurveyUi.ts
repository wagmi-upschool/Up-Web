import type { FeedbackReceiver } from "./feedbackClient";

type AutoSelectReceiverInput = {
  isSelfMode: boolean;
  isIsy: boolean;
  receivers: FeedbackReceiver[];
};

export function getAutoSelectedReceiverId({
  isSelfMode,
  isIsy,
  receivers,
}: AutoSelectReceiverInput) {
  if (isSelfMode) {
    if (receivers.length !== 1) return "";
    return receivers[0]?.feedback_receiver_id || "";
  }

  if (!isIsy) return "";

  return receivers[0]?.feedback_receiver_id || "";
}

export function getSurveySubmitButtonLabel(isIsy: boolean) {
  return isIsy ? "Tamam" : "Anket Gönder";
}

export function shouldShowGeneralCommentField(isIsy: boolean) {
  return !isIsy;
}

export function getGeneralCommentPayloadValue(
  isIsy: boolean,
  finalComment: string | null | undefined,
) {
  if (isIsy) return undefined;

  const trimmedComment = finalComment?.trim();
  return trimmedComment ? trimmedComment : undefined;
}
