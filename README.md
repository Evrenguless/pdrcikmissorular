# PDR ÖABT Soru Arşivi

Statik HTML, CSS ve JavaScript ile hazırlanmış 2014-2017 PDR ÖABT sınav uygulaması. Açılış ekranı, yıl seçimi, süreli sınav modu, her yıl için ayrı yerel ilerleme kaydı ve sınav sonu renkli optik değerlendirme içerir.

## Dosyalar

- `index.html`: Uygulama arayüzü
- `styles.css`: Responsive tasarım
- `app.js`: Soru çözme, kontrol, ilerleme ve yerel kayıt işlevleri
- `data/2014.json`: 2014 yılına ait 50 soru ve çözümleri
- `data/2015.json`: 2015 yılına ait 48 değerlendirilen soru ve çözümleri (21 ve 29 iptal)
- `data/2016.json`: 2016 yılına ait 50 soru ve çözümleri
- `data/2017.json`: 2017 yılına ait 50 soru ve çözümleri
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
