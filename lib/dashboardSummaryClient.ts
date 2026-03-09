"use client";

import {
  buildDashboardSummaryQuery,
  DashboardSummaryResponse,
} from "@/lib/dashboardSummary";

const base = process.env.NEXT_PUBLIC_REMOTE_URL;
const dashboardBase = process.env.NEXT_PUBLIC_BASE_URL || base;

async function api<T>(path: string, init: RequestInit = {}) {
  if (!dashboardBase) {
    throw new Error(
      "NEXT_PUBLIC_BASE_URL or NEXT_PUBLIC_REMOTE_URL is not configured.",
    );
  }

  const response = await fetch(`${dashboardBase}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  let json: any = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  if (!response.ok) {
    const message = json?.body?.errorMessage || response.statusText;
    const code = json?.body?.errorCode;
    throw new Error(`${code || response.status}: ${message}`);
  }

  return (json?.body ?? json) as T;
}

export function getDashboardSummary(receiverIds: string[]) {
  return api<DashboardSummaryResponse>(
    `/dashboard/summary?${buildDashboardSummaryQuery(receiverIds)}`,
  );
}
