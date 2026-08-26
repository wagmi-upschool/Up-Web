# Is Yatirim Leadership Dashboard Backend Data Schema

## Purpose

Bu dokuman backend ekibinden istenecek veri contract'ini tanimlar. Frontend production dashboard'da statik Netlify verilerini kullanmayacak; tum alanlar bu contract veya esdeger bir view/API uzerinden beslenecektir.

## Endpoint

```text
GET /analytics/dashboard?client=is-yatirim&competencyId=<uuid>&segment=<segmentId>&unvan=<unvanId>&dateMode=<single|range>&startDate=<YYYY-MM-DD>&endDate=<YYYY-MM-DD>
```

### Query Parameters

| Name           | Required | Type              | Description                                                         |
| -------------- | -------- | ----------------- | ------------------------------------------------------------------- |
| `client`       | Yes      | string            | Is Yatirim dashboard icin `is-yatirim` olmalidir.                   |
| `competencyId` | Yes      | UUID string       | Is Yatirim dashboard veri setini belirleyen competency ID.          |
| `segment`      | No       | string            | `all` veya GMY segment ID. Bos ise `all`.                           |
| `unvan`        | No       | string            | Unvan ID. Verildiğinde `segment=all` ile seçili unvan dilimi döner. |
| `dateMode`     | No       | `single \| range` | Tarih filtresinin tek gün veya aralık olduğunu belirtir.            |
| `startDate`    | No       | `YYYY-MM-DD`      | Seçili pencerenin dahil başlangıç tarihi.                           |
| `endDate`      | No       | `YYYY-MM-DD`      | Seçili pencerenin dahil bitiş tarihi.                               |

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
  selectedUnvan?: SegmentDashboardData | null;
  comparisons: DashboardComparisons;
};

type DashboardMeta = {
  organizationId: string;
  organizationName: string;
  dashboardTitle: string;
  surveyId: string;
  surveyName: string;
  latestSurveyDate: string; // YYYY-MM-DD
  latestSurveyDateLabel: string; // Turkish display label
  generatedAt: string; // ISO datetime
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
  consecutiveMoodStreaks: ConsecutiveMoodStreaks;
};

type ConsecutiveMoodStreakBucketCounts = {
  exactly3Days: number;
  exactly4Days: number;
  atLeast5Days: number;
};

type ConsecutiveMoodStreaks = {
  bad: ConsecutiveMoodStreakBucketCounts;
  great: ConsecutiveMoodStreakBucketCounts;
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
  {
    "id": "fatih-mehmet-yilmaz",
    "label": "Fatih Mehmet Yılmaz",
    "type": "gmy"
  },
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

| Field                   | Rule                                                                      |
| ----------------------- | ------------------------------------------------------------------------- |
| `participationRate`     | `respondentCount / targetEmployeeCount * 100`                             |
| `averageMoodScore`      | Weighted average on 1-4 mood scale                                        |
| `badRate`               | Bad respondent count / respondent count \* 100                            |
| `mehRate`               | Meh respondent count / respondent count \* 100                            |
| `goodRate`              | Good respondent count / respondent count \* 100                           |
| `greatRate`             | Great respondent count / respondent count \* 100                          |
| `lowMoodRate`           | `badRate + mehRate`                                                       |
| `goodGreatRate`         | `goodRate + greatRate`                                                    |
| `workLinkedRate`        | `(yes + partial) / mood group respondent count * 100`                     |
| `workLinkedLowMoodRate` | Work-linked rate for low mood respondents, or agreed aggregate definition |
| `delta`                 | `currentAverageMoodScore - previousAverageMoodScore`                      |

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

## Consecutive Mood Streak Contract

Frontend rollout'u query-param feature flag ile kontrol edilir; varsayilan olarak aciktir:

```text
/is-yatirim/leadership-dashboard?isMoodStreaks=true
```

Grafik, `isMoodStreaks=false` verilmedikce render edilir. Bu frontend flag'i upstream `/analytics/dashboard` request'ine aktarilmaz ve backend response contract'ini degistirmez.

### Required Source Fields

Backend hesaplamasi asagidaki mantiksal alanlara erisebilmelidir. Bu alanlar API response'una eklenmemelidir.

| Logical field                          | Purpose                                                              |
| -------------------------------------- | -------------------------------------------------------------------- |
| `user_id`                              | Calisani gunler arasinda anonim ve kararli bicimde eslestirmek.      |
| Question 1 answer                      | Canonical `kotu`, `eh_iste`, `iyi`, `harika` degeri.                 |
| `puanlama_tarih_saat`                  | Ayni gun yanitlarini siralamak ve `Europe/Istanbul` gununu turetmek. |
| `competencyId` / organization relation | Yanitlari istenen dashboard veri setiyle sinirlamak.                 |
| GMY segment and unvan membership       | Mevcut dashboard ile ayni `segment` ve `unvan` kapsamini uygulamak.  |

### Calculation Rules

1. Request'teki dahil `startDate` ve `endDate` ile secili organizasyon/GMY/unvan kapsamindaki kayitlari filtrele.
2. Gun sinirlarini `Europe/Istanbul` zaman diliminde hesapla. Ayni kullanicinin ayni gundeki birden fazla yanitinda en son `puanlama_tarih_saat` degerini kullan.
3. Her kullanicinin gunlerini artan tarihle sirala. Eksik gun, `eh_iste`, `iyi` veya kategori degisimi seriyi keser.
4. Pencere disindaki komsu gunleri okuma; `startDate` seriyi keser.
5. Kullanici icin tum `kotu` ve `harika` serileri arasindaki en uzun seriyi sec. Esit uzunlukta bitis tarihi daha yeni olani sec.
6. Her kullaniciyi toplamda en fazla bir kovaya yaz. Uzunluk 3'ten kucukse kullaniciyi hicbir kovaya yazma.
7. Uzunluk tam 3 ise `exactly3Days`, tam 4 ise `exactly4Days`, 5 veya daha fazlaysa `atLeast5Days` alanini artir.

### Response Example

`consecutiveMoodStreaks`, hem `selectedSegment` hem de response'ta mevcutsa `selectedUnvan` icinde ayni sekilde donmelidir:

```json
{
  "segmentId": "all",
  "segmentLabel": "Tüm Şirket",
  "consecutiveMoodStreaks": {
    "bad": {
      "exactly3Days": 12,
      "exactly4Days": 6,
      "atLeast5Days": 3
    },
    "great": {
      "exactly3Days": 18,
      "exactly4Days": 9,
      "atLeast5Days": 5
    }
  }
}
```

Alan backend rollout'u tamamlandiginda zorunludur. Alt alanlar eksiksiz, sifir dahil non-negative integer donmelidir. Ham `user_id`, gunluk yanit veya kisi listesi response'a eklenmemelidir. Kucuk gruplar icin bu contract seviyesinde sayi maskeleme uygulanmaz.

### Backend Acceptance Scenarios

- Eksik gun, `eh_iste`, `iyi` ve kategori degisimi seriyi keser.
- Tam 3, tam 4, tam 5 ve 5'ten uzun seriler dogru kovaya girer.
- Ayni kullanicinin Kotu ve Harika serilerinden yalniz en uzunu sayilir; esitlikte daha yakin tarihte biten seri kazanir.
- Aralik oncesinde baslayan seri `startDate` sinirinda kirpilir.
- Ayni gundeki birden fazla cevapta son cevap kullanilir.
- `all`, GMY ve unvan sorgulari mevcut dashboard uyelik semantigiyle farkli ama tutarli toplamlar dondurur.
- 3 gunden kisa ve tek gun araliklarinda alti alan da `0` doner.

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
- `selectedSegment.consecutiveMoodStreaks` and, when present, `selectedUnvan.consecutiveMoodStreaks` must contain all six non-negative integer bucket counts.
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
