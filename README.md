# WhatsApp vardiya yanıtlayıcı (deneysel)

Belirlediğin **tek WhatsApp grubunda**, belirlediğin göndericinin saat içeren vardiya çağrısını görünce `ok` yanıtı gönderebilen Node.js aracı. Varsayılan `dry-run` modunda **hiç mesaj göndermez**. Resmî WhatsApp ürünü değildir; `whatsapp-web.js` WhatsApp Web'i otomatikleştirir. Hesap kısıtlanabilir; vardiyada ilk beşe girme veya mesajın teslim edilmesi garanti değildir.

## Kurulum

Node.js **22.12+** ve npm gerekir. Linux'ta kurulu Google Chrome'u kullanıyorsan (bu makinede `/usr/bin/google-chrome`):

```sh
PUPPETEER_SKIP_DOWNLOAD=1 npm ci
cp .env.example .env
npm test
npm run check -- "Yarın 18:00 için kimler gelebilir?"
```

Sistem Chrome'u yoksa `npm ci` ile Puppeteer'ın kendi tarayıcısını yükle ve `.env` içindeki `CHROME_PATH` satırını kaldır. `.env` dosyasını yalnız kendi cihazında düzenle; gerçek grup/gönderen kimliklerini veya QR oturumunu GitHub'a yükleme.

1. Kendi terminalinde `npm run groups` çalıştır. **Telefonundaki WhatsApp > Bağlı cihazlar** üzerinden terminalde beliren QR kodunu **kendin** tara. Bu kodu başkalarına gönderme. Komut grup adlarını ve kimliklerini yalnız yerel terminale yazar, sonra kapanır.
2. `.env` içindeki `SHIFT_GROUP_ID` değerini doğru grubun `...@g.us` kimliğiyle değiştir. `MODE=dry-run` bırakarak `npm start` çalıştır. Eşleşen yeni mesajlarda `dry-run sender=...` satırı görünür; mesajın metni kaydedilmez ve yanıt gönderilmez. Gerçek ilan örnekleriyle yanlış eşleşmeleri kontrol et.
3. Hazır olduğunda yalnız bu grupta ilan açan kişilerin `...@c.us` veya `...@lid` kimliklerini `ALLOWED_SENDERS` alanına virgülle yaz. **Gerçek gönderim için** `.env` içindeki `MODE=auto` değerini açıkça ayarla ve `npm start` çalıştır. Bu modda uygun bir yeni mesaj gelirse `REPLY_TEXT=ok` grup sohbetine gönderilir. Önce müsait olduğundan emin ol; program bunu senin yerine bilemez.

`npm run check -- "örnek mesaj"` yalnız metin eşleştirmeyi çevrimdışı sınar; WhatsApp'a bağlanmaz. Varsayılan çağrı ifadeleri `src/matcher.js` içindedir; kendi ilan dilin farklıysa `.env` içinde `CALL_PHRASES=kimler gelebilir|gelebilecek|personel lazım` biçiminde değiştirebilirsin. İfadeler **ve** `HH:MM`/`HH.MM` saat biçimi birlikte aranır; bu kural hatalı pozitif/negatif verebilir.

## Güvenlik ve davranış

- Sadece **tam grup kimliği** kabul edilir. `auto` modunda **gönderici izin listesi zorunludur**; kendi mesajları, medya, eski ve program hazır olmadan önce gelmiş mesajlar yok sayılır. Mesaj zaman damgası saniye hassasiyetinde olduğu için, yanlışlıkla eski bir ilana yazmamak adına **hazır olduktan sonraki ilk saniyedeki** bazı gerçek mesajlar da yok sayılabilir.
- Varsayılan: en fazla **60 saniyelik** çağrı; iki yanıt arasında **180 saniye** bekleme. `MAX_AGE_SECONDS` ve `COOLDOWN_SECONDS` ile ayarlanır. İlan başına en fazla bir yanıt için kimlik dosyası yanıt *denenmeden önce* diske yazılır; bağlantı/send hatası belirsizse otomatik tekrar yapılmaz. `sent` günlüğü yalnız kütüphanenin gönderim çağrısının tamamlandığını söyler, teslim garantisi değildir.
- `.local-state/` içinde oturum, tarayıcı profili ve tekrarı önleyen özel durum tutulur. Dizin kullanıcıya özeldir; `.env`, `.local-state/`, `node_modules/` ve `.agent-work/` Git dışında kalır. Bunları, terminal QR çıktısını, grup/gönderici kimliklerini veya günlükleri **public issue/repo'ya koyma**.
- Aynı profille iki kopya eşzamanlı çalışmaz. Ani çökmeden sonra kilit kalırsa önce çalışan başka örnek olmadığını doğrula, ardından yalnız `.local-state/instance.lock` dosyasını kaldır.
- Tarayıcı **ayrı bir profil** kullanır; mevcut kişisel Chrome/Colab profilini devralmaz. Chrome sandbox'ını kapatmaz ve dışarı açılan bir port sunmaz.
- `whatsapp-web.js` ve Puppeteer Web sürüm değişiklikleriyle bozulabilir. Bağımlılıkların güvenlik durumunu `npm audit --omit=dev` ile düzenli kontrol et; mevcut geçişli bağımlılık uyarılarının değerlendirmesi `SECURITY.md` içindedir. Bu araç hesap yasağı veya platform uyumluluğu konusunda güvence vermez.

Gerçek WhatsApp hesabı/grubuyla uçtan uca gönderim, kullanıcı tarafından QR eşleştirme ve grup seçimi yapılmadan doğrulanamaz. Önce `dry-run` ile gözlemle; yanıtları otomatik açmak ayrı bir karardır.
