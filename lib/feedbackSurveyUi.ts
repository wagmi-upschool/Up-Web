import type { FeedbackReceiver } from "./feedbackClient";

export type FeedbackLinkTokenErrorCode =
  | "LINK_TOKEN_REQUIRED"
  | "LINK_TOKEN_INVALID"
  | "LINK_EXPIRED"
  | "LINK_USED";

export type FeedbackLinkTokenErrorCopy = {
  title: string;
  description: string;
};

export type FeedbackLinkTokenErrorDisplayInput = {
  code: FeedbackLinkTokenErrorCode;
  message?: string;
  feedbackLinkType?: string;
};

type AutoSelectReceiverInput = {
  isSelfMode: boolean;
  isIsy: boolean;
  receivers: FeedbackReceiver[];
};

const FEEDBACK_LINK_TOKEN_ERROR_COPY: Record<
  FeedbackLinkTokenErrorCode,
  FeedbackLinkTokenErrorCopy
> = {
  LINK_TOKEN_REQUIRED: {
    title: "Geri bildirim linki eksik veya tamamlanmamış görünüyor.",
    description:
      "Bağlantının tamamını yeniden açmayı deneyin. Sorun sürerse yeni bir link isteyin.",
  },
  LINK_TOKEN_INVALID: {
    title: "Bu geri bildirim linki doğrulanamadı.",
    description:
      "Link bozulmuş olabilir ya da size ait olmayabilir. Yeni bir link isteyip tekrar deneyin.",
  },
  LINK_EXPIRED: {
    title: "Önceki anketin süresi doldu, yenisi için biraz erken!",
    description:
      "Her gün saat 16:30-23:59 arası açığız, bekliyoruz.",
  },
  LINK_USED: {
    title: "Bugünkü değerlendirmeni aldık, teşekkürler!",
    description:
      "Her gün yalnızca bir kez katılabilirsin, yarın seni tekrar bekliyoruz.",
  },
};

export function isFeedbackLinkTokenErrorCode(
  code: string | undefined,
): code is FeedbackLinkTokenErrorCode {
  return (
    code === "LINK_TOKEN_REQUIRED" ||
    code === "LINK_TOKEN_INVALID" ||
    code === "LINK_EXPIRED" ||
    code === "LINK_USED"
  );
}

export function getFeedbackLinkTokenErrorCopy(
  code: FeedbackLinkTokenErrorCode,
) {
  return FEEDBACK_LINK_TOKEN_ERROR_COPY[code];
}

export function getFeedbackLinkTokenErrorDisplayCopy({
  code,
  message,
  feedbackLinkType,
}: FeedbackLinkTokenErrorDisplayInput) {
  const trimmedMessage = message?.trim();

  if (
    feedbackLinkType === "weekly" &&
    (code === "LINK_USED" || code === "LINK_EXPIRED") &&
    trimmedMessage
  ) {
    return {
      title: trimmedMessage,
      description: "",
    };
  }

  return getFeedbackLinkTokenErrorCopy(code);
}

export function getFeedbackLinkTokenErrorMessage(
  code: FeedbackLinkTokenErrorCode,
) {
  return getFeedbackLinkTokenErrorCopy(code).description;
}

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
