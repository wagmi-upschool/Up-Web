export const DASHBOARD_INTERVALS = [2, 3, 5, 6, 8] as const;

export type DashboardIntervalHours = (typeof DASHBOARD_INTERVALS)[number];

export type DashboardHourlyRating = {
  hour: string;
  averageRating: number;
  totalFeedbacks: number;
};

export type DashboardCultureQuestion = {
  questionId: string;
  questionText: string;
  order: number;
  averageRating: number;
  totalFeedbacks: number;
};

export type DashboardSummaryResponse = {
  feedbackReceiverIds: string[];
  totalFeedbacks: number;
  overallAverageRating: number;
  maxRating: number;
  hourlyRatings: DashboardHourlyRating[];
  cultureScore: {
    overallAverageRating: number;
    maxRating: number;
    questions: DashboardCultureQuestion[];
  };
};

export type DashboardReceiverFilters = {
  receiverIds: string[];
  invalidReceiverIds: string[];
};

export type GroupedRatingWindow = {
  label: string;
  startHour: string;
  endHour: string;
  averageRating: number;
  totalFeedbacks: number;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HOUR_IN_MS = 60 * 60 * 1000;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function dedupe(items: string[]) {
  return Array.from(new Set(items));
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function tokenizeReceiverIds(raw: string | null | undefined) {
  if (!raw) return [];

  return raw
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isValidDate(date: Date) {
  return Number.isFinite(date.getTime());
}

export function isUuid(value: string) {
  return UUID_REGEX.test(value);
}

export function parseDashboardReceiverIdsInput(raw: string) {
  return dedupe(tokenizeReceiverIds(raw));
}

export function parseDashboardReceiverFilters(params: {
  get(name: string): string | null;
}): DashboardReceiverFilters {
  const receiverIds = dedupe([
    ...tokenizeReceiverIds(params.get("feedbackReceiverId")),
    ...tokenizeReceiverIds(params.get("feedbackReceiverIds")),
  ]);

  return {
    receiverIds,
    invalidReceiverIds: receiverIds.filter((receiverId) => !isUuid(receiverId)),
  };
}

export function buildDashboardSummaryQuery(receiverIds: string[]) {
  const query = new URLSearchParams();

  if (receiverIds.length === 1) {
    query.set("feedbackReceiverId", receiverIds[0]);
  }

  if (receiverIds.length > 1) {
    query.set("feedbackReceiverIds", receiverIds.join(","));
  }

  return query.toString();
}

export function parseDashboardHour(hour: string) {
  const match = hour.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(?::(\d{2}))?(?::(\d{2}))?$/,
  );

  if (!match) {
    const date = new Date(hour);
    if (!isValidDate(date)) {
      throw new Error(`Invalid dashboard hour: ${hour}`);
    }
    return date;
  }

  const [, year, month, day, hourValue, minute = "00", second = "00"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hourValue),
    Number(minute),
    Number(second),
    0,
  );

  if (!isValidDate(date)) {
    throw new Error(`Invalid dashboard hour: ${hour}`);
  }

  return date;
}

export function formatDashboardHour(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:00`;
}

function formatHourLabel(date: Date) {
  return `${pad(date.getHours())}:00`;
}

function formatDayLabel(date: Date) {
  return `${pad(date.getDate())} ${MONTH_LABELS[date.getMonth()]}`;
}

function formatWindowLabel(start: Date, end: Date) {
  const startDay = formatDayLabel(start);
  const endDay = formatDayLabel(end);

  if (startDay === endDay) {
    return `${startDay} · ${formatHourLabel(start)}-${formatHourLabel(end)}`;
  }

  return `${startDay} ${formatHourLabel(start)} · ${endDay} ${formatHourLabel(end)}`;
}

export function groupHourlyRatings(
  hourlyRatings: DashboardHourlyRating[],
  intervalHours: DashboardIntervalHours,
): GroupedRatingWindow[] {
  if (!hourlyRatings.length) return [];

  const windows = new Map<number, DashboardHourlyRating[]>();
  const sortedRatings = [...hourlyRatings].sort((left, right) =>
    left.hour.localeCompare(right.hour),
  );
  const intervalMs = intervalHours * HOUR_IN_MS;

  for (const rating of sortedRatings) {
    const date = parseDashboardHour(rating.hour);
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
    const elapsedMs = date.getTime() - dayStart.getTime();
    const windowStartMs =
      dayStart.getTime() + Math.floor(elapsedMs / intervalMs) * intervalMs;
    const bucket = windows.get(windowStartMs) || [];

    bucket.push(rating);
    windows.set(windowStartMs, bucket);
  }

  return Array.from(windows.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([windowStartMs, ratings]) => {
      const totalFeedbacks = ratings.reduce(
        (sum, rating) => sum + rating.totalFeedbacks,
        0,
      );
      const weightedTotal = ratings.reduce(
        (sum, rating) => sum + rating.averageRating * rating.totalFeedbacks,
        0,
      );
      const windowStart = new Date(windowStartMs);
      const windowEnd = new Date(windowStartMs + intervalMs);
      const averageRating =
        totalFeedbacks > 0
          ? Number((weightedTotal / totalFeedbacks).toFixed(2))
          : 0;

      return {
        label: formatWindowLabel(windowStart, windowEnd),
        startHour: formatDashboardHour(windowStart),
        endHour: formatDashboardHour(windowEnd),
        averageRating,
        totalFeedbacks,
      };
    });
}
