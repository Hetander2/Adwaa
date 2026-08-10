/* =========================================================
   ADWAA TRAVEL — Şifre / Kullanıcı Değiştirme Aracı
   -------------------------------------------------------
   Kullanımı:   node sifre-degistir.js
   Sorulan bilgileri girin; mevcut bir kullanıcı adıysa şifresi
   güncellenir, yeni bir kullanıcı adıysa panele erişebilecek
   yeni bir yönetici eklenir. Şifre asla düz metin olarak
   saklanmaz (yalnızca hash'i data/db.json içinde tutulur).
   ========================================================= */

"use strict";

const readline = require("readline");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DB_YOLU = path.join(__dirname, "data", "db.json");

function sifreHashla(sifre) {
  const tuz = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(sifre, tuz, 64).toString("hex");
  return { tuz: tuz, hash: hash };
}

if (!fs.existsSync(DB_YOLU)) {
  console.log("data/db.json bulunamadı.");
  console.log('Önce bir kez "node server.js" çalıştırıp Ctrl+C ile durdurun (ilk kurulum otomatik yapılır),');
  console.log("sonra bu betiği tekrar çalıştırın.");
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function sor(soru) {
  return new Promise(function (resolve) { rl.question(soru, resolve); });
}

(async function () {
  console.log("=== Adwaa Travel Panel — Şifre / Kullanıcı Değiştir ===");
  console.log("(Not: girdiğiniz şifre ekranda gizlenmez, kimsenin bakmadığından emin olun.)\n");

  const kullaniciAdi = (await sor("Kullanıcı adı (mevcutsa güncellenir, yoksa yeni eklenir): ")).trim();
  const sifre = await sor("Yeni şifre: ");
  const sifreTekrar = await sor("Yeni şifre (tekrar): ");
  rl.close();

  if (!kullaniciAdi || !sifre) {
    console.log("\nKullanıcı adı ve şifre boş olamaz. İşlem iptal edildi.");
    process.exit(1);
  }
  if (sifre !== sifreTekrar) {
    console.log("\nGirdiğiniz iki şifre birbiriyle uyuşmuyor. İşlem iptal edildi.");
    process.exit(1);
  }
  if (sifre.length < 8) {
    console.log("\nUYARI: Şifre 8 karakterden kısa. Yine de kaydedilecek, ama daha uzun bir şifre önerilir.");
  }

  const db = JSON.parse(fs.readFileSync(DB_YOLU, "utf-8"));
  const yeni = sifreHashla(sifre);
  const mevcut = db.kullanicilar.find(function (k) { return k.kullaniciAdi === kullaniciAdi; });

  if (mevcut) {
    mevcut.tuz = yeni.tuz;
    mevcut.hash = yeni.hash;
    console.log('\n"' + kullaniciAdi + '" kullanıcısının şifresi güncellendi.');
  } else {
    db.kullanicilar.push({ kullaniciAdi: kullaniciAdi, tuz: yeni.tuz, hash: yeni.hash });
    console.log("\nYeni yönetici eklendi: " + kullaniciAdi);
  }

  fs.writeFileSync(DB_YOLU, JSON.stringify(db, null, 2), "utf-8");
  console.log("Kaydedildi. Sunucuyu yeniden başlatmanıza gerek yok — bir sonraki girişte yeni şifre geçerli olacaktır.\n");
})();
