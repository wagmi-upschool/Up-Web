# Is Yatirim Leadership Dashboard Design

## Overview

The Is Yatirim Leadership Dashboard converts the approved Netlify HTML prototype into a production Next.js dashboard. The implementation will use React components, a typed API adapter, and a backend response contract that mirrors the prototype's current static data blocks.

The page is public, read-only, and CEO-facing. It will not introduce login, per-user GMY authorization, or static dashboard data.

## Architecture

```text
[Browser]
   |
   v
[Next.js Route: /is-yatirim/leadership-dashboard]
   |
   v
[React Query Hook]
   |
   v
[Next.js API Proxy: /api/is-yatirim/leadership-dashboard]
   |
   v
[Backend Endpoint or View API]
   |
   v
[Survey Tables / Analytics Views]
```

Alternative route naming can be aligned during implementation. The recommended route is explicit and independent from the existing generic `/analytics?competencyId=...` flow because this dashboard has a different metric model and Is Yatirim-specific sections.

## Existing Prototype Mapping

The prototype currently embeds static JavaScript data:

- `DATA`: segment-level KPI, distribution, engagement, and word data.
- `RANKING`: GMY average mood ranking.
- `GMY_EXTREMES`: bad and great percentages by GMY.
- `WBM_ALL` and `WBM_GMY`: word clouds by mood category and segment.
- `GMY_CMP`: previous-vs-current score comparison by GMY.
- `RAW`: survey date trend points.

Production shall replace those constants with a single typed dashboard response.

## Frontend Components

```text
IsYatirimLeadershipDashboardPage
  DashboardShell
    DashboardHeader
    PageHero
    SegmentTabs
    KpiGrid
    MoodDistributionCard
    MoodTrendCard
    DateComparisonTable
    GmyRankingCard
    GmyChangeChartCard
    GmyExtremeChartCard
    EngagementByMoodGrid
    WordCloudByMoodGrid
    AllWordsCard
    DashboardStateRenderer
```

### Component Responsibilities

- `DashboardHeader`: UP Pulse logo, Is Yatirim mark, live badge, generated date.
- `SegmentTabs`: displays `all` plus all GMY segments. Selection is public and client-side.
- `KpiGrid`: participation, average mood, work-linked low mood, top word.
- `MoodDistributionCard`: latest survey date mood bars and score summary.
- `MoodTrendCard`: metric-toggle chart over survey dates.
- `DateComparisonTable`: latest four survey date rows.
- `GmyRankingCard`: GMY average score ranking.
- `GmyChangeChartCard`: previous period vs current period score comparison.
- `GmyExtremeChartCard`: bidirectional bad percentage and great percentage bars.
- `EngagementByMoodGrid`: work engagement breakdown for each mood group.
- `WordCloudByMoodGrid`: category-specific words.
- `AllWordsCard`: all words across mood groups for the selected segment.

## UI Specification

No Figma URL was provided. UI specification is derived from the supplied screenshots and Netlify HTML prototype.

### Screen

- Title: `İş Yatırım Duygu Durumu`
- Badge: `GÜNLÜK DUYGU DURUMU ANKETİ`
- Header status: `CANLI`
- Date chip: dynamic Turkish formatted date, e.g. `4 Haziran 2026 Perşembe`
- Subtitle pattern: `{latestSurveyDateLabel} · Günlük ölçüm · {trendWindowLabel}`

### Typography

- Display/headings: `Righteous`, fallback `sans-serif`
- Body/UI: `Poppins`, fallback `sans-serif`
- KPI value: Righteous, 30px in prototype
- Section label: Poppins, uppercase, letter spacing around `0.20em` to `0.24em`
- Body labels: Poppins 10-12px in dense cards

### Color Tokens

```ts
type IsYatirimColorToken =
  | "sand"
  | "text"
  | "muted"
  | "blue"
  | "orchid"
  | "teal"
  | "gold"
  | "red"
  | "green";

const tokens = {
  sand: "#F3EAD7",
  text: "#171717",
  muted: "rgba(23,23,23,.45)",
  border: "rgba(23,23,23,.08)",
  borderSoft: "#E8E0D4",
  blue: "#0057FF",
  orchid: "#985DF8",
  teal: "#00D9C0",
  gold: "#AD7A00",
  red: "#E03030",
  green: "#00A878",
};
```

### Layout Tokens

- Page background: `#F3EAD7`
- Header: sticky, 60px height, translucent sand with blur
- Max content width: 1440px
- Desktop page padding: 28px horizontal
- Card radius: 24-28px
- Pill radius: 999px
- Card shadow: `0 4px 20px rgba(23,23,23,.06)`
- Large shadow: `0 16px 48px rgba(23,23,23,.1)`
- Grid gap: 12px
- KPI grid: 4 columns desktop, 2 tablet, 1 mobile
- Main content grids: 2/3/4 columns desktop, collapse on mobile

### Mood Category Tokens

```ts
type MoodCategory = "bad" | "meh" | "good" | "great";

const moodTokens = {
  bad: { label: "Kötü", emoji: "😞", color: "#E03030" },
  meh: { label: "Eh İşte", emoji: "😐", color: "#FC7700" },
  good: { label: "İyi", emoji: "🙂", color: "#0057FF" },
  great: { label: "Harika", emoji: "🤩", color: "#00D9C0" },
};
```

## Backend Interface

### Recommended Endpoint

```text
GET /analytics/dashboard?client=is-yatirim&competencyId=<uuid>&segment=<segmentId>
```

Query parameters:

- `client`: required. Must be `is-yatirim`.
- `competencyId`: required UUID. Current verified Is Yatirim value: `9bb629ad-afd3-4cae-9744-a3faf5729174`.
- `segment`: optional. If omitted or `all`, backend returns aggregate selected segment while also returning all GMY comparison sections.

The frontend proxy route should call the backend with environment-based base URL:

```text
IS_YATIRIM_DASHBOARD_REMOTE_URL
NEXT_PUBLIC_IS_YATIRIM_DASHBOARD_REMOTE_URL
DASHBOARD_REMOTE_URL
REMOTE_URL
```

Verified live backend URL:

```text
https://dj56p3u1qe.execute-api.us-east-1.amazonaws.com/upwagmitec/analytics/dashboard?client=is-yatirim&competencyId=9bb629ad-afd3-4cae-9744-a3faf5729174&segment=all
```

### TypeScript Response Model

```ts
export type MoodCategory = "bad" | "meh" | "good" | "great";
export type EngagementAnswer = "yes" | "partial" | "no";

export type LeadershipDashboardResponse = {
  meta: {
    organizationId: string;
    organizationName: "İş Yatırım" | string;
    dashboardTitle: string;
    surveyId: string;
    surveyName: string;
    latestSurveyDate: string;
    latestSurveyDateLabel: string;
    generatedAt: string;
    trendWindowLabel: string;
    maxMoodScore: 4;
    selectedSegmentId: string;
    segments: SegmentOption[];
  };
  selectedSegment: SegmentDashboardData;
  comparisons: {
    gmyRanking: GmyRankingItem[];
    gmyScoreChanges: GmyScoreChangeItem[];
    gmyExtremes: GmyExtremeItem[];
    dateComparison: SurveyDateComparisonItem[];
  };
};

export type SegmentOption = {
  id: string;
  label: string;
  type: "all" | "gmy" | "department" | "management";
  respondentCount: number;
  targetEmployeeCount: number;
};

export type SegmentDashboardData = {
  segmentId: string;
  segmentLabel: string;
  latest: SurveyMetricSnapshot;
  trend: SurveyTrendPoint[];
  engagementByMood: Record<MoodCategory, EngagementByMood>;
  wordClouds: Record<MoodCategory, WordItem[]>;
  allWords: WordItem[];
};

export type SurveyMetricSnapshot = {
  surveyDate: string;
  surveyDateLabel: string;
  respondentCount: number;
  targetEmployeeCount: number;
  participationRate: number;
  averageMoodScore: number;
  workLinkedLowMoodRate: number;
  mostFrequentWord: WordItem | null;
  moodDistribution: Record<MoodCategory, MoodDistributionItem>;
  derived: {
    lowMoodRate: number;
    goodGreatRate: number;
  };
};

export type MoodDistributionItem = {
  category: MoodCategory;
  label: string;
  emoji: string;
  percentage: number;
  respondentCount: number;
};

export type SurveyTrendPoint = {
  surveyDate: string;
  surveyDateLabel: string;
  respondentCount: number;
  participationRate: number;
  averageMoodScore: number;
  badRate: number;
  mehRate: number;
  goodRate: number;
  greatRate: number;
};

export type SurveyDateComparisonItem = SurveyTrendPoint;

export type GmyRankingItem = {
  segmentId: string;
  label: string;
  rank: number;
  averageMoodScore: number;
  respondentCount: number;
  participationRate: number;
};

export type GmyScoreChangeItem = {
  segmentId: string;
  label: string;
  previousSurveyDate: string;
  previousAverageMoodScore: number;
  currentSurveyDate: string;
  currentAverageMoodScore: number;
  delta: number;
  respondentCount: number;
};

export type GmyExtremeItem = {
  segmentId: string;
  label: string;
  badRate: number;
  greatRate: number;
  respondentCount: number;
};

export type EngagementByMood = {
  mood: MoodCategory;
  respondentCount: number;
  answers: Record<EngagementAnswer, {
    label: "Evet" | "Kısmen" | "Hayır";
    percentage: number;
    respondentCount: number;
  }>;
  workLinkedRate: number;
};

export type WordItem = {
  text: string;
  count: number;
  normalizedText?: string;
  category?: MoodCategory;
};
```

Live response compatibility was verified on 2026-06-04. The response matches this model at the `meta`, `selectedSegment`, and `comparisons` levels. `competencyId` is used as a request parameter and is not returned in `meta`.

## Data Transformation Rules

1. `participationRate = respondentCount / targetEmployeeCount * 100`
2. `averageMoodScore` is weighted average of mood answer values on the 1-4 scale.
3. `lowMoodRate = badRate + mehRate`
4. `goodGreatRate = goodRate + greatRate`
5. `workLinkedLowMoodRate` should be backend-provided using the agreed analytics definition. If unavailable, default formula is work-linked answers among low mood respondents.
6. `dateComparison` returns at least the latest 4 survey dates when available.
7. `trend` can return more than 4 dates. The chart uses all returned points.
8. Word clouds are sorted descending by `count`, then ascending by Turkish locale label.

## Error And Empty States

```ts
type DashboardError = {
  errorCode:
    | "SURVEY_NOT_FOUND"
    | "SEGMENT_NOT_FOUND"
    | "DASHBOARD_SOURCE_UNAVAILABLE"
    | "DASHBOARD_CONTRACT_INVALID";
  errorMessage: string;
};
```

- Empty arrays must be returned as `[]`.
- Empty numeric values must be returned as `0`.
- Missing `mostFrequentWord` must be returned as `null`.
- Invalid segment must return `400` or fallback to `all`; backend choice must be documented.
- Backend outage must not render prototype constants.

## Design Decisions

1. **Single dashboard response:** The page has many coordinated sections. One response prevents inconsistent partial fetch states.
2. **Segment data plus global comparisons:** Segment selection updates focused cards while GMY comparison sections remain visible for CEO use.
3. **Backend-calculated percentages:** Percentages and counts must reconcile at the source, avoiding frontend rounding drift.
4. **Public page:** No auth middleware is required for this route because access control is explicitly out of scope for this release.
5. **Route separation:** This dashboard should not be forced into the existing competency dashboard contract because it has survey-date, mood, GMY, work-linkage, and word-cloud semantics.

## Dependencies

Use existing project dependencies where possible:

- Next.js App Router: existing project framework.
- React and TypeScript: existing frontend stack.
- `@tanstack/react-query`: already used for analytics data fetching.
- `recharts`: already used in dashboard charts and suitable for trend/bidirectional chart implementation.
- `lucide-react`: use only where icons are needed; mood labels can use prototype emoji tokens.
- Existing fonts in `app/globals.css` or equivalent font setup should provide Righteous and Poppins.
