# Analytics Summary Backend Gap PRD

## Amaç
`/analytics?competencyId=<uuid>` ekranı şu anda `GET /analytics/summary?competencyId=<uuid>` response'undan besleniyor. Mevcut response temel company filter senaryosunu karşılıyor ancak dashboard'un tüm section'larını eksiksiz ve doğru veriyle render etmek için yetersiz.

Bu doküman backend ekibine, mevcut `summary` contract'ında hangi alanların eksik olduğunu ve her eksikliğin frontend'de hangi görsel/işlevsel kayba yol açtığını net şekilde iletmek için hazırlanmıştır.

## Mevcut Response
Şu anda backend aşağıdaki shape'i döndürüyor:

```ts
type CompanySummaryData = {
  totalFeedbacks: number;
  overallAverageRating: number;
  hourlyRatings: Array<{
    hour: string;
    averageRating: number;
    totalFeedbacks: number;
  }>;
  cultureScore: {
    overallAverageRating: number;
    maxRating: number;
    questions: Array<{
      questionId: string;
      questionText: string;
      order: number;
      averageRating: number;
      totalFeedbacks: number;
    }>;
  };
};

type AnalyticsSummaryResponse = {
  competency: {
    competencyId: string;
    displayName: string;
    periodLabel: string;
  };
  maxRating: number;
  availableCompanies: string[];
  byCompany: Record<string, CompanySummaryData>;
};
```

## Frontend'de Bu Response ile Şu An Neler Çalışıyor
- Company filter tab bar render edilebiliyor.
- `all` ve company bazlı toplam feedback sayısı gösterilebiliyor.
- Genel trend grafiği `hourlyRatings` üzerinden render edilebiliyor.
- "Davranış başına toplam sinyal" listesi `cultureScore.questions[].totalFeedbacks` üzerinden render edilebiliyor.

## Eksik Veri Sebebiyle Şu An Kayıp Olan Section'lar

### 1. En Çok Sinyal Verenler
Mevcut response'ta `topSenders` yok.

Bu yüzden frontend aşağıdaki section'ı backend verisiyle dolduramıyor:
- `SİNYAL GÖNDERENLER`
- `EN ÇOK SİNYAL VERENLER`

Eksik alanlar:

```ts
topSenders: Array<{
  personId: string;
  fullName: string;
  initials: string;
  totalSignals: number;
  dominantColorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  rank: number;
}>;
```

### 2. Davranış Trendleri
Mevcut response'ta davranış bazlı time-series yok.

Şu an elimizde sadece:
- davranış bazlı toplam adet (`cultureScore.questions[].totalFeedbacks`)
- overall zaman serisi (`hourlyRatings`)

Ama aşağıdaki grafikleri doğru üretmek için her davranış için ayrı zaman serisi gerekiyor:
- `Amaç ve hedefi ekibi için netleştirdi.` trendi
- `Katma değeri düşük işleri eledi...` trendi
- `Sözleri ve duruşuyla umut ve cesaret verdi.` trendi
- `İleri bildirim vererek işi ve kişiyi geliştirdi.` trendi
- diğer davranış kartları

Eksik alanlar:

```ts
behaviorTrends: Array<{
  behaviorId: string;
  label: string;
  colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  granularities: {
    daily: { points: Array<{ label: string; value: number }> };
    weekly: { points: Array<{ label: string; value: number }> };
    monthly: { points: Array<{ label: string; value: number }> };
  };
}>;
```

Alternatif olarak backend isterse daha düşük seviyeli ham veri de dönebilir:

```ts
behaviorHourlyRatings: Array<{
  behaviorId: string;
  hour: string;
  totalFeedbacks: number;
  averageRating: number;
}>;
```

Ancak frontend'in ek aggregation yapmasına gerek kalmaması için `behaviorTrends.granularities` formatı tercih edilir.

### 3. KPI Kartlarındaki Benzersiz Sayılar
Mevcut response'ta sadece `totalFeedbacks` var. Aşağıdaki KPI kartları için gerekli sayılar yok:
- `BENZERSİZ KİŞİ`
- `SİNYAL VEREN`
- `SİNYAL ALAN`

Eksik alanlar:

```ts
kpis: {
  totalSignals: number;
  uniqueParticipants: number;
  uniqueSenders: number;
  uniqueReceivers: number;
};
```

Tanımlar:
- `totalSignals`: toplam sinyal / toplam feedback
- `uniqueParticipants`: sender + receiver union benzersiz kişi sayısı
- `uniqueSenders`: benzersiz sinyal veren kişi sayısı
- `uniqueReceivers`: benzersiz sinyal alan kişi sayısı

### 4. Şirket Karşılaştırması
Mevcut response'tan `byCompany[company].totalFeedbacks` ile kaba bir şirket karşılaştırması türetilebiliyor. Ancak backend tarafında explicit `companyComparison` dönülmesi tercih edilir.

Sebep:
- sıralama backend'de sabitlenir
- label/id/slug tek kaynaktan gelir
- ileride farklı metriklerle şirket karşılaştırması gerekirse contract genişler

Önerilen alan:

```ts
companyComparison: Array<{
  companyId: string;
  label: string;
  totalSignals: number;
  colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
}>;
```

### 5. Meta Bilgilerinin Dashboard'a Uygun Formatı
Mevcut response'ta `availableCompanies` sadece string array.

Bu kullanılabiliyor, ancak frontend ideal olarak aşağıdaki formatı tercih eder:

```ts
meta: {
  competencyId: string;
  competencyName: string;
  dashboardTitle: string;
  periodLabel: string;
  totalSignalsBadge: string;
  availableCompanies: Array<{
    id: string;
    slug: string;
    label: string;
  }>;
  selectedCompany: string;
};
```

Bu sayede frontend'in string -> slug dönüşümü, localization normalizasyonu ve selected company türetmesi backend'e taşınır.

### 6. Davranış Toplamları için Renk ve Kimlik Bilgisi
Şu an `cultureScore.questions` kullanılarak behavior totals türetilebiliyor, ancak aşağıdaki bilgiler backend'de explicit gelirse UI daha stabil olur:

```ts
behaviorTotals: Array<{
  behaviorId: string;
  label: string;
  totalSignals: number;
  colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
}>;
```

## Frontend'in Şu An Yaptığı Workaround'lar
Backend'e özellikle iletilmesi gereken nokta şu: aşağıdaki veriler şu an gerçek contract değil, frontend geçici türetim yapıyor.

- `overallTrend` -> `hourlyRatings.totalFeedbacks` üzerinden türetiliyor
- `behaviorTotals` -> `cultureScore.questions[].totalFeedbacks` üzerinden türetiliyor
- `companyComparison` -> `availableCompanies + byCompany[company].totalFeedbacks` üzerinden türetiliyor
- `topSenders` -> hiç üretilemiyor
- `behaviorTrends` -> hiç üretilemiyor
- `uniqueParticipants`, `uniqueSenders`, `uniqueReceivers` -> hiç üretilemiyor

Bu nedenle mevcut response ile dashboard kısmen çalışır, ancak tam parity sağlanamaz.

## Backend İçin Net Gereksinim
Backend tarafında iki seçenekten biri seçilmelidir.

### Seçenek A: `summary` response'unu genişletmek
Mevcut `AnalyticsSummaryResponse` korunur ve aşağıdaki alanlar eklenir:

```ts
type AnalyticsSummaryResponse = {
  competency: {
    competencyId: string;
    displayName: string;
    periodLabel: string;
  };
  maxRating: number;
  availableCompanies: string[];
  byCompany: Record<string, CompanySummaryData>;

  kpis?: {
    totalSignals: number;
    uniqueParticipants: number;
    uniqueSenders: number;
    uniqueReceivers: number;
  };
  companyComparison?: Array<{
    companyId: string;
    label: string;
    totalSignals: number;
    colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  }>;
  topSenders?: Array<{
    personId: string;
    fullName: string;
    initials: string;
    totalSignals: number;
    dominantColorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
    rank: number;
  }>;
  behaviorTotals?: Array<{
    behaviorId: string;
    label: string;
    totalSignals: number;
    colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  }>;
  behaviorTrends?: Array<{
    behaviorId: string;
    label: string;
    colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
    granularities: {
      daily: { points: Array<{ label: string; value: number }> };
      weekly: { points: Array<{ label: string; value: number }> };
      monthly: { points: Array<{ label: string; value: number }> };
    };
  }>;
};
```

### Seçenek B: Dashboard için ayrı endpoint kullanmak
`GET /analytics/dashboard?competencyId=<uuid>&period=<...>&company=<...>`

Bu endpoint aşağıdaki full dashboard contract'ını döner:

```ts
type AnalyticsDashboardResponse = {
  meta: {
    competencyId: string;
    competencyName: string;
    dashboardTitle: string;
    periodLabel: string;
    totalSignalsBadge: string;
    availableCompanies: Array<{
      id: string;
      slug: string;
      label: string;
    }>;
    selectedCompany: string;
  };
  kpis: {
    totalSignals: number;
    uniqueParticipants: number;
    uniqueSenders: number;
    uniqueReceivers: number;
  };
  overallTrend: {
    granularities: {
      daily: { points: Array<{ label: string; value: number }> };
      weekly: { points: Array<{ label: string; value: number }> };
      monthly: { points: Array<{ label: string; value: number }> };
    };
  };
  behaviorTotals: Array<{
    behaviorId: string;
    label: string;
    totalSignals: number;
    colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  }>;
  companyComparison: Array<{
    companyId: string;
    label: string;
    totalSignals: number;
    colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  }>;
  topSenders: Array<{
    personId: string;
    fullName: string;
    initials: string;
    totalSignals: number;
    dominantColorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
    rank: number;
  }>;
  behaviorSummary: Array<{
    behaviorId: string;
    label: string;
    totalSignals: number;
    colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  }>;
  behaviorTrends: Array<{
    behaviorId: string;
    label: string;
    colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
    granularities: {
      daily: { points: Array<{ label: string; value: number }> };
      weekly: { points: Array<{ label: string; value: number }> };
      monthly: { points: Array<{ label: string; value: number }> };
    };
  }>;
  filters: {
    availablePeriods: string[];
    availableGranularities: Array<"daily" | "weekly" | "monthly">;
  };
};
```

## Backend'e İletilecek Kısa Özet
- Company filter verisi geliyor ve kullanılabiliyor.
- Ama `topSenders` backend response'unda yok.
- Davranış trend chart'ları için behavior bazlı time-series yok.
- KPI kartları için `uniqueParticipants`, `uniqueSenders`, `uniqueReceivers` yok.
- Bu nedenle dashboard tam parity ile render edilemiyor.
- Backend ya `summary` response'unu genişletmeli ya da tam `dashboard` contract'ını ayrı endpoint'te vermeli.
