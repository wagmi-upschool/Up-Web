import assert from "node:assert/strict";
import test from "node:test";
import type { FeedbackReceiver } from "../../lib/feedbackClient";
import {
  getAutoSelectedReceiverId,
  getFeedbackLinkTokenErrorCopy,
  getFeedbackLinkTokenErrorMessage,
  getGeneralCommentPayloadValue,
  getSurveySubmitButtonLabel,
  isFeedbackLinkTokenErrorCode,
  shouldShowGeneralCommentField,
} from "../../lib/feedbackSurveyUi";

const receivers: FeedbackReceiver[] = [
  {
    feedback_receiver_id: "receiver-1",
    name: "First Receiver",
  },
  {
    feedback_receiver_id: "receiver-2",
    name: "Second Receiver",
  },
];

test("getAutoSelectedReceiverId auto-selects the first receiver for is_isy peer flow", () => {
  assert.equal(
    getAutoSelectedReceiverId({
      isSelfMode: false,
      isIsy: true,
      receivers,
    }),
    "receiver-1",
  );
});

test("getAutoSelectedReceiverId keeps manual selection flow for non-isy peer surveys", () => {
  assert.equal(
    getAutoSelectedReceiverId({
      isSelfMode: false,
      isIsy: false,
      receivers,
    }),
    "",
  );
});

test("getAutoSelectedReceiverId only auto-selects self surveys when a single receiver exists", () => {
  assert.equal(
    getAutoSelectedReceiverId({
      isSelfMode: true,
      isIsy: false,
      receivers,
    }),
    "",
  );

  assert.equal(
    getAutoSelectedReceiverId({
      isSelfMode: true,
      isIsy: false,
      receivers: [receivers[0]],
    }),
    "receiver-1",
  );
});

test("is_isy survey chrome uses the updated CTA and hides general comments", () => {
  assert.equal(getSurveySubmitButtonLabel(true), "Tamam");
  assert.equal(getSurveySubmitButtonLabel(false), "Anket Gönder");
  assert.equal(shouldShowGeneralCommentField(true), false);
  assert.equal(shouldShowGeneralCommentField(false), true);
});

test("getGeneralCommentPayloadValue omits free_text_general for is_isy surveys", () => {
  assert.equal(
    getGeneralCommentPayloadValue(true, "  Hidden note  "),
    undefined,
  );
  assert.equal(
    getGeneralCommentPayloadValue(false, "  Visible note  "),
    "Visible note",
  );
  assert.equal(getGeneralCommentPayloadValue(false, "   "), undefined);
});

test("link token errors map to terminal screen copy", () => {
  assert.equal(isFeedbackLinkTokenErrorCode("LINK_TOKEN_REQUIRED"), true);
  assert.equal(isFeedbackLinkTokenErrorCode("LINK_TOKEN_INVALID"), true);
  assert.equal(isFeedbackLinkTokenErrorCode("LINK_EXPIRED"), true);
  assert.equal(isFeedbackLinkTokenErrorCode("LINK_USED"), true);
  assert.equal(isFeedbackLinkTokenErrorCode("VAL_001"), false);

  assert.deepEqual(getFeedbackLinkTokenErrorCopy("LINK_TOKEN_REQUIRED"), {
    title: "Geri bildirim linki eksik veya tamamlanmamış görünüyor.",
    description:
      "Bağlantının tamamını yeniden açmayı deneyin. Sorun sürerse yeni bir link isteyin.",
  });
  assert.deepEqual(getFeedbackLinkTokenErrorCopy("LINK_TOKEN_INVALID"), {
    title: "Bu geri bildirim linki doğrulanamadı.",
    description:
      "Link bozulmuş olabilir ya da size ait olmayabilir. Yeni bir link isteyip tekrar deneyin.",
  });
  assert.deepEqual(getFeedbackLinkTokenErrorCopy("LINK_EXPIRED"), {
    title: "Önceki anketin süresi doldu, yenisi için biraz erken!",
    description: "Her gün saat 16:30-23:59 arası açığız, bekliyoruz.",
  });
  assert.deepEqual(getFeedbackLinkTokenErrorCopy("LINK_USED"), {
    title: "Bugünkü değerlendirmeni aldık, teşekkürler!",
    description:
      "Her gün yalnızca bir kez katılabilirsin, yarın seni tekrar bekliyoruz.",
  });

  assert.equal(
    getFeedbackLinkTokenErrorMessage("LINK_TOKEN_REQUIRED"),
    "Bağlantının tamamını yeniden açmayı deneyin. Sorun sürerse yeni bir link isteyin.",
  );
  assert.equal(
    getFeedbackLinkTokenErrorMessage("LINK_TOKEN_INVALID"),
    "Link bozulmuş olabilir ya da size ait olmayabilir. Yeni bir link isteyip tekrar deneyin.",
  );
  assert.equal(
    getFeedbackLinkTokenErrorMessage("LINK_EXPIRED"),
    "Her gün saat 16:30-23:59 arası açığız, bekliyoruz.",
  );
  assert.equal(
    getFeedbackLinkTokenErrorMessage("LINK_USED"),
    "Her gün yalnızca bir kez katılabilirsin, yarın seni tekrar bekliyoruz.",
  );
});
