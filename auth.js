/* =========================================================
   ADWAA TRAVEL — Giriş mantığı
   -------------------------------------------------------
   ÖNEMLİ: Bu dosyadaki kullanıcı adı/şifre kontrolü TARAYICI
   İÇİNDE çalışır. Bu, siteye rastgele gelen birinin paneli
   kazara açmasını engeller ama gerçek bir erişim güvenliği
   SAĞLAMAZ: bu dosyanın kaynağını görüntüleyen herkes şifreyi
   okuyabilir. Gerçek müşteri verisiyle canlıya almadan önce
   bunu sunucu taraflı bir girişle (ör. Netlify/Vercel + veri
   tabanı + hash'lenmiş şifre) değiştirin. Bkz. README.md.
   ========================================================= */

(function () {
  "use strict";

  // Demo girişi — yayınlamadan önce mutlaka değiştirin.
  var GECERLI_KULLANICI = "adwaayonetici";
  var GECERLI_SIFRE = "Trabzon61!Adwaa";

  var OTURUM_ANAHTARI = "adwaa_oturum";
  var DENEME_ANAHTARI = "adwaa_giris_deneme";
  var KILIT_ANAHTARI = "adwaa_giris_kilit";
  var MAKS_DENEME = 5;
  var KILIT_SURESI_SN = 30;

  // Zaten oturum açıksa doğrudan panele git.
  if (sessionStorage.getItem(OTURUM_ANAHTARI) === "aktif") {
    window.location.replace("panel.html");
    return;
  }

  var form = document.getElementById("giris-formu");
  var uyari = document.getElementById("giris-uyari");
  var girisBtn = document.getElementById("giris-btn");
  var geriSayimZamanlayici = null;

  function uyariGoster(mesaj) {
    uyari.textContent = mesaj;
    uyari.classList.add("gorunur");
  }

  function uyariGizle() {
    uyari.classList.remove("gorunur");
    uyari.textContent = "";
  }

  function kilitliMi() {
    var kilitBitis = parseInt(sessionStorage.getItem(KILIT_ANAHTARI) || "0", 10);
    return kilitBitis > Date.now();
  }

  function kilitGeriSayimBaslat() {
    clearInterval(geriSayimZamanlayici);
    girisBtn.disabled = true;

    function tikTak() {
      var kalanMs = parseInt(sessionStorage.getItem(KILIT_ANAHTARI) || "0", 10) - Date.now();
      if (kalanMs <= 0) {
        clearInterval(geriSayimZamanlayici);
        girisBtn.disabled = false;
        uyariGizle();
        sessionStorage.removeItem(DENEME_ANAHTARI);
        sessionStorage.removeItem(KILIT_ANAHTARI);
        return;
      }
      var kalanSn = Math.ceil(kalanMs / 1000);
      uyariGoster("Çok fazla başarısız deneme. Lütfen " + kalanSn + " saniye sonra tekrar deneyin.");
    }

    tikTak();
    geriSayimZamanlayici = setInterval(tikTak, 500);
  }

  if (kilitliMi()) {
    kilitGeriSayimBaslat();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    uyariGizle();

    if (kilitliMi()) {
      kilitGeriSayimBaslat();
      return;
    }

    var kullanici = document.getElementById("kullanici-adi").value.trim();
    var sifre = document.getElementById("sifre").value;

    if (kullanici === GECERLI_KULLANICI && sifre === GECERLI_SIFRE) {
      sessionStorage.setItem(OTURUM_ANAHTARI, "aktif");
      sessionStorage.setItem("adwaa_kullanici", kullanici);
      sessionStorage.removeItem(DENEME_ANAHTARI);
      sessionStorage.removeItem(KILIT_ANAHTARI);
      window.location.href = "panel.html";
      return;
    }

    var deneme = parseInt(sessionStorage.getItem(DENEME_ANAHTARI) || "0", 10) + 1;
    sessionStorage.setItem(DENEME_ANAHTARI, String(deneme));

    if (deneme >= MAKS_DENEME) {
      sessionStorage.setItem(KILIT_ANAHTARI, String(Date.now() + KILIT_SURESI_SN * 1000));
      kilitGeriSayimBaslat();
    } else {
      uyariGoster("Kullanıcı adı veya şifre hatalı. (" + deneme + "/" + MAKS_DENEME + " deneme)");
    }

    document.getElementById("sifre").value = "";
  });
})();
