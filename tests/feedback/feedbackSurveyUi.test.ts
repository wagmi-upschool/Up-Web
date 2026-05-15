import assert from "node:assert/strict";
import test from "node:test";
import type { FeedbackReceiver } from "../../lib/feedbackClient";
import {
  getAutoSelectedReceiverId,
  getGeneralCommentPayloadValue,
  getSurveySubmitButtonLabel,
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
  assert.equal(getGeneralCommentPayloadValue(true, "  Hidden note  "), undefined);
  assert.equal(getGeneralCommentPayloadValue(false, "  Visible note  "), "Visible note");
  assert.equal(getGeneralCommentPayloadValue(false, "   "), undefined);
});
