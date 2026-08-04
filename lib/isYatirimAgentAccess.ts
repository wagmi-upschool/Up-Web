export const IS_YATIRIM_AGENT_ALLOWED_EMAILS = [
  "yusuff2403@gmail.com",
  "onat@wagmitech.co",
  "melike@wagmitech.co",
] as const;

const allowedEmails = new Set<string>(IS_YATIRIM_AGENT_ALLOWED_EMAILS);

export function isAllowedIsYatirimAgentIdentity(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const claims = payload as Record<string, unknown>;
  const email =
    typeof claims.email === "string" ? claims.email.trim().toLowerCase() : "";
  const emailVerified =
    claims.email_verified === true || claims.email_verified === "true";

  return emailVerified && allowedEmails.has(email);
}
