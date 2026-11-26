# FLEX RUSH — Kinetic Studio

Kas yaparak koşan 3D kapı-koşusu oyunu. Deniz manzaralı, kaslanan karakter, para, şapka/beden dolabı, mağaza, günlük hediye, final "yüksek vurucu".

- Motor: HTML5 + özel WebGL motoru (`app/src/main/assets/www`), Android'de WebView içinde çalışır.
- Derleme: GitHub Actions (`.github/workflows/build.yml`) → Actions sekmesinden `GateRush-debug-apk` indir.
- Oyun adı `js/data.js` içindeki `GAME_NAME` ve `AndroidManifest.xml` label alanından değişir.
- Satın alma butonları şimdilik arayüzdür (ödeme yok); reklamlar demo.
- Ayarlar > sürüm yazısına 7 kez dokun = geliştirici hilesi (+100000 para).
