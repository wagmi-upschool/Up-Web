# Analytics Summary Contract PRD

## Amaç
`/analytics?competencyId=<uuid>` ve `/feedback/analytics?competencyId=<uuid>` ekranları artık aynı ana veri kaynağı olan `GET /analytics/summary?competencyId=<uuid>` response'unu kullanıyor. Bu dokümanın amacı backend ekibi için response contract'ını netleştirmek, zorunlu alanları tanımlamak ve frontend'in düzgün render edebilmesi için hangi garantilere ihtiyaç duyduğunu eksiksiz şekilde ortaya koymaktır.

## Güncel Durum
Gerçek endpoint çağrısında backend şu an yalnızca company listesi değil, dashboard'un kritik section'larını da besleyen alanları döndürüyor:

- top-level:
  - `competency`
  - `maxRating`
  - `availableCompanies`
  - `companyComparison`
  - `byCompany`
- her `byCompany[key]` altında:
  - `totalFeedbacks`
  - `overallAverageRating`
  - `hourlyRatings`
  - `cultureScore`
  - `kpis`
  - `overallTrend`
  - `behaviorTotals`
  - `topSenders`
  - `behaviorTrends`

Bu veri seti dashboard parity için büyük ölçüde yeterlidir. Sorun artık "veri yokluğu" değil, contract'ın resmi ve garanti edilmiş olmamasıdır. Frontend'in kırılmaması için aşağıdaki alanlar dokümante edilmeli ve zorunlu hale getirilmelidir.

## Endpoint
`GET /analytics/summary?competencyId=<uuid>`

### Request
- query param: `competencyId`
- format: UUID
- zorunlu

### Başarılı Response
```ts
type AnalyticsSummaryResponse = {
  competency: {
    competencyId: string;
    displayName: string;
    periodLabel: string;
  };
  maxRating: number;
  availableCompanies: string[];
  companyComparison: CompanyComparisonItem[];
  byCompany: Record<string, CompanyDashboardSlice>;
};

type CompanyDashboardSlice = {
  totalFeedbacks: number;
  overallAverageRating: number;
  hourlyRatings: HourlyRatingPoint[];
  cultureScore: {
    overallAverageRating: number;
    maxRating: number;
    questions: CultureQuestion[];
  };
  kpis: {
    totalSignals: number;
    uniqueParticipants: number;
    uniqueSenders: number;
    uniqueReceivers: number;
  };
  overallTrend: {
    granularities: TrendGranularities;
  };
  behaviorTotals: BehaviorTotalItem[];
  topSenders: TopSenderItem[];
  behaviorTrends: BehaviorTrendItem[];
};

type HourlyRatingPoint = {
  hour: string;
  averageRating: number;
  totalFeedbacks: number;
};

type CultureQuestion = {
  questionId: string;
  questionText: string;
  order: number;
  averageRating: number;
  totalFeedbacks: number;
};

type CompanyComparisonItem = {
  companyId: string;
  label: string;
  totalSignals: number;
  colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
};

type BehaviorTotalItem = {
  behaviorId: string;
  label: string;
  totalSignals: number;
  colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
};

type TopSenderItem = {
  personId: string;
  fullName: string;
  initials: string;
  totalSignals: number;
  dominantColorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  rank: number;
};

type BehaviorTrendItem = {
  behaviorId: string;
  label: string;
  colorToken: "gold" | "blue" | "green" | "red" | "purple" | "orange";
  granularities: TrendGranularities;
};

type TrendGranularities = {
  daily: { points: Array<{ label: string; value: number }> };
  weekly: { points: Array<{ label: string; value: number }> };
  monthly: { points: Array<{ label: string; value: number }> };
};
```

## Frontend'in Bu Contract'tan Beklediği Bölümler

### 1. Şirket Tabları
Frontend `availableCompanies` listesini doğrudan tab bar için kullanır.

Beklenenler:
- `availableCompanies` sadece `all` dışındaki şirketleri içermelidir.
- `byCompany["all"]` her zaman mevcut olmalıdır.
- `availableCompanies` içindeki her label için `byCompany[label]` bulunmalıdır.
- Label'lar UI'da gösterilecek nihai haliyle gelmelidir.

Örnek:
- `BANYO`
- `ESAN`
- `KARO`
- `SAĞLIK`
- `TOPLULUK`
- `TÜKETİM ÜRÜNLERİ`

### 2. KPI Kartları
Dashboard'ın üstündeki dört KPI kartı şu alanlara bağlıdır:

- `kpis.totalSignals`
- `kpis.uniqueParticipants`
- `kpis.uniqueSenders`
- `kpis.uniqueReceivers`

Tanımlar:
- `totalSignals`: toplam feedback adedi
- `uniqueParticipants`: sender + receiver union benzersiz kişi sayısı
- `uniqueSenders`: benzersiz sinyal veren kişi sayısı
- `uniqueReceivers`: benzersiz sinyal alan kişi sayısı

Bu alanlar türetilebilir kabul edilmemelidir; backend tarafından explicit dönmelidir.

### 3. Genel Trend Grafiği
Dashboard ana trend grafiği `overallTrend.granularities` alanını kullanır.

Beklenenler:
- `daily`, `weekly`, `monthly` her zaman bulunmalıdır.
- Veri yoksa key silinmemeli, boş `points: []` dönmelidir.
- `points` sıralı dönmelidir.
- `label` alanı frontend tarafından yeniden parse edilmeyecek kadar stabil olmalıdır.

### 4. Davranış Başına Toplam Sinyal
Sağ taraftaki özet section için `behaviorTotals` kullanılır.

Beklenenler:
- Her item için `behaviorId`, `label`, `totalSignals`, `colorToken` zorunlu olmalıdır.
- `colorToken` frontend'in kabul ettiği palette içinde olmalıdır.
- Veri yoksa alan omitted değil, boş array dönmelidir.

### 5. En Çok Sinyal Verenler
People section için `topSenders` kullanılır.

Beklenenler:
- `topSenders` her company slice içinde bulunmalıdır.
- Liste veri yoksa boş array dönmelidir.
- `rank` backend tarafından belirlenmelidir.
- `initials` backend tarafından hazır verilmelidir; frontend isimden türetmek zorunda kalmamalıdır.
- `dominantColorToken` backend tarafından dönmelidir.

### 6. Davranış Trendleri
Alt bölümdeki behavior card chart'ları `behaviorTrends` ile beslenir.

Beklenenler:
- Her behavior için ayrı item bulunmalıdır.
- `granularities.daily`, `weekly`, `monthly` zorunlu olmalıdır.
- Veri yoksa ilgili behavior item'ı yine dönülebilir; yalnızca `points: []` kullanılmalıdır.
- `label` ve `behaviorId` `behaviorTotals` ile tutarlı olmalıdır.

### 7. Şirket Karşılaştırması
Şirket karşılaştırma section'ı için top-level `companyComparison` kullanılır.

Beklenenler:
- Bu liste company filter seçilse bile tüm şirketleri kapsamalıdır.
- `companyId` kalıcı ve URL-safe olmalıdır.
- `label`, tab bar'da kullanılan şirket adıyla tutarlı olmalıdır.
- `totalSignals` ile ilgili `byCompany[label].kpis.totalSignals` arasında tutarlılık olmalıdır.

## Zorunlu Contract Garantileri

### 1. Alanlar Omit Edilmemeli
Section render kontrolü için frontend `undefined` ile boş listeyi farklı yorumlamak zorunda kalmamalı.

Bu yüzden:
- liste alanları boşsa `[]`
- object alanları boşsa shape korunarak dönmeli
- required field'lar omitted olmamalı

### 2. Saat Alanı İçin Tek Zaman Standardı
`hourlyRatings[].hour` alanı ve trend noktalarının zaman üretim mantığı açık tanımlanmalıdır.

Backend ekibinden net karar istenir:
- ya tüm saatler UTC ISO formatında ve timezone suffix ile dönsün
- ya da açıkça local timezone standardı dokümante edilsin

Tercih edilen format:
```txt
2026-04-21T06:00:00Z
```

Sebep:
- frontend lokal saate doğru çeviri yapabilsin
- browser parsing sapmaları olmasın
- bazı ortamlarda `2026-04-21T06:00` string'i local, bazılarında belirsiz yorumlanmasın

### 3. Company Key / Label Tutarlılığı
`availableCompanies`, `companyComparison[].label` ve `byCompany` key'leri birbiriyle tam uyumlu olmalıdır.

Örnek garanti:
- `availableCompanies` içinde `SAĞLIK` varsa `byCompany["SAĞLIK"]` mutlaka vardır.
- `companyComparison` item'ında label `SAĞLIK` ise ilgili slice `byCompany["SAĞLIK"]` olarak erişilebilir.

### 4. All Slice Zorunluluğu
`byCompany["all"]` her response'ta zorunlu olmalıdır.

Bu slice:
- default selected state
- "Tüm Şirketler" tabı
- aggregate dashboard görünümü
için gereklidir.

## Error Contract
Backend hata response'u da tutarlı olmalıdır.

Beklenen minimum shape:
```ts
{
  errorCode: string;
  errorMessage: string;
}
```

Örnek durumlar:
- eksik `competencyId`
- invalid UUID
- competency bulunamadı
- authorization failure
- upstream/internal failure

## Frontend Açısından Kritik Riskler

### Risk 1. Alanların Bazı Ortamlarda Dönüp Bazılarında Dönmemesi
Bir ortamda `topSenders` varken başka bir ortamda alanın tamamen kaybolması section'ların sessizce boş görünmesine neden olur.

### Risk 2. Saat Formatının Belirsizliği
Timezone suffix olmayan tarih string'leri grafikte saat kayması yaratır.

### Risk 3. Company Label Standardizasyonu
`SAGLIK`, `SAĞLIK`, `Saglik` gibi varyasyonlar company tab ile `byCompany` lookup'unu kırabilir.

### Risk 4. Partial Slice Response
`byCompany["all"]` dolu iken seçili şirket slice'ında `topSenders` veya `behaviorTrends` eksik dönerse UI section bazlı eksik görünür.

## Backend İçin Net Aksiyonlar

### Zorunlu
- `AnalyticsSummaryResponse` contract'ını resmi olarak publish edin.
- `companyComparison` alanını zorunlu hale getirin.
- her `byCompany` slice içinde `kpis`, `overallTrend`, `behaviorTotals`, `topSenders`, `behaviorTrends` alanlarını zorunlu hale getirin.
- tüm liste alanlarında omitted yerine boş array dönün.
- `hour` alanını timezone suffix içeren tek bir ISO standardına sabitleyin.
- `availableCompanies`, `companyComparison.label` ve `byCompany` key'leri için tek naming standardı belirleyin.

### Güçlü Tavsiye
- response örneğini Swagger/OpenAPI veya eşdeğer contract dokümantasyonuna ekleyin
- test fixture olarak en az:
  - dolu response
  - boş şirket response
  - tek şirket response
  - bazı section'larda boş array bulunan response
  yayınlayın

## Kabul Kriterleri
- `/analytics?competencyId=<uuid>` ekranında şirket tabları görünür ve tıklanabilir olmalı
- KPI kartları gerçek backend verisi ile dolmalı
- `En Çok Sinyal Verenler` section'ı backend `topSenders` verisi ile dolmalı
- `Davranış Trendleri` section'ı backend `behaviorTrends` verisi ile render olmalı
- `Tüm Şirketler` ve tekil şirketler arasında geçişte aynı contract çalışmalı
- hiçbir section veri yok diye kaybolmamalı; verisiz section en fazla boş-state/boş liste ile deterministik görünmeli
