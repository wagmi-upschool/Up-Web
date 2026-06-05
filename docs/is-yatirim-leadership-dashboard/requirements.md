# Is Yatirim Leadership Dashboard Requirements

## Introduction

Bu dokuman, Netlify uzerindeki "UP Pulse - Is Yatirim" HTML prototipinin bu Next.js uygulamasinda production-ready, public ve backend verisine bagli bir leadership dashboard olarak gelistirilmesi icin gereksinimleri tanimlar.

Dashboard CEO kullanimina yoneliktir. Login olmayacak, tum GMY segmentleri ayni ekranda gorunur olacak ve metrikler statik HTML/JS verisinden degil canli backend kaynagindan beslenecektir.

Referans prototip: https://up-pulse-dashboard-is-yatirim.netlify.app/

## Glossary

- **UP Pulse:** Dashboard'un gorsel dilini ve survey deneyimini temsil eden marka.
- **Is Yatirim Dashboard:** Gunluk duygu durumu anketini Is Yatirim organizasyonu icin gosterilecek public dashboard.
- **GMY:** Genel Mudur Yardimcisi kirilimi veya yonetici segmenti. Tab filtresi ve siralama bolumlerinde kullanilir.
- **Segment:** `Tüm Şirket` veya tek bir GMY grubu icin filtrelenmis veri kumesi.
- **Survey Date:** Anketin olcum tarihi. Ornek: `2026-06-03`.
- **Participation Rate:** Yanit veren kisi sayisinin hedef calisan sayisina oranidir.
- **Mood Score:** 1-4 skalasinda duygu durumu ortalamasi.
- **Mood Distribution:** `bad`, `meh`, `good`, `great` kategorileri icin yuzde ve kisi sayisi.
- **Work-Linked Low Mood:** Dusuk duygu kategorilerindeki kisilerin "ise bagli" yanit oranini temsil eden KPI.
- **Word Cloud:** Aciklama cevaplarindan uretilen kelime ve frekans listesi.
- **Live Data Source:** Backend API, view veya tablo kaynagi. Frontend statik veri tutmayacaktir.

## Requirement 1: Public Dashboard Access

**User Story:** As a CEO, I want to open the Is Yatirim leadership dashboard directly from a URL, so that I can review survey results without login friction.

### Acceptance Criteria

1.1 WHEN a user opens the dashboard URL, THE System SHALL render the dashboard without authentication.

1.2 THE System SHALL NOT require role-based visibility rules for GMY segments in this release.

1.3 THE System SHALL expose all GMY tabs and all GMY comparison sections to every user who has the URL.

1.4 IF the backend is unavailable, THEN THE System SHALL show an explicit error state instead of silently rendering stale static data.

## Requirement 2: UP Pulse Visual Parity

**User Story:** As a stakeholder, I want the dashboard to preserve the approved UP Pulse prototype design, so that the production screen matches the expected executive presentation quality.

### Acceptance Criteria

2.1 THE System SHALL preserve the UP Pulse visual language from the prototype, including sand background, white rounded cards, soft shadows, pill tabs, Righteous headings, Poppins body typography, and color tokens.

2.2 THE System SHALL display UP Pulse and Is Yatirim brand marks in the header.

2.3 THE System SHALL show the page title `İş Yatırım Duygu Durumu`.

2.4 THE System SHALL use responsive layouts for desktop and mobile without overlapping text, charts, tabs, or cards.

2.5 THE System SHALL replace raw HTML/imperative DOM updates with React/Next.js components.

## Requirement 3: Backend-Driven KPI Cards

**User Story:** As a CEO, I want the top KPI cards to reflect current survey data, so that I can quickly understand participation, sentiment, risk, and recurring topics.

### Acceptance Criteria

3.1 THE System SHALL render KPI cards for participation rate, average mood score, work-linked low mood percentage, and most frequent word.

3.2 WHEN the selected segment changes, THE System SHALL update all KPI card values from the selected segment data.

3.3 THE System SHALL show participation as `respondentCount / targetEmployeeCount` and a percentage.

3.4 THE System SHALL show average mood score on a 4-point scale.

3.5 THE System SHALL show the most frequent word with frequency and any backend-provided note label.

## Requirement 4: Mood Distribution And Trend

**User Story:** As a CEO, I want to see the latest mood distribution and date-based trend, so that I can compare current sentiment with prior survey dates.

### Acceptance Criteria

4.1 THE System SHALL render distribution bars for `Kötü`, `Eh İşte`, `İyi`, and `Harika`.

4.2 THE System SHALL show both percentage and respondent count for each mood category.

4.3 THE System SHALL render a trend chart using backend-provided survey date points.

4.4 THE System SHALL provide metric toggles for participation, average mood, bad percentage, meh percentage, good percentage, and great percentage.

4.5 THE System SHALL render a date comparison table for the latest 4 survey dates returned by the backend.

## Requirement 5: GMY Segmentation

**User Story:** As a CEO, I want to compare GMY groups openly, so that I can identify leadership areas requiring attention without per-user access restrictions.

### Acceptance Criteria

5.1 THE System SHALL render a tab filter containing `Tüm Şirket` and all backend-provided GMY segments.

5.2 WHEN a GMY tab is selected, THE System SHALL update segment-specific KPI cards, distribution, engagement analysis, and word clouds.

5.3 THE System SHALL keep GMY ranking and GMY comparison sections visible even when a single segment is selected, unless backend explicitly returns no data.

5.4 THE System SHALL sort GMY average mood ranking from highest score to lowest score.

5.5 THE System SHALL render GMY previous-vs-current score comparison for every backend-provided GMY segment.

5.6 THE System SHALL render a bidirectional bad-vs-great bar chart for GMY extremes.

## Requirement 6: Work Engagement By Mood Category

**User Story:** As a CEO, I want to see how work engagement answers differ by mood category, so that I can understand whether negative sentiment is work-related.

### Acceptance Criteria

6.1 THE System SHALL render engagement cards for `Kötü`, `Eh İşte`, `İyi`, and `Harika` respondent groups.

6.2 THE System SHALL show `Evet`, `Kısmen`, and `Hayır` percentages for each mood group.

6.3 THE System SHALL show a derived `İşe bağlı (evet+kısmen)` percentage for each mood group.

6.4 IF a mood group has zero respondents, THEN THE System SHALL render zero values and avoid divide-by-zero errors.

## Requirement 7: Word Clouds

**User Story:** As a CEO, I want to see common explanation words by mood category, so that qualitative signals are visible alongside numeric metrics.

### Acceptance Criteria

7.1 THE System SHALL render separate word clouds for `Kötü`, `Eh İşte`, `İyi`, and `Harika`.

7.2 THE System SHALL render an all-words cloud sorted by frequency.

7.3 WHEN a segment tab changes, THE System SHALL update word clouds using backend data for the selected segment.

7.4 THE System SHALL render empty word states without broken layouts.

## Requirement 8: Backend Data Contract

**User Story:** As a frontend engineer, I want a stable backend contract, so that every dashboard component can be rendered without client-side guessing or static fallback.

### Acceptance Criteria

8.1 THE System SHALL fetch dashboard data from a documented API endpoint.

8.2 THE backend SHALL return all required arrays as arrays, using `[]` when data is empty.

8.3 THE backend SHALL return all required numeric fields as numbers, using `0` when data is empty.

8.4 THE backend SHALL return segment IDs and labels consistently across tabs, rankings, comparisons, engagement cards, and word clouds.

8.5 THE backend SHALL return survey dates in ISO `YYYY-MM-DD` format.

8.6 THE frontend SHALL NOT hardcode prototype metric values in production.

## Requirement 9: Deployment And Operations

**User Story:** As a product owner, I want the dashboard deployed to a stable URL, so that stakeholders can access the latest data.

### Acceptance Criteria

9.1 THE System SHALL be deployable through the existing web hosting pipeline.

9.2 THE System SHALL support environment-based backend base URL configuration.

9.3 THE System SHALL disable caching or use a documented revalidation policy suitable for live dashboard data.

9.4 THE System SHALL provide loading, error, and empty states.

9.5 THE System SHALL include focused tests for data adapter logic and query parameter behavior.

