# PDR ÖABT Soru Arşivi

Statik HTML, CSS ve JavaScript ile hazırlanmış 2014-2026 PDR ÖABT sınav uygulaması. Açılış ekranı, yıl seçimi, süreli sınav modu, her yıl için ayrı yerel ilerleme kaydı ve sınav sonu renkli optik değerlendirme içerir.

## Dosyalar

- `index.html`: Uygulama arayüzü
- `styles.css`: Responsive tasarım
- `app.js`: Soru çözme, kontrol, ilerleme ve yerel kayıt işlevleri
- `data/2014.json`: 2014 yılına ait 50 soru ve çözümleri
- `data/2015.json`: 2015 yılına ait 48 değerlendirilen soru ve çözümleri (21 ve 29 iptal)
- `data/2016.json`: 2016 yılına ait 50 soru ve çözümleri
- `data/2017.json`: 2017 yılına ait 50 soru ve çözümleri
- `data/2018.json`: 2018 yılına ait 50 soru ve çözümleri
- `data/2019.json`: 2019 yılına ait 75 soru ve çözümleri
- `data/2020.json`: 2020 yılına ait 75 soru ve çözümleri
- `data/2021.json`: 2021 yılına ait 75 soru ve çözümleri
- `data/2022.json`: 2022 yılına ait 75 soru ve çözümleri
- `data/2023.json`: 2023 yılına ait 75 soru ve çözümleri
- `data/2024.json`: 2024 yılına ait 75 soru ve çözümleri
- `data/2025.json`: 2025 yılına ait 50 soru ve çözümleri
- `data/2026.json`: 2026 yılına ait 50 özgün soru görseli ve PDR Kampüs çözümleri
- `assets/2014-soru-49.png`: 49. sorunun özgün tablo görseli

## Yerelde çalıştırma

Tarayıcıların yerel JSON erişim kısıtlaması nedeniyle klasörü küçük bir HTTP sunucusuyla açın:

```bash
python -m http.server 8000
```

Ardından `http://localhost:8000` adresini ziyaret edin.

## GitHub Pages ile yayınlama

1. Bu paketin içindekileri GitHub deponuzun kök dizinine yükleyin.
2. GitHub deposunda **Settings > Pages** bölümünü açın.
3. **Deploy from a branch** seçeneğini seçin.
4. `main` dalını ve `/ (root)` klasörünü belirleyip kaydedin.

Derleme veya sunucu tarafı kod gerekmez.

## Not

2014 yılı 49. sorunun cevabı, resmi ÖSYM cevap anahtarına göre `D` olarak kullanılmıştır.
