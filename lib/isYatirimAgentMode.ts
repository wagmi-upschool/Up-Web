export type AgentViewMode = "simple" | "pro";

export function normalizeAgentViewMode(value: string | null): AgentViewMode {
  return value === "pro" ? "pro" : "simple";
}

export function withAgentViewMode(
  current: URLSearchParams,
  mode: AgentViewMode,
): string {
  const next = new URLSearchParams(current.toString());
  next.set("mode", mode);
  return next.toString();
}
