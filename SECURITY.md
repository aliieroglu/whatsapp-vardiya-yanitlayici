# Güvenlik notları (28 Ekim 2026)

Bu proje resmî WhatsApp API'si değildir. Hesap kısıtlama/yasak, platform değişikliği ve teslim edilmeyen mesaj riski vardır. QR kodu, `.env`, `.local-state/` ve grup günlükleri gizlidir; public repoya veya issue'ya konmamalıdır. Otomatik mod ancak güvenilir grup/gönderici ve gerçek ilan örnekleri test edildikten sonra açılmalıdır.

`whatsapp-web.js@1.34.7` normalde `puppeteer@24.38.0` sabitliyor; bu ağacın ilk `npm audit --omit=dev` sonucu **11 high / 0 critical** idi. `package.json` içindeki açık `overrides` ayarı Puppeteer'ı **25.16.0** sürümüne yükseltiyor; güncellenmiş kilit dosyasında aynı denetim **0 bulgu** döndü. Sistem Chrome'u başlatma testi ve oturum bağlamadan WhatsApp QR olayı görüldü. **Majör Puppeteer sürümü üst kütüphanenin test ettiği sürüm değildir:** kimlik doğrulama sonrası gerçek grup dinleme/gönderme henüz kullanıcı hesabıyla doğrulanmadı. Bağımlılıkları değiştirirken denetimi, Chrome açılışını ve canlı `dry-run` denemesini tekrarla. Denetim sonucu gelecekteki yeni açıklar için garanti vermez.

Durum dosyası yanıt çağrısından önce atomik rename ile kaydedilir; ancak dosya/dizin `fsync` yapılmadığından **ani elektrik kesintisinde** en son kayıt kaybolabilir. Gönderim hatası belirsizse otomatik retry yapılmaz; 60 saniyelik eski mesaj filtresi ve tek süreç kilidi tekrar riskini azaltır, sıfırlamaz.

Bir güvenlik açığı bulursan gerçek oturum verisi veya örnek grup mesajını public issue'ya yapıştırma; GitHub'ın özel güvenlik bildirimi yolunu kullan.
