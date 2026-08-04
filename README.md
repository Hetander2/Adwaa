# Adwaa Travel — Yönetim Paneli (Demo)

Adwaa Travel (Konaklar Mah., Ortahisar/Trabzon) için hazırlanmış, araç kiralama ve
tur rezervasyonlarını tek yerden takip etmeye yarayan, sadece yöneticilere yönelik
bir iç panel demosu.

## İçindekiler
- `index.html` — Giriş ekranı
- `panel.html` — Ana panel (Özet, Araç Kiralamaları, Tur Rezervasyonları)
- `style.css` — Tüm tasarım
- `auth.js` — Giriş mantığı
- `app.js` — Liste/filtre/sıralama/CRUD mantığı
- `robots.txt` — Arama motorlarının paneli indekslememesi için

## Özellikler
- **Araç Kiralamaları:** plaka, marka, model (yılıyla), fiyat, kiralama tarih
  aralığı, müşteri ad-soyad ve TC kimlik no.
- **Tur Rezervasyonları:** güzergah, araç, şoför, fiyat, tarih aralığı.
- Her iki listede de: metin arama, duruma göre filtre, tarih aralığına göre
  filtre, sütun başlığına tıklayarak sıralama, ve tek tıkla "tamamlandı" işaretleme.
- Özet ekranında devam eden kiralama/tur sayısı ve toplam kayıtlı ciro.
- TC kimlik no, resmî algoritmayla doğrulanır ve tablo görünümünde yalnızca ilk/son
  iki hane gösterilecek şekilde maskelenir (tam numara yalnızca düzenleme
  formunda görünür).

## Yerelde çalıştırma
Ekstra kuruluma gerek yok. Klasörü bir yerel sunucudan açmanız yeterli
(doğrudan dosya olarak `file://` ile açarsanız bazı tarayıcılarda güvenlik
politikaları nedeniyle sorun çıkabilir):

```bash
cd adwaa-panel
python3 -m http.server 8080
# sonra tarayıcıda: http://localhost:8080
```

## GitHub'a yükleme ve GitHub Pages ile demo
```bash
git init
git add .
git commit -m "Adwaa Travel panel demo"
git branch -M main
git remote add origin <repo-url>
git push -u origin main
```
Ardından GitHub'da **Settings → Pages** bölümünden `main` dalını seçip
yayınlayın. Adresiniz `https://<kullanici-adi>.github.io/<repo-adi>/` olacaktır.

## Demo giriş bilgileri
`auth.js` içinde tanımlıdır:
- Kullanıcı adı: `adwaayonetici`
- Şifre: `Trabzon61!Adwaa`

Bunları yayınlamadan önce mutlaka değiştirin (`auth.js` dosyasının en üstündeki
iki değişken).

---

## ÖNEMLİ — Lütfen canlıya almadan önce okuyun

Talebinizde "her türlü siber saldırıya karşı dayanıklı, hiçbir güvenlik açığı
olmayan" bir sistem istediniz. Bunu dürüstçe söylemem gerekiyor: **bu tür bir
garanti hiçbir yazılım için verilemez**, ve bu proje özelinde de önemli bir
sınırlama var — bu bir **statik HTML/JS sitesi** (VS Code'a yapıştırıp GitHub'a
yüklediğiniz, sunucu tarafı kodu olmayan bir yapı). Bu mimaride:

1. **Giriş ekranı gerçek bir erişim kontrolü değildir.** Kullanıcı adı/şifre
   kontrolü tarayıcıda çalışan JavaScript ile yapılır. Sitenin adresini bilen
   biri "Görüntüle → Sayfa Kaynağı" ile `auth.js` dosyasını açıp şifreyi
   doğrudan okuyabilir, ya da `panel.html`'e giriş ekranını hiç görmeden
   doğrudan gidebilir. Bu, panel bağlantısının rastgele biri tarafından
   kazara açılmasını engeller; **kararlı bir saldırıya karşı koruma sağlamaz.**
2. **Veriler tarayıcıda (localStorage) düz metin olarak durur.** Şifrelenmez.
   Panele erişebilen herkes (veya o cihaza/tarayıcıya erişebilen herkes)
   tüm müşteri adlarını ve **TC kimlik numaralarını** görebilir.
3. **GitHub Pages herkese açık bir barındırma servisidir.** Depo (repository)
   "public" ise, adresi bilen/bulan herkes siteye erişebilir — "sadece
   yöneticiler görsün" isteğiniz bu ortamda teknik olarak sağlanamaz. Depoyu
   "private" yapmak GitHub Pages'te ek koşullar/ücretli plan gerektirebilir;
   yine de gerçek bir kimlik doğrulama yerine geçmez.
4. Statik barındırmada özel HTTP güvenlik başlıkları
   (Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy vb.)
   ayarlanamaz; bunlar ancak Netlify/Vercel/Cloudflare gibi bir sunucu
   katmanında eklenebilir.

**TC kimlik numarası, Türkiye'de KVKK kapsamında korunan bir kişisel veridir.**
Gerçek müşteri verisiyle bu paneli olduğu gibi canlıya almanızı **önermiyorum.**

### Gerçek/canlı kullanım için ne gerekir?
- Bir **sunucu taraflı** kimlik doğrulama (ör. e-posta/şifre + oturum çerezi,
  şifreler hash'lenmiş — bcrypt/argon2 — olarak saklanmalı).
- Verilerin tarayıcı yerine bir **veritabanında** (ör. Postgres/MySQL) ve
  yalnızca kimliği doğrulanmış isteklerle erişilebilir bir **API** arkasında
  tutulması.
- HTTPS zorunlu, oturum süresi kısıtlı, başarısız girişlerde sunucu taraflı
  kilitleme (bu demodaki kilitleme yalnızca tarayıcıda ve kolayca aşılabilir).
- TC kimlik no gibi alanlar için erişim günlüğü (kim, ne zaman görüntüledi) ve
  KVKK'ya uygun aydınlatma metni / açık rıza süreci.
- Düzenli yedekleme ve yetki seviyeleri (ör. sahip / operasyon çalışanı).

Bu adımlar için Node.js/Express + PostgreSQL, veya Supabase/Firebase gibi
"backend-as-a-service" çözümleri (ikisi de gerçek kullanıcı doğrulaması ve
erişim kuralları sunar) makul başlangıç noktalarıdır. İsterseniz bu panelin
arayüzünü koruyup arka ucunu böyle bir yapıya bağlamanıza da yardımcı
olabilirim.

### Bu demoda yine de uygulanan iyi pratikler
- Tüm kullanıcı girdisi ekrana yazılırken HTML olarak kaçışlanır (XSS'e karşı).
- Sıkı bir İçerik Güvenliği Politikası (CSP) tanımlıdır; satır içi (`inline`)
  script çalıştırılmaz.
- TC kimlik no, resmî checksum algoritmasıyla doğrulanır ve listede maskelenir.
- Sayfalar arama motorlarınca indekslenmesin diye `noindex` ve `robots.txt`
  ile işaretlenmiştir.
- Art arda 5 başarısız girişten sonra geçici (tarayıcı içi) kilitleme uygulanır.

Bunlar faydalı alışkanlıklardır ama yukarıdaki mimari sınırlamayı ortadan
kaldırmaz.
