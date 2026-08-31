# [Backend] Ardışık Duygu Serileri İçin Eşit Dönem Karşılaştırma Desteği

## Amaç

İş Yatırım leadership dashboard'unda kullanıcıların seçtiği tarih aralığındaki ardışık `Kötü` ve `Harika` seri sayılarını, otomatik hesaplanan bir önceki eşit uzunluktaki dönemle karşılaştıracağız.

Frontend, URL'de `isMoodStreakComparison=true` olduğunda aynı mevcut endpoint'i iki kez çağıracaktır. Flag yoksa veya `false` ise mevcut tek dönem grafiği korunur. Yeni backend endpoint'i, query parametresi veya response alanı istenmiyor.

## Mevcut Endpoint Kullanımı

```text
GET /analytics/dashboard
  ?client=is-yatirim
  &competencyId=9bb629ad-afd3-4cae-9744-a3faf5729174
  &segment=<segmentId>
  &[unvan=<unvanId>]
  &dateMode=range
  &startDate=<YYYY-MM-DD>
  &endDate=<YYYY-MM-DD>
  &[token=<token>]
```

Örnek karşılaştırma:

| Dönem             | `startDate` | `endDate`  |
| ----------------- | ----------- | ---------- |
| Seçili 7 gün      | 2026-08-22  | 2026-08-28 |
| Önceki eşit 7 gün | 2026-08-15  | 2026-08-21 |

Frontend iki istekte de aynı `segment`, varsa aynı `unvan` ve aynı `token` değerini gönderir.

## Backend Beklentisi

Her iki tarih aralığı isteğinde de aşağıdaki alanların mevcut hesaplama semantiğiyle dönmesi gerekir:

```json
{
  "selectedSegment": {
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
  },
  "selectedUnvan": {
    "consecutiveMoodStreaks": {
      "bad": {
        "exactly3Days": 0,
        "exactly4Days": 0,
        "atLeast5Days": 0
      },
      "great": {
        "exactly3Days": 0,
        "exactly4Days": 0,
        "atLeast5Days": 0
      }
    }
  }
}
```

- `selectedSegment.consecutiveMoodStreaks` zorunludur.
- `unvan` ile sorgulanan response'ta `selectedUnvan.consecutiveMoodStreaks` zorunludur.
- Altı kovanın tamamı, `0` dahil non-negative integer olmalıdır.
- Hesaplama yalnız request'teki dahil `startDate`–`endDate` penceresini kullanmalıdır; pencere dışındaki komşu günler seri hesaplamasına dahil edilmemelidir.
- Aynı kullanıcı ve aynı gün için en son yanıt kullanılmalıdır.
- Mevcut `segment` ve `unvan` kapsam semantiği iki dönem isteğinde de tutarlı olmalıdır.
- Seçilen aralığın önceki eşit dönemi mevcut veri başlangıcından önceye düşerse frontend karşılaştırma isteği yapmayacaktır.

## Kabul Kriterleri

- Son 7, 14, 30 gün ve özel çok günlük aralıklar için endpoint iki ardışık, eşit uzunluktaki istekte doğru ve bağımsız streak sayıları döndürür.
- `all`, GMY ve `unvan` sorgularında altı kovanın tamamı eksiksiz döner.
- Tek gün veya üç günden kısa serilerde altı kova `0` döner; alanlar atlanmaz.
- Eksik gün, `eh_iste`, `iyi` veya kategori değişimi seriyi keser.
- Her kullanıcının en uzun `Kötü` veya `Harika` serisi yalnız bir kovaya yazılır; eşitlikte en yeni biten seri tercih edilir.
- Ham kullanıcı kimliği, günlük yanıt veya kişi listesi response'a eklenmez.

## Kapsam Dışı

- Yeni endpoint, yeni query parametresi veya response alanı eklenmesi.
- Backend'in iki dönemi tek response içinde karşılaştırması.
- Yüzde/fark hesaplaması; bu hesaplama frontend'de yapılır.
