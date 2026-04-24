# Eczacıbaşı UP Pulse Dashboard PRD

## Amaç
`competencyId` bazlı, public read-only bir organizasyon dashboard'u üretmek. Frontend hedef route'u `/analytics?competencyId=<uuid>` olacak ve yeni dashboard yapısı `summary` endpoint'inden değil, yeni dashboard contract'ından beslenecek.

## Endpoint
`GET /analytics/dashboard?competencyId=<uuid>&period=2026-04&company=esan`

### Query Parametreleri
- `competencyId`: zorunlu, UUID
- `period`: opsiyonel, `YYYY-MM`
- `company`: opsiyonel, şirket slug değeri. Verilmezse aggregate görünüm döner

## Response Contract
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

## Hesaplama Kuralları
- `totalSignals`: seçili filtredeki toplam sinyal
- `uniqueParticipants`: sender ve receiver union benzersiz kişi sayısı
- `uniqueSenders`: benzersiz sinyal veren kişi sayısı
- `uniqueReceivers`: benzersiz sinyal alan kişi sayısı
- `behaviorTotals`: davranış bazlı toplam sinyal, yüksekten düşüğe sıralanabilir
- `companyComparison`: şirket bazlı toplam sinyal
- `topSenders`: toplam sinyal sayısına göre descending, rank verilmiş halde
- `peakDay`: ilgili davranış için en yüksek sinyal yoğunluğu olan gün ve değer
- `overallTrend` ve `behaviorTrends`: aynı filtre seti için aggregate edilmiş seri

## Null ve Hata Davranışı
- Boş listeler `[]`
- Sayısal alanlar `0`
- Geçersiz `competencyId`: `400`
- Veri bulunamadı: boş dashboard payload dönebilir
- Endpoint bulunamadı veya henüz implement edilmediyse frontend local mock fallback ile render edebilir; üretim için backend contract esas kabul edilmelidir

## Backward Compatibility
- Mevcut `/analytics/summary` korunacak
- Yeni frontend yalnız `/analytics/dashboard` endpoint'ini kullanacak
