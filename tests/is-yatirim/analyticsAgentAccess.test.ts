import assert from "node:assert/strict";
import test from "node:test";
import {
  IS_YATIRIM_AGENT_ALLOWED_EMAILS,
  isAllowedIsYatirimAgentIdentity,
} from "../../lib/isYatirimAgentAccess";

test("allows only the three verified analytics-agent identities", () => {
  assert.deepEqual(IS_YATIRIM_AGENT_ALLOWED_EMAILS, [
    "yusuff2403@gmail.com",
    "onat@wagmitech.co",
    "melike@wagmitech.co",
  ]);

  for (const email of IS_YATIRIM_AGENT_ALLOWED_EMAILS) {
    assert.equal(
      isAllowedIsYatirimAgentIdentity({ email, email_verified: true }),
      true,
    );
  }
  assert.equal(
    isAllowedIsYatirimAgentIdentity({
      email: "someone@wagmitech.co",
      email_verified: true,
    }),
    false,
  );
  assert.equal(
    isAllowedIsYatirimAgentIdentity({
      email: "melike@wagmitech.co",
      email_verified: false,
    }),
    false,
  );
});
