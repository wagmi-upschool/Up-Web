# Is Yatirim Leadership Dashboard Backend Data Schema

## Purpose

Bu dokuman backend ekibinden istenecek veri contract'ini tanimlar. Frontend production dashboard'da statik Netlify verilerini kullanmayacak; tum alanlar bu contract veya esdeger bir view/API uzerinden beslenecektir.

## Endpoint

```text
GET /analytics/dashboard?client=is-yatirim&competencyId=<uuid>&segment=<segmentId>
```

### Query Parameters

| Name | Required | Type | Description |
| --- | --- | --- | --- |
| `client` | Yes | string | Is Yatirim dashboard icin `is-yatirim` olmalidir. |
| `competencyId` | Yes | UUID string | Is Yatirim dashboard veri setini belirleyen competency ID. |
| `segment` | No | string | `all` veya GMY segment ID. Bos ise `all`. |

Verified live endpoint:

```text
https://dj56p3u1qe.execute-api.us-east-1.amazonaws.com/upwagmitec/analytics/dashboard?client=is-yatirim&competencyId=9bb629ad-afd3-4cae-9744-a3faf5729174&segment=all
```

## Response Contract

```json
{
  "meta": {
    "organizationId": "is-yatirim",
    "organizationName": "İş Yatırım",
    "dashboardTitle": "İş Yatırım Duygu Durumu",
    "surveyId": "daily-mood-2026-06-03",
    "surveyName": "Günlük Duygu Durumu Anketi",
    "latestSurveyDate": "2026-06-03",
    "latestSurveyDateLabel": "3 Haziran 2026",
    "generatedAt": "2026-06-04T09:00:00Z",
    "trendWindowLabel": "7 günlük trend (20 May - 3 Haz)",
    "maxMoodScore": 4,
    "selectedSegmentId": "all",
    "segments": []
  },
  "selectedSegment": {},
  "comparisons": {
    "gmyRanking": [],
    "gmyScoreChanges": [],
    "gmyExtremes": [],
    "dateComparison": []
  }
}
```

## Type Definitions

```ts
type MoodCategory = "bad" | "meh" | "good" | "great";
type EngagementAnswer = "yes" | "partial" | "no";

type LeadershipDashboardResponse = {
  meta: DashboardMeta;
  selectedSegment: SegmentDashboardData;
  comparisons: DashboardComparisons;
};

type DashboardMeta = {
  organizationId: string;
  organizationName: string;
  dashboardTitle: string;
  surveyId: string;
  surveyName: string;
  latestSurveyDate: string;       // YYYY-MM-DD
  latestSurveyDateLabel: string;  // Turkish display label
  generatedAt: string;            // ISO datetime
  trendWindowLabel: string;
  maxMoodScore: 4;
  selectedSegmentId: string;
  segments: SegmentOption[];
};

type SegmentOption = {
  id: string;
  label: string;
  type: "all" | "gmy" | "department" | "management";
  respondentCount: number;
  targetEmployeeCount: number;
};

type SegmentDashboardData = {
  segmentId: string;
  segmentLabel: string;
  latest: SurveyMetricSnapshot;
  trend: SurveyTrendPoint[];
  engagementByMood: Record<MoodCategory, EngagementByMood>;
  wordClouds: Record<MoodCategory, WordItem[]>;
  allWords: WordItem[];
};

type SurveyMetricSnapshot = {
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

type MoodDistributionItem = {
  category: MoodCategory;
  label: string;
  emoji: string;
  percentage: number;
  respondentCount: number;
};

type SurveyTrendPoint = {
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

type DashboardComparisons = {
  gmyRanking: GmyRankingItem[];
  gmyScoreChanges: GmyScoreChangeItem[];
  gmyExtremes: GmyExtremeItem[];
  dateComparison: SurveyTrendPoint[];
};

type GmyRankingItem = {
  segmentId: string;
  label: string;
  rank: number;
  averageMoodScore: number;
  respondentCount: number;
  participationRate: number;
};

type GmyScoreChangeItem = {
  segmentId: string;
  label: string;
  previousSurveyDate: string;
  previousAverageMoodScore: number;
  currentSurveyDate: string;
  currentAverageMoodScore: number;
  delta: number;
  respondentCount: number;
};

type GmyExtremeItem = {
  segmentId: string;
  label: string;
  badRate: number;
  greatRate: number;
  respondentCount: number;
};

type EngagementByMood = {
  mood: MoodCategory;
  respondentCount: number;
  answers: Record<EngagementAnswer, EngagementAnswerMetric>;
  workLinkedRate: number;
};

type EngagementAnswerMetric = {
  label: "Evet" | "Kısmen" | "Hayır";
  percentage: number;
  respondentCount: number;
};

type WordItem = {
  text: string;
  count: number;
  normalizedText?: string;
  category?: MoodCategory;
};
```

## Required Segment IDs

Backend should return stable IDs, not display names as keys.

Example:

```json
[
  { "id": "all", "label": "Tüm Şirket", "type": "all" },
  { "id": "burak-kinalilar", "label": "Burak Kınalılar", "type": "gmy" },
  { "id": "fatih-mehmet-yilmaz", "label": "Fatih Mehmet Yılmaz", "type": "gmy" },
  { "id": "orhan-veli-canli", "label": "Orhan Veli Canlı", "type": "gmy" },
  { "id": "evren-arslan", "label": "Evren Arslan", "type": "gmy" },
  { "id": "pinar-ozyuksel", "label": "Pınar Özyüksel", "type": "gmy" },
  { "id": "serhat-devecioglu", "label": "Serhat Devecioğlu", "type": "gmy" },
  { "id": "sant-manukyan", "label": "Şant Manukyan", "type": "gmy" },
  { "id": "ic-sistemler", "label": "İç Sistemler", "type": "department" },
  { "id": "murat-kural", "label": "Murat Kural", "type": "gmy" },
  { "id": "yonetim", "label": "Yönetim", "type": "management" }
]
```

## Calculation Rules

| Field | Rule |
| --- | --- |
| `participationRate` | `respondentCount / targetEmployeeCount * 100` |
| `averageMoodScore` | Weighted average on 1-4 mood scale |
| `badRate` | Bad respondent count / respondent count * 100 |
| `mehRate` | Meh respondent count / respondent count * 100 |
| `goodRate` | Good respondent count / respondent count * 100 |
| `greatRate` | Great respondent count / respondent count * 100 |
| `lowMoodRate` | `badRate + mehRate` |
| `goodGreatRate` | `goodRate + greatRate` |
| `workLinkedRate` | `(yes + partial) / mood group respondent count * 100` |
| `workLinkedLowMoodRate` | Work-linked rate for low mood respondents, or agreed aggregate definition |
| `delta` | `currentAverageMoodScore - previousAverageMoodScore` |

Percentages should be rounded to one decimal place unless backend has a central reporting rule.

## Data Source View Suggestion

Backend can expose one API composed from these logical views:

```sql
-- Latest metrics by survey date and segment
analytics_is_yatirim_mood_segment_daily
  survey_id
  survey_date
  segment_id
  segment_label
  segment_type
  respondent_count
  target_employee_count
  participation_rate
  average_mood_score
  bad_count
  meh_count
  good_count
  great_count
  bad_rate
  meh_rate
  good_rate
  great_rate
  work_linked_low_mood_rate

-- Engagement answers by mood category
analytics_is_yatirim_engagement_by_mood
  survey_id
  survey_date
  segment_id
  mood_category
  respondent_count
  yes_count
  partial_count
  no_count
  yes_rate
  partial_rate
  no_rate
  work_linked_rate

-- Word frequencies by segment and mood
analytics_is_yatirim_word_cloud
  survey_id
  survey_date
  segment_id
  mood_category
  word_text
  normalized_text
  word_count

-- GMY current and previous score comparison
analytics_is_yatirim_gmy_score_change
  segment_id
  segment_label
  previous_survey_date
  previous_average_mood_score
  current_survey_date
  current_average_mood_score
  delta
  respondent_count
```

## Contract Guarantees

- `meta.segments` must always include `all`.
- `selectedSegment` must match the requested `segment`, or `all` if no segment is provided.
- `comparisons.gmyRanking`, `comparisons.gmyScoreChanges`, and `comparisons.gmyExtremes` must include all visible GMY segments.
- `comparisons.dateComparison` must include the latest 4 survey dates when at least 4 dates exist.
- `selectedSegment.trend` may include more dates than `dateComparison`.
- `client=is-yatirim` and a valid `competencyId` are required request parameters for the live backend.
- `competencyId` is request-level routing input and is not currently returned in the response body.
- Empty lists must be `[]`.
- Empty numeric values must be `0`.
- Missing most frequent word must be `null`.
- Dates must be `YYYY-MM-DD`.
- `generatedAt` must be ISO datetime.

## Live Response Verification

The live endpoint was fetched and compared against this schema on 2026-06-04. The response top-level keys are:

```json
["comparisons", "meta", "selectedSegment"]
```

The verified response includes:

- `meta.segments`: 11 items including `all`
- `selectedSegment.trend`: 7 survey date points
- `comparisons.dateComparison`: 4 survey date points
- `comparisons.gmyRanking`: 10 GMY rows
- `comparisons.gmyScoreChanges`: 10 GMY rows
- `comparisons.gmyExtremes`: 10 GMY rows
- `selectedSegment.engagementByMood`: `bad`, `meh`, `good`, `great`
- `selectedSegment.wordClouds`: `bad`, `meh`, `good`, `great`

## Error Contract

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
