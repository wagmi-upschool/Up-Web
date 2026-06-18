"use client";

import Link from "next/link";
import {
  IS_YATIRIM_DAILY_ROUTE,
  IS_YATIRIM_WEEKLY_ROUTE,
} from "@/lib/isYatirimWeeklyDashboard";

export function buildIsYatirimDashboardRouteWithSharedParams(
  route: string,
  {
    dailyToken,
    weeklyToken,
    segment,
    isWeeklyToggleEnabled = true,
  }: {
    dailyToken: string;
    weeklyToken: string;
    segment: string;
    isWeeklyToggleEnabled?: boolean;
  },
) {
  const query = new URLSearchParams();
  const targetToken =
    route === IS_YATIRIM_WEEKLY_ROUTE ? weeklyToken : dailyToken;

  if (targetToken) {
    query.set("token", targetToken);
  }

  if (dailyToken) {
    query.set("dailyToken", dailyToken);
  }

  if (weeklyToken) {
    query.set("weeklyToken", weeklyToken);
  }

  if (segment && segment !== "all") {
    query.set("segment", segment);
  }

  if (isWeeklyToggleEnabled) {
    query.set("isWeeklyToggle", "true");
  }

  const search = query.toString();
  return `${route}${search ? `?${search}` : ""}`;
}

export default function IsYatirimDashboardViewToggle({
  active,
  dailyToken,
  weeklyToken,
  segment,
  isWeeklyToggleEnabled = true,
}: {
  active: "daily" | "weekly";
  dailyToken: string;
  weeklyToken: string;
  segment: string;
  isWeeklyToggleEnabled?: boolean;
}) {
  const dailyHref = buildIsYatirimDashboardRouteWithSharedParams(
    IS_YATIRIM_DAILY_ROUTE,
    { dailyToken, weeklyToken, segment, isWeeklyToggleEnabled },
  );
  const weeklyHref = buildIsYatirimDashboardRouteWithSharedParams(
    IS_YATIRIM_WEEKLY_ROUTE,
    { dailyToken, weeklyToken, segment, isWeeklyToggleEnabled },
  );

  return (
    <div className="inline-flex rounded-full border border-[#171717]/10 bg-[#EFE7D8] p-1">
      <Link
        className={`rounded-full px-3 py-1.5 font-poppins text-sm font-semibold transition-colors ${
          active === "daily"
            ? "bg-[#171717] text-white"
            : "text-[#171717]/58 hover:text-[#171717]"
        }`}
        href={dailyHref}
      >
        Günlük
      </Link>
      <Link
        className={`rounded-full px-3 py-1.5 font-poppins text-sm font-semibold transition-colors ${
          active === "weekly"
            ? "bg-[#171717] text-white"
            : "text-[#171717]/58 hover:text-[#171717]"
        }`}
        href={weeklyHref}
      >
        Haftalık
      </Link>
    </div>
  );
}
