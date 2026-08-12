/* =========================================================
   ADWAA TRAVEL — Yerel Ağ Sunucusu
   ---------------------------------------------------------
   Yalnızca Node.js'in kendi modülleriyle yazılmıştır (npm
   install gerekmez). Ofisteki bir bilgisayarda çalıştırın,
   aynı ağdaki diğer bilgisayarlar tarayıcıdan bu bilgisayarın
   IP adresine bağlanır. Veriler data/db.json dosyasında,
   şifreler ise düz metin değil hash'lenmiş olarak tutulur.

   Çalıştırmak için:  node server.js
   ========================================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");

const PORT = process.env.PORT || 3000;
const KOK_DIZIN = __dirname;
const PUBLIC_DIZIN = path.join(KOK_DIZIN, "public");
const DB_YOLU = path.join(KOK_DIZIN, "data", "db.json");

const VARSAYILAN_KULLANICI = "adwaayonetici";
const VARSAYILAN_SIFRE = "Trabzon61!Adwaa";

const OTURUM_SURESI_MS = 8 * 60 * 60 * 1000; // 8 saat (hareketle yenilenir)
const MAKS_GIRIS_DENEME = 5;
const GIRIS_KILIT_SURESI_MS = 30 * 1000;

/* ------------------------------------------------------- *
 *  Şifre hashleme (crypto.scrypt — dışarıdan paket gerekmez)
 * ------------------------------------------------------- */

function sifreHashla(sifre) {
  const tuz = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(sifre, tuz, 64).toString("hex");
  return { tuz, hash };
}

function sifreDogrula(sifre, tuz, hash) {
  try {
    const denemeHash = crypto.scryptSync(sifre, tuz, 64);
    const gercekHash = Buffer.from(hash, "hex");
    if (denemeHash.length !== gercekHash.length) return false;
    return crypto.timingSafeEqual(denemeHash, gercekHash);
  } catch (e) {
    return false;
  }
}

/* ------------------------------------------------------- *
 *  Veritabanı (tek JSON dosyası, senkron oku/yaz)
 * ------------------------------------------------------- */

function tarihEkle(gun) {
  const d = new Date();
  d.setDate(d.getDate() + gun);
  return d.toISOString().slice(0, 10);
}
function bugunISO() { return new Date().toISOString().slice(0, 10); }

function dbIlkKurulum() {
  const dizin = path.dirname(DB_YOLU);
  if (!fs.existsSync(dizin)) fs.mkdirSync(dizin, { recursive: true });
  if (fs.existsSync(DB_YOLU)) return;

  const { tuz, hash } = sifreHashla(VARSAYILAN_SIFRE);

  const db = {
    kullanicilar: [{ kullaniciAdi: VARSAYILAN_KULLANICI, tuz, hash }],
    kiralamalar: [
      {
        id: "kir_seed_1", plaka: "61 AB 123", marka: "Renault", model: "Clio", yil: 2023,
        baslangic: bugunISO(), bitis: tarihEkle(3), fiyat: 3600, paraBirimi: "TRY",
        odemeTuru: "pesin", taksitSayisi: null,
        musteriAd: "Mehmet Yılmaz", musteriTC: "12345678950", telefon: "0555 111 22 33",
        not: "Havalimanından teslim.", kontratFotoOn: null, kontratFotoArka: null, uzatmalar: [],
        tamamlandi: false, olusturulma: Date.now()
      },
      {
        id: "kir_seed_2", plaka: "61 CD 456", marka: "Fiat", model: "Egea", yil: 2022,
        baslangic: tarihEkle(-5), bitis: tarihEkle(-1), fiyat: 2800, paraBirimi: "TRY",
        odemeTuru: "taksit", taksitSayisi: 2,
        musteriAd: "Ayşe Kaya", musteriTC: "98765432150", telefon: "0532 222 33 44",
        not: "", kontratFotoOn: null, kontratFotoArka: null, uzatmalar: [],
        tamamlandi: true, olusturulma: Date.now() - 1000
      },
      {
        id: "kir_seed_3", plaka: "61 EF 789", marka: "Dacia", model: "Duster", yil: 2024,
        baslangic: tarihEkle(2), bitis: tarihEkle(9), fiyat: 210, paraBirimi: "USD",
        odemeTuru: "pesin", taksitSayisi: null,
        musteriAd: "Ali Demir", musteriTC: "11223344550", telefon: "0544 333 44 55",
        not: "Uzungöl turu için kiralandı.", kontratFotoOn: null, kontratFotoArka: null, uzatmalar: [],
        tamamlandi: false, olusturulma: Date.now() - 2000
      }
    ],
    turlar: [
      {
        id: "tur_seed_1", guzergah: "Uzungöl", arac: "61 AB 123", sofor: "Hasan Öz",
        baslangic: tarihEkle(1), bitis: tarihEkle(1), fiyat: 2500, paraBirimi: "TRY",
        musteri: "Grup — Uzungöl Turu A", tamamlandi: false, olusturulma: Date.now()
      },
      {
        id: "tur_seed_2", guzergah: "Sümela Manastırı", arac: "61 EF 789", sofor: "Kemal Aydın",
        baslangic: tarihEkle(3), bitis: tarihEkle(3), fiyat: 60, paraBirimi: "USD",
        musteri: "Bireysel — Fatma Şahin", tamamlandi: false, olusturulma: Date.now() - 1000
      },
      {
        id: "tur_seed_3", guzergah: "Ayder Yaylası", arac: "61 GH 321", sofor: "Serkan Kurt",
        baslangic: tarihEkle(-2), bitis: tarihEkle(-2), fiyat: 3200, paraBirimi: "TRY",
        musteri: "Grup — Karadeniz Turu", tamamlandi: true, olusturulma: Date.now() - 2000
      }
    ],
    araclar: [
      { id: "arac_seed_1", plaka: "61 AB 123", marka: "Renault", model: "Clio", yil: 2023, fotoYolu: null, kiralamayaUygun: true, turaUygun: false, olusturulma: Date.now() },
      { id: "arac_seed_2", plaka: "61 CD 456", marka: "Fiat", model: "Egea", yil: 2022, fotoYolu: null, kiralamayaUygun: true, turaUygun: false, olusturulma: Date.now() - 1000 },
      { id: "arac_seed_3", plaka: "61 EF 789", marka: "Dacia", model: "Duster", yil: 2024, fotoYolu: null, kiralamayaUygun: true, turaUygun: false, olusturulma: Date.now() - 2000 },
      { id: "arac_seed_4", plaka: "61 GH 321", marka: "Ford", model: "Transit (14+1)", yil: 2021, fotoYolu: null, kiralamayaUygun: false, turaUygun: true, olusturulma: Date.now() - 3000 }
    ],
    soforler: [
      { id: "sofor_seed_1", adSoyad: "Hasan Öz", telefon: "0555 000 00 01", olusturulma: Date.now() },
      { id: "sofor_seed_2", adSoyad: "Kemal Aydın", telefon: "0555 000 00 02", olusturulma: Date.now() - 1000 },
      { id: "sofor_seed_3", adSoyad: "Serkan Kurt", telefon: "0555 000 00 03", olusturulma: Date.now() - 2000 }
    ]
  };

  fs.writeFileSync(DB_YOLU, JSON.stringify(db, null, 2), "utf-8");
  console.log("İlk kurulum tamamlandı: data/db.json oluşturuldu.");
  console.log("Varsayılan giriş -> Kullanıcı adı: " + VARSAYILAN_KULLANICI + "  Şifre: " + VARSAYILAN_SIFRE);
  console.log("ÖNEMLİ: sifre-degistir.js betiğiyle bu şifreyi ilk fırsatta değiştirin.");
}

function dbOku() {
  const ham = fs.readFileSync(DB_YOLU, "utf-8");
  return JSON.parse(ham);
}

function dbYaz(db) {
  fs.writeFileSync(DB_YOLU, JSON.stringify(db, null, 2), "utf-8");
}

/* ------------------------------------------------------- *
 *  Oturumlar (bellekte tutulur)
 * ------------------------------------------------------- */

const oturumlar = new Map();

function oturumOlustur(kullaniciAdi) {
  const token = crypto.randomBytes(32).toString("hex");
  oturumlar.set(token, { kullaniciAdi, sonErisim: Date.now() });
  return token;
}

function oturumGecerliMi(token) {
  if (!token) return null;
  const o = oturumlar.get(token);
  if (!o) return null;
  if (Date.now() - o.sonErisim > OTURUM_SURESI_MS) {
    oturumlar.delete(token);
    return null;
  }
  o.sonErisim = Date.now();
  return o;
}

function oturumSil(token) { oturumlar.delete(token); }

function cerezleriAyristir(req) {
  const baslik = req.headers.cookie;
  const sonuc = {};
  if (!baslik) return sonuc;
  baslik.split(";").forEach(function (parca) {
    const ind = parca.indexOf("=");
    if (ind === -1) return;
    const ad = parca.slice(0, ind).trim();
    const deger = parca.slice(ind + 1).trim();
    sonuc[ad] = decodeURIComponent(deger);
  });
  return sonuc;
}

/* ------------------------------------------------------- *
 *  Giriş denemesi hız sınırlama (IP başına)
 * ------------------------------------------------------- */

const girisDenemeleri = new Map();

function ipAl(req) {
  return (req.socket && req.socket.remoteAddress) || "bilinmeyen";
}

function kilitliMi(ip) {
  const kayit = girisDenemeleri.get(ip);
  if (!kayit) return 0;
  const kalan = kayit.kilitBitis - Date.now();
  return kalan > 0 ? kalan : 0;
}

function basarisizGirisKaydet(ip) {
  const kayit = girisDenemeleri.get(ip) || { sayac: 0, kilitBitis: 0 };
  kayit.sayac += 1;
  if (kayit.sayac >= MAKS_GIRIS_DENEME) {
    kayit.kilitBitis = Date.now() + GIRIS_KILIT_SURESI_MS;
    kayit.sayac = 0;
  }
  girisDenemeleri.set(ip, kayit);
}

function girisBasariliSifirla(ip) { girisDenemeleri.delete(ip); }

/* ------------------------------------------------------- *
 *  TC Kimlik No doğrulaması (resmî checksum algoritması)
 * ------------------------------------------------------- */

function tcGecerliMi(tc) {
  if (typeof tc !== "string" || !/^[1-9][0-9]{10}$/.test(tc)) return false;
  const d = tc.split("").map(Number);
  const tekToplam = d[0] + d[2] + d[4] + d[6] + d[8];
  const ciftToplam = d[1] + d[3] + d[5] + d[7];
  let d10 = ((tekToplam * 7) - ciftToplam) % 10;
  if (d10 < 0) d10 += 10;
  if (d10 !== d[9]) return false;
  let ilk10Toplam = 0;
  for (let i = 0; i < 10; i++) ilk10Toplam += d[i];
  return (ilk10Toplam % 10) === d[10];
}

const PARA_BIRIMLERI = ["TRY", "USD"];
const ODEME_TURLERI = ["pesin", "taksit"];

/* ------------------------------------------------------- *
 *  Doğrulama yardımcıları
 * ------------------------------------------------------- */

function metinMi(v) { return typeof v === "string" && v.trim().length > 0; }
function tarihMi(v) { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v); }
function pozitifSayiMi(v) { return typeof v === "number" && isFinite(v) && v >= 0; }

function kiralamaDogrula(v) {
  const hatalar = [];
  if (!metinMi(v.plaka)) hatalar.push("plaka");
  if (!metinMi(v.marka)) hatalar.push("marka");
  if (!metinMi(v.model)) hatalar.push("model");
  if (!(Number.isInteger(v.yil) && v.yil >= 1990 && v.yil <= 2035)) hatalar.push("yil");
  if (!tarihMi(v.baslangic)) hatalar.push("baslangic");
  if (!tarihMi(v.bitis) || (tarihMi(v.baslangic) && v.bitis < v.baslangic)) hatalar.push("bitis");
  if (!pozitifSayiMi(v.fiyat)) hatalar.push("fiyat");
  if (PARA_BIRIMLERI.indexOf(v.paraBirimi) === -1) hatalar.push("paraBirimi");
  if (ODEME_TURLERI.indexOf(v.odemeTuru) === -1) hatalar.push("odemeTuru");
  if (v.odemeTuru === "taksit" && !(Number.isInteger(v.taksitSayisi) && v.taksitSayisi >= 2 && v.taksitSayisi <= 36)) hatalar.push("taksitSayisi");
  if (!metinMi(v.musteriAd)) hatalar.push("musteriAd");
  if (!tcGecerliMi(v.musteriTC)) hatalar.push("musteriTC");
  return hatalar;
}

function turDogrula(v) {
  const hatalar = [];
  if (!metinMi(v.guzergah)) hatalar.push("guzergah");
  if (!metinMi(v.arac)) hatalar.push("arac");
  if (!metinMi(v.sofor)) hatalar.push("sofor");
  if (!tarihMi(v.baslangic)) hatalar.push("baslangic");
  if (!tarihMi(v.bitis) || (tarihMi(v.baslangic) && v.bitis < v.baslangic)) hatalar.push("bitis");
  if (!pozitifSayiMi(v.fiyat)) hatalar.push("fiyat");
  if (PARA_BIRIMLERI.indexOf(v.paraBirimi) === -1) hatalar.push("paraBirimi");
  return hatalar;
}

function uzatmaDogrula(v, mevcutBitis) {
  const hatalar = [];
  if (!tarihMi(v.yeniBitis) || v.yeniBitis <= mevcutBitis) hatalar.push("yeniBitis");
  if (!pozitifSayiMi(v.gunlukEkstraFiyat)) hatalar.push("gunlukEkstraFiyat");
  return hatalar;
}

function gunFarki(eskiISO, yeniISO) {
  const eski = new Date(eskiISO + "T00:00:00Z").getTime();
  const yeni = new Date(yeniISO + "T00:00:00Z").getTime();
  return Math.round((yeni - eski) / (24 * 60 * 60 * 1000));
}

function aracDogrula(v) {
  const hatalar = [];
  if (!metinMi(v.plaka)) hatalar.push("plaka");
  if (!metinMi(v.marka)) hatalar.push("marka");
  if (!metinMi(v.model)) hatalar.push("model");
  if (!(Number.isInteger(v.yil) && v.yil >= 1990 && v.yil <= 2035)) hatalar.push("yil");
  if (!v.kiralamayaUygun && !v.turaUygun) hatalar.push("kategori");
  return hatalar;
}

function soforDogrula(v) {
  const hatalar = [];
  if (!metinMi(v.adSoyad)) hatalar.push("adSoyad");
  return hatalar;
}

/* ------------------------------------------------------- *
 *  Araç fotoğrafı kaydetme (base64 data URL -> dosya)
 *  Ek paket gerekmez; multipart/form-data yerine istemci
 *  fotoğrafı sıkıştırıp base64 olarak JSON içinde gönderir.
 * ------------------------------------------------------- */

const IMG_KOK_DIZIN = path.join(PUBLIC_DIZIN, "img");
const IZINLI_FOTO_MIME = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

function base64FotoKaydet(dataUrl, eskiFotoYolu, altKlasor) {
  const eslesme = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!eslesme) return { hata: "gecersiz_foto" };

  const uzanti = IZINLI_FOTO_MIME[eslesme[1]];
  const veri = Buffer.from(eslesme[2], "base64");
  if (veri.length > 3.5 * 1024 * 1024) return { hata: "foto_cok_buyuk" };

  const hedefDizin = path.join(IMG_KOK_DIZIN, altKlasor);
  if (!fs.existsSync(hedefDizin)) fs.mkdirSync(hedefDizin, { recursive: true });

  const dosyaAdi = altKlasor + "_" + Date.now().toString(36) + "_" + crypto.randomBytes(4).toString("hex") + uzanti;
  fs.writeFileSync(path.join(hedefDizin, dosyaAdi), veri);

  if (eskiFotoYolu) fotoSilGuvenli(eskiFotoYolu);
  return { yol: "img/" + altKlasor + "/" + dosyaAdi };
}

function fotoSilGuvenli(goreliYol) {
  if (!goreliYol || typeof goreliYol !== "string") return;
  const tamYol = path.normalize(path.join(PUBLIC_DIZIN, goreliYol));
  if (!tamYol.startsWith(IMG_KOK_DIZIN)) return; // güvenlik: yalnızca img/ altında silinebilir
  fs.unlink(tamYol, function () { /* dosya zaten yoksa sorun değil */ });
}

/* ------------------------------------------------------- *
 *  HTTP yardımcıları
 * ------------------------------------------------------- */

function guvenlikBasliklariEkle(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
    "font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; object-src 'none'; " +
    "base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
}

function jsonGonder(res, kod, veri) {
  const govde = JSON.stringify(veri);
  res.writeHead(kod, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(govde) });
  res.end(govde);
}

function govdeOku(req) {
  return new Promise(function (resolve, reject) {
    let parcalar = [];
    let boyut = 0;
    const MAKS_BOYUT = 4 * 1024 * 1024; // araç fotoğrafları için yükseltildi
    req.on("data", function (parca) {
      boyut += parca.length;
      if (boyut > MAKS_BOYUT) {
        reject(new Error("govde_cok_buyuk"));
        req.destroy();
        return;
      }
      parcalar.push(parca);
    });
    req.on("end", function () {
      if (parcalar.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(parcalar).toString("utf-8")));
      } catch (e) {
        reject(new Error("gecersiz_json"));
      }
    });
    req.on("error", reject);
  });
}

function oturumluIstekMi(req) {
  const cerezler = cerezleriAyristir(req);
  const oturum = oturumGecerliMi(cerezler.adwaa_oturum);
  return oturum;
}

/* ------------------------------------------------------- *
 *  Statik dosya sunumu (public/ dışına çıkışı engeller)
 * ------------------------------------------------------- */

const MIME_TURLERI = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8"
};

function statikDosyaSun(req, res, istekYolu) {
  let goreliYol = istekYolu === "/" ? "/index.html" : istekYolu;
  goreliYol = decodeURIComponent(goreliYol.split("?")[0]);

  const tamYol = path.normalize(path.join(PUBLIC_DIZIN, goreliYol));
  if (!tamYol.startsWith(PUBLIC_DIZIN)) {
    res.writeHead(403);
    res.end("Yasak");
    return;
  }

  fs.readFile(tamYol, function (err, veri) {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bulunamadı");
      return;
    }
    const uzanti = path.extname(tamYol).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TURLERI[uzanti] || "application/octet-stream" });
    res.end(veri);
  });
}

/* ------------------------------------------------------- *
 *  API yönlendirme
 * ------------------------------------------------------- */

async function apiYonlendir(req, res, url) {
  const yol = url.pathname;
  const metod = req.method;

  if (yol === "/api/giris" && metod === "POST") {
    const ip = ipAl(req);
    const kalanKilitMs = kilitliMi(ip);
    if (kalanKilitMs > 0) {
      return jsonGonder(res, 429, { basarili: false, mesaj: "Çok fazla başarısız deneme. " + Math.ceil(kalanKilitMs / 1000) + " saniye sonra tekrar deneyin." });
    }
    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }

    const kullaniciAdi = typeof govde.kullaniciAdi === "string" ? govde.kullaniciAdi.trim() : "";
    const sifre = typeof govde.sifre === "string" ? govde.sifre : "";

    const db = dbOku();
    const kullanici = db.kullanicilar.find(function (k) { return k.kullaniciAdi === kullaniciAdi; });

    if (!kullanici || !sifreDogrula(sifre, kullanici.tuz, kullanici.hash)) {
      basarisizGirisKaydet(ip);
      return jsonGonder(res, 401, { basarili: false, mesaj: "Kullanıcı adı veya şifre hatalı." });
    }

    girisBasariliSifirla(ip);
    const token = oturumOlustur(kullanici.kullaniciAdi);
    res.setHeader("Set-Cookie", "adwaa_oturum=" + token + "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" + Math.floor(OTURUM_SURESI_MS / 1000));
    return jsonGonder(res, 200, { basarili: true, kullaniciAdi: kullanici.kullaniciAdi });
  }

  if (yol === "/api/cikis" && metod === "POST") {
    const cerezler = cerezleriAyristir(req);
    if (cerezler.adwaa_oturum) oturumSil(cerezler.adwaa_oturum);
    res.setHeader("Set-Cookie", "adwaa_oturum=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
    return jsonGonder(res, 200, { basarili: true });
  }

  if (yol === "/api/oturum" && metod === "GET") {
    const oturum = oturumluIstekMi(req);
    if (!oturum) return jsonGonder(res, 401, { oturumAcik: false });
    return jsonGonder(res, 200, { oturumAcik: true, kullaniciAdi: oturum.kullaniciAdi });
  }

  const oturum = oturumluIstekMi(req);
  if (!oturum) return jsonGonder(res, 401, { basarili: false, mesaj: "Oturum bulunamadı, lütfen giriş yapın." });

  if (yol === "/api/kiralamalar" && metod === "GET") {
    const db = dbOku();
    return jsonGonder(res, 200, db.kiralamalar);
  }

  if (yol === "/api/kiralamalar" && metod === "POST") {
    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }
    const kayit = kiralamaVeriHazirla(govde);
    const hatalar = kiralamaDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    const db = dbOku();
    kayit.id = "kir_" + Date.now().toString(36) + "_" + crypto.randomBytes(4).toString("hex");
    kayit.olusturulma = Date.now();
    kayit.kontratFotoOn = null;
    kayit.kontratFotoArka = null;
    kayit.uzatmalar = [];
    db.kiralamalar.push(kayit);
    dbYaz(db);
    return jsonGonder(res, 201, kayit);
  }

  let eslesme = yol.match(/^\/api\/kiralamalar\/([a-zA-Z0-9_]+)$/);
  if (eslesme && (metod === "PUT" || metod === "DELETE")) {
    const id = eslesme[1];
    const db = dbOku();
    const index = db.kiralamalar.findIndex(function (k) { return k.id === id; });
    if (index === -1) return jsonGonder(res, 404, { basarili: false, mesaj: "Kayıt bulunamadı." });

    if (metod === "DELETE") {
      fotoSilGuvenli(db.kiralamalar[index].kontratFotoOn);
      fotoSilGuvenli(db.kiralamalar[index].kontratFotoArka);
      db.kiralamalar.splice(index, 1);
      dbYaz(db);
      return jsonGonder(res, 200, { basarili: true });
    }

    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }
    const kayit = kiralamaVeriHazirla(govde);
    const hatalar = kiralamaDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    const eskiKayit = db.kiralamalar[index];
    kayit.id = id;
    kayit.olusturulma = eskiKayit.olusturulma;
    kayit.kontratFotoOn = eskiKayit.kontratFotoOn || null;
    kayit.kontratFotoArka = eskiKayit.kontratFotoArka || null;
    kayit.uzatmalar = eskiKayit.uzatmalar || [];
    db.kiralamalar[index] = kayit;
    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  eslesme = yol.match(/^\/api\/kiralamalar\/([a-zA-Z0-9_]+)\/tamamlandi$/);
  if (eslesme && metod === "PATCH") {
    const id = eslesme[1];
    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false }); }
    const db = dbOku();
    const kayit = db.kiralamalar.find(function (k) { return k.id === id; });
    if (!kayit) return jsonGonder(res, 404, { basarili: false, mesaj: "Kayıt bulunamadı." });
    kayit.tamamlandi = !!govde.tamamlandi;
    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  // Kontrat fotoğrafı yükleme (ön/arka, ayrı ayrı — isteğe bağlı)
  eslesme = yol.match(/^\/api\/kiralamalar\/([a-zA-Z0-9_]+)\/kontrat$/);
  if (eslesme && metod === "POST") {
    const id = eslesme[1];
    let govde;
    try { govde = await govdeOku(req); } catch (e) {
      const mesaj = e.message === "govde_cok_buyuk" ? "Fotoğraf çok büyük." : "Geçersiz istek.";
      return jsonGonder(res, 400, { basarili: false, mesaj: mesaj });
    }
    if (govde.taraf !== "on" && govde.taraf !== "arka") return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz taraf." });

    const db = dbOku();
    const kayit = db.kiralamalar.find(function (k) { return k.id === id; });
    if (!kayit) return jsonGonder(res, 404, { basarili: false, mesaj: "Kayıt bulunamadı." });

    const alan = govde.taraf === "on" ? "kontratFotoOn" : "kontratFotoArka";
    const sonuc = base64FotoKaydet(govde.fotoBase64, kayit[alan], "kontratlar");
    if (sonuc.hata) return jsonGonder(res, 422, { basarili: false, hatalar: ["foto"] });
    kayit[alan] = sonuc.yol;
    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  // Kiralamayı uzatma: yeni bitiş tarihi + ekstra günlük ücret; geçmişi kayıt altına alır
  eslesme = yol.match(/^\/api\/kiralamalar\/([a-zA-Z0-9_]+)\/uzat$/);
  if (eslesme && metod === "POST") {
    const id = eslesme[1];
    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }

    const db = dbOku();
    const kayit = db.kiralamalar.find(function (k) { return k.id === id; });
    if (!kayit) return jsonGonder(res, 404, { basarili: false, mesaj: "Kayıt bulunamadı." });

    const govdeSayisal = { yeniBitis: govde.yeniBitis, gunlukEkstraFiyat: Number(govde.gunlukEkstraFiyat) };
    const hatalar = uzatmaDogrula(govdeSayisal, kayit.bitis);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    const ekstraGun = gunFarki(kayit.bitis, govdeSayisal.yeniBitis);
    const ekstraTutar = ekstraGun * govdeSayisal.gunlukEkstraFiyat;

    if (!kayit.uzatmalar) kayit.uzatmalar = [];
    kayit.uzatmalar.push({
      eskiBitis: kayit.bitis,
      yeniBitis: govdeSayisal.yeniBitis,
      ekstraGun: ekstraGun,
      gunlukEkstraFiyat: govdeSayisal.gunlukEkstraFiyat,
      ekstraTutar: ekstraTutar,
      tarih: Date.now()
    });
    kayit.bitis = govdeSayisal.yeniBitis;
    kayit.fiyat = Number(kayit.fiyat) + ekstraTutar;

    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  if (yol === "/api/turlar" && metod === "GET") {
    const db = dbOku();
    return jsonGonder(res, 200, db.turlar);
  }

  if (yol === "/api/turlar" && metod === "POST") {
    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }
    const kayit = turVeriHazirla(govde);
    const hatalar = turDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    const db = dbOku();
    kayit.id = "tur_" + Date.now().toString(36) + "_" + crypto.randomBytes(4).toString("hex");
    kayit.olusturulma = Date.now();
    db.turlar.push(kayit);
    dbYaz(db);
    return jsonGonder(res, 201, kayit);
  }

  eslesme = yol.match(/^\/api\/turlar\/([a-zA-Z0-9_]+)$/);
  if (eslesme && (metod === "PUT" || metod === "DELETE")) {
    const id = eslesme[1];
    const db = dbOku();
    const index = db.turlar.findIndex(function (t) { return t.id === id; });
    if (index === -1) return jsonGonder(res, 404, { basarili: false, mesaj: "Kayıt bulunamadı." });

    if (metod === "DELETE") {
      db.turlar.splice(index, 1);
      dbYaz(db);
      return jsonGonder(res, 200, { basarili: true });
    }

    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }
    const kayit = turVeriHazirla(govde);
    const hatalar = turDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    kayit.id = id;
    kayit.olusturulma = db.turlar[index].olusturulma;
    db.turlar[index] = kayit;
    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  eslesme = yol.match(/^\/api\/turlar\/([a-zA-Z0-9_]+)\/tamamlandi$/);
  if (eslesme && metod === "PATCH") {
    const id = eslesme[1];
    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false }); }
    const db = dbOku();
    const kayit = db.turlar.find(function (t) { return t.id === id; });
    if (!kayit) return jsonGonder(res, 404, { basarili: false, mesaj: "Kayıt bulunamadı." });
    kayit.tamamlandi = !!govde.tamamlandi;
    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  /* ---- Araçlar ---- */

  if (yol === "/api/araclar" && metod === "GET") {
    const db = dbOku();
    return jsonGonder(res, 200, db.araclar || []);
  }

  if (yol === "/api/araclar" && metod === "POST") {
    let govde;
    try { govde = await govdeOku(req); } catch (e) {
      const mesaj = e.message === "govde_cok_buyuk" ? "Fotoğraf çok büyük." : "Geçersiz istek.";
      return jsonGonder(res, 400, { basarili: false, mesaj: mesaj });
    }
    const kayit = aracVeriHazirla(govde);
    const hatalar = aracDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    if (govde.fotoBase64) {
      const sonuc = base64FotoKaydet(govde.fotoBase64, null, "araclar");
      if (sonuc.hata) return jsonGonder(res, 422, { basarili: false, hatalar: ["foto"] });
      kayit.fotoYolu = sonuc.yol;
    } else {
      kayit.fotoYolu = null;
    }

    const db = dbOku();
    if (!db.araclar) db.araclar = [];
    kayit.id = "arac_" + Date.now().toString(36) + "_" + crypto.randomBytes(4).toString("hex");
    kayit.olusturulma = Date.now();
    db.araclar.push(kayit);
    dbYaz(db);
    return jsonGonder(res, 201, kayit);
  }

  let aracEslesme = yol.match(/^\/api\/araclar\/([a-zA-Z0-9_]+)$/);
  if (aracEslesme && (metod === "PUT" || metod === "DELETE")) {
    const id = aracEslesme[1];
    const db = dbOku();
    if (!db.araclar) db.araclar = [];
    const index = db.araclar.findIndex(function (a) { return a.id === id; });
    if (index === -1) return jsonGonder(res, 404, { basarili: false, mesaj: "Araç bulunamadı." });

    if (metod === "DELETE") {
      fotoSilGuvenli(db.araclar[index].fotoYolu);
      db.araclar.splice(index, 1);
      dbYaz(db);
      return jsonGonder(res, 200, { basarili: true });
    }

    let govde;
    try { govde = await govdeOku(req); } catch (e) {
      const mesaj = e.message === "govde_cok_buyuk" ? "Fotoğraf çok büyük." : "Geçersiz istek.";
      return jsonGonder(res, 400, { basarili: false, mesaj: mesaj });
    }
    const kayit = aracVeriHazirla(govde);
    const hatalar = aracDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    const eskiKayit = db.araclar[index];
    if (govde.fotoBase64) {
      const sonuc = base64FotoKaydet(govde.fotoBase64, eskiKayit.fotoYolu, "araclar");
      if (sonuc.hata) return jsonGonder(res, 422, { basarili: false, hatalar: ["foto"] });
      kayit.fotoYolu = sonuc.yol;
    } else {
      kayit.fotoYolu = eskiKayit.fotoYolu; // fotoğraf değiştirilmedi
    }

    kayit.id = id;
    kayit.olusturulma = eskiKayit.olusturulma;
    db.araclar[index] = kayit;
    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  /* ---- Şoförler ---- */

  if (yol === "/api/soforler" && metod === "GET") {
    const db = dbOku();
    return jsonGonder(res, 200, db.soforler || []);
  }

  if (yol === "/api/soforler" && metod === "POST") {
    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }
    const kayit = soforVeriHazirla(govde);
    const hatalar = soforDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    const db = dbOku();
    if (!db.soforler) db.soforler = [];
    kayit.id = "sofor_" + Date.now().toString(36) + "_" + crypto.randomBytes(4).toString("hex");
    kayit.olusturulma = Date.now();
    db.soforler.push(kayit);
    dbYaz(db);
    return jsonGonder(res, 201, kayit);
  }

  const soforEslesme = yol.match(/^\/api\/soforler\/([a-zA-Z0-9_]+)$/);
  if (soforEslesme && (metod === "PUT" || metod === "DELETE")) {
    const id = soforEslesme[1];
    const db = dbOku();
    if (!db.soforler) db.soforler = [];
    const index = db.soforler.findIndex(function (s) { return s.id === id; });
    if (index === -1) return jsonGonder(res, 404, { basarili: false, mesaj: "Şoför bulunamadı." });

    if (metod === "DELETE") {
      db.soforler.splice(index, 1);
      dbYaz(db);
      return jsonGonder(res, 200, { basarili: true });
    }

    let govde;
    try { govde = await govdeOku(req); } catch (e) { return jsonGonder(res, 400, { basarili: false, mesaj: "Geçersiz istek." }); }
    const kayit = soforVeriHazirla(govde);
    const hatalar = soforDogrula(kayit);
    if (hatalar.length) return jsonGonder(res, 422, { basarili: false, hatalar: hatalar });

    kayit.id = id;
    kayit.olusturulma = db.soforler[index].olusturulma;
    db.soforler[index] = kayit;
    dbYaz(db);
    return jsonGonder(res, 200, kayit);
  }

  return jsonGonder(res, 404, { basarili: false, mesaj: "Uç bulunamadı." });
}

function kiralamaVeriHazirla(v) {
  return {
    plaka: typeof v.plaka === "string" ? v.plaka.trim() : "",
    marka: typeof v.marka === "string" ? v.marka.trim() : "",
    model: typeof v.model === "string" ? v.model.trim() : "",
    yil: Number(v.yil),
    baslangic: v.baslangic,
    bitis: v.bitis,
    fiyat: Number(v.fiyat),
    paraBirimi: v.paraBirimi,
    odemeTuru: v.odemeTuru,
    taksitSayisi: v.odemeTuru === "taksit" ? Number(v.taksitSayisi) : null,
    musteriAd: typeof v.musteriAd === "string" ? v.musteriAd.trim() : "",
    musteriTC: typeof v.musteriTC === "string" ? v.musteriTC.trim() : "",
    telefon: typeof v.telefon === "string" ? v.telefon.trim() : "",
    not: typeof v.not === "string" ? v.not.trim() : "",
    tamamlandi: !!v.tamamlandi
  };
}

function turVeriHazirla(v) {
  return {
    guzergah: typeof v.guzergah === "string" ? v.guzergah.trim() : "",
    arac: typeof v.arac === "string" ? v.arac.trim() : "",
    sofor: typeof v.sofor === "string" ? v.sofor.trim() : "",
    baslangic: v.baslangic,
    bitis: v.bitis,
    fiyat: Number(v.fiyat),
    paraBirimi: v.paraBirimi,
    musteri: typeof v.musteri === "string" ? v.musteri.trim() : "",
    tamamlandi: !!v.tamamlandi
  };
}

function aracVeriHazirla(v) {
  return {
    plaka: typeof v.plaka === "string" ? v.plaka.trim() : "",
    marka: typeof v.marka === "string" ? v.marka.trim() : "",
    model: typeof v.model === "string" ? v.model.trim() : "",
    yil: Number(v.yil),
    kiralamayaUygun: !!v.kiralamayaUygun,
    turaUygun: !!v.turaUygun
  };
}

function soforVeriHazirla(v) {
  return {
    adSoyad: typeof v.adSoyad === "string" ? v.adSoyad.trim() : "",
    telefon: typeof v.telefon === "string" ? v.telefon.trim() : ""
  };
}

/* ------------------------------------------------------- *
 *  Sunucu
 * ------------------------------------------------------- */

dbIlkKurulum();

const sunucu = http.createServer(function (req, res) {
  guvenlikBasliklariEkle(res);

  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));

  if (url.pathname.startsWith("/api/")) {
    apiYonlendir(req, res, url).catch(function (err) {
      console.error("Sunucu hatası:", err);
      jsonGonder(res, 500, { basarili: false, mesaj: "Sunucu hatası." });
    });
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end("Yöntem desteklenmiyor");
    return;
  }

  statikDosyaSun(req, res, url.pathname);
});

sunucu.listen(PORT, "0.0.0.0", function () {
  const arayuzler = Object.values(os.networkInterfaces()).flat().filter(function (x) { return x && x.family === "IPv4" && !x.internal; });
  console.log("");
  console.log("🚀 Adwaa Travel Panel çalışıyor");
  console.log("   Bu bilgisayardan : http://localhost:" + PORT);
  arayuzler.forEach(function (arayuz) {
    console.log("   Ağdaki diğer bilgisayarlardan : http://" + arayuz.address + ":" + PORT);
  });
  console.log("");
  console.log("Durdurmak için bu pencerede Ctrl+C'ye basın.");
  console.log("");
});
