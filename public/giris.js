/* =========================================================
   ADWAA TRAVEL — Giriş mantığı (sunucu tabanlı)
   ========================================================= */

(function () {
  "use strict";

  var form = document.getElementById("giris-formu");
  var uyari = document.getElementById("giris-uyari");
  var girisBtn = document.getElementById("giris-btn");

  function uyariGoster(mesaj) {
    uyari.textContent = mesaj;
    uyari.classList.add("gorunur");
  }
  function uyariGizle() {
    uyari.classList.remove("gorunur");
    uyari.textContent = "";
  }

  // Zaten geçerli bir oturum varsa doğrudan panele git.
  fetch("/api/oturum", { credentials: "same-origin" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (veri) {
      if (veri && veri.oturumAcik) window.location.replace("panel.html");
    })
    .catch(function () { /* sunucu henüz hazır değilse görmezden gel */ });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    uyariGizle();
    girisBtn.disabled = true;
    girisBtn.textContent = "Giriş yapılıyor…";

    var kullaniciAdi = document.getElementById("kullanici-adi").value.trim();
    var sifre = document.getElementById("sifre").value;

    fetch("/api/giris", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kullaniciAdi: kullaniciAdi, sifre: sifre })
    })
      .then(function (r) { return r.json().then(function (veri) { return { durum: r.status, veri: veri }; }); })
      .then(function (sonuc) {
        if (sonuc.durum === 200 && sonuc.veri.basarili) {
          window.location.href = "panel.html";
          return;
        }
        uyariGoster(sonuc.veri.mesaj || "Giriş başarısız.");
        girisBtn.disabled = false;
        girisBtn.textContent = "Giriş Yap";
        document.getElementById("sifre").value = "";
      })
      .catch(function () {
        uyariGoster("Sunucuya bağlanılamadı. Sunucunun çalıştığından emin olun.");
        girisBtn.disabled = false;
        girisBtn.textContent = "Giriş Yap";
      });
  });
})();
