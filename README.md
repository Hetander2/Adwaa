# Adwaa Travel — Yönetim Paneli (Yerel Ağ Sürümü)

Adwaa Travel (Konaklar Mah., Ortahisar/Trabzon) için araç kiralama ve tur
rezervasyonlarını tek yerden takip etmeye yarayan, **yerel ağdaki 2-3
bilgisayardan ortak veriyle** kullanılabilen bir yönetim paneli.

Önceki statik (GitHub Pages) demonun aksine bu sürümün **gerçek bir sunucusu**
vardır: giriş kontrolü sunucuda yapılır, şifreler hash'lenmiş olarak saklanır,
ve tüm bilgisayarlar aynı veriyi görür.

## İçindekiler

```
adwaa-yerel/
  server.js              → Sunucu (Node.js, ek paket gerektirmez)
  sifre-degistir.js       → Şifre / kullanıcı değiştirme aracı
  package.json
  baslat-windows.bat       → Windows'ta çift tıkla başlat
  baslat-mac-linux.sh       → macOS/Linux'ta başlat
  data/db.json             → Veriler burada tutulur (ilk çalıştırmada oluşur)
  public/
    index.html              → Giriş ekranı
    panel.html               → Ana panel
    style.css
    giris.js                 → Giriş ekranı mantığı
    app.js                    → Panel mantığı (liste/filtre/takvim/CRUD)
    img/adwaa-logo.png         → Logonuz (gönderdiğiniz görselden işlendi)
    img/favicon.png             → Sekme simgesi
```

## Kurulum ve çalıştırma

1. [nodejs.org](https://nodejs.org) adresinden Node.js'i indirip kurun (LTS
   sürüm yeterli). Kurulum sırasında ekstra bir seçim yapmanıza gerek yok.
2. Bu klasörü panelin sürekli açık kalacağı ofis bilgisayarına kopyalayın.
3. **Windows:** `baslat-windows.bat` dosyasına çift tıklayın.
   **macOS/Linux:** Terminalde bu klasöre gidip `./baslat-mac-linux.sh` yazın
   (veya `node server.js`).
4. Açılan pencerede şuna benzer bir çıktı görürsünüz:
   ```
   Bu bilgisayardan : http://localhost:3000
   Ağdaki diğer bilgisayarlardan : http://192.168.1.50:3000
   ```
5. **O bilgisayarda** tarayıcıdan `http://localhost:3000` açın.
   **Ofisteki diğer bilgisayarlardan** ikinci satırdaki adresi (kendi IP'niz
   farklı olacaktır) tarayıcıya yazın — hepsi aynı panele, aynı veriye bağlanır.
6. Bu pencere kapatılırsa panel durur; sürekli açık kalması gereken bir
   bilgisayarda (örn. resepsiyon/ofis masaüstü) çalıştırın ve o bilgisayarın
   uyku moduna geçmemesini sağlayın.

## Demo giriş bilgileri

- Kullanıcı adı: `adwaayonetici`
- Şifre: `Trabzon61!Adwaa`

**İlk fırsatta değiştirin:**
```
node sifre-degistir.js
```
Bu komut size kullanıcı adı ve yeni şifre sorar; şifre hash'lenerek
`data/db.json` içine kaydedilir (düz metin olarak hiçbir yerde tutulmaz).
Aynı komutla ek yönetici hesapları da oluşturabilirsiniz.

## Bu sürümde neler değişti / eklendi

- **Logo:** Gönderdiğiniz görsel işlenip (arka planı şeffaflaştırılıp)
  giriş ekranı ve panel kenar çubuğuna eklendi.
- **Para birimi:** Kiralama ve tur fiyatları artık ₺ (TL) veya $ (USD) olarak
  girilebiliyor; listelerde ve Özet ekranındaki toplam ciroda buna göre
  gösteriliyor. **Not:** TL ve USD tutarları birbirine karıştırılıp tek bir
  toplam olarak toplanmaz (yanlış bir toplam vermemek için) — Özet ekranında
  iki tutar ayrı ayrı gösterilir.
- **Takvim:** "Takvim" sekmesinde aylık görünümde hangi gün araç çıkışı,
  araç dönüşü, tur gidişi ve tur dönüşü olduğunu renkli etiketlerle görebilir,
  bir güne tıklayarak o günün tüm işlemlerinin detayını alttaki panelde
  görebilirsiniz.

## Güvenlik — gerçekte ne değişti, ne değişmedi

Önceki statik sürümden farklı olarak:
- Giriş kontrolü artık **sunucuda** yapılıyor; şifre tarayıcıya hiç
  gönderilmiyor, hash'i bile istemciye sızmıyor.
- Şifreler `crypto.scrypt` ile tuzlanıp hash'lenerek saklanıyor (düz metin
  değil).
- Art arda 5 başarısız girişten sonra o IP adresi 30 saniye kilitleniyor —
  bu kez gerçekten sunucu tarafında, atlatılması client-side'daki gibi kolay
  değil.
- Oturumlar HttpOnly + SameSite=Strict çerezle yönetiliyor (JavaScript ile
  çerez okunamaz, farklı bir siteden tetiklenen isteklerde çerez gönderilmez).
- Tüm kullanıcı girdisi ekrana yazılırken kaçışlanıyor (XSS'e karşı), TC
  kimlik no hem istemcide hem **sunucuda** resmî algoritmayla doğrulanıyor,
  listede maskeleniyor.

Yine de bilmeniz gereken sınırlar:
- Bu sunucu **düz HTTP** üzerinden çalışır (HTTPS yok). Güvendiğiniz bir ofis
  ağında bu makul bir risktir, ama **bu paneli asla doğrudan internete
  açmayın / router'da port yönlendirmesi yapmayın.** İnternetten erişim
  gerekiyorsa (örn. şubeler arası), önce bir uzman ile HTTPS + VPN gibi bir
  katman kurulmalı.
- Veriler `data/db.json` dosyasında düz JSON olarak tutulur (şifre hariç,
  TC kimlik no dahil diğer alanlar şifrelenmez). Bu dosyaya erişebilen biri
  (o bilgisayara fiziksel/uzak erişimi olan biri) verileri okuyabilir. Bu
  bilgisayarın kendi kullanıcı hesabı şifreli ve fiziksel olarak güvenli
  olmalı.
- Oturumlar bellekte tutulur; sunucu yeniden başlarsa herkes tekrar giriş
  yapar (veri kaybolmaz, sadece oturumlar sıfırlanır).

**TC kimlik numarası KVKK kapsamında korunan bir kişisel veridir.** Düzenli
yedek alın (`data/db.json` dosyasını periyodik olarak güvenli bir yere
kopyalamanız yeterlidir) ve bu bilgisayara kimlerin erişebildiğini kontrol
altında tutun.

## Sorun giderme

- **"Node.js bulunamadı" hatası:** [nodejs.org](https://nodejs.org)'dan kurun.
- **Diğer bilgisayarlar bağlanamıyor:** Sunucu bilgisayarının güvenlik
  duvarı (Windows Defender Firewall vb.) 3000 portunu engelliyor olabilir;
  ilk bağlantıda "izin ver" penceresi çıkarsa onaylayın. Ayrıca tüm
  bilgisayarların **aynı Wi-Fi/ağda** olduğundan emin olun.
- **Şifremi unuttum:** `node sifre-degistir.js` çalıştırıp aynı kullanıcı
  adıyla yeni bir şifre belirleyin.
- **Port 3000 kullanımda hatası:** Pansüden önce `set PORT=3001` (Windows)
  veya `PORT=3001 node server.js` (Mac/Linux) ile farklı bir port
  belirtebilirsiniz.
