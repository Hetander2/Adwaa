/* =========================================================
   ADWAA TRAVEL — Panel mantığı (sunucu tabanlı sürüm)
   -------------------------------------------------------
   Veriler artık tarayıcıda değil, yerel ağdaki sunucuda
   (data/db.json) tutulur — tüm bilgisayarlar aynı listeyi
   görür. Bu dosya yalnızca sunucunun /api/... uçlarını
   çağırır; hiçbir veri doğrudan tarayıcıda saklanmaz.
   ========================================================= */

(function () {
  "use strict";

  function el(id) { return document.getElementById(id); }

  /* ---------- Genel yardımcılar ---------- */

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function iki(n) { return String(n).padStart(2, "0"); }

  function tarihToISO(d) {
    return d.getFullYear() + "-" + iki(d.getMonth() + 1) + "-" + iki(d.getDate());
  }

  function bugunISO() { return tarihToISO(new Date()); }

  function formatTarih(iso) {
    if (!iso) return "—";
    var p = iso.split("-");
    if (p.length !== 3) return iso;
    return p[2] + "." + p[1] + "." + p[0];
  }

  function formatTarihAraligi(bas, bit) {
    if (bas && bit && bas === bit) return formatTarih(bas);
    return formatTarih(bas) + " – " + formatTarih(bit);
  }

  function formatTutar(deger, birim) {
    var n = Number(deger) || 0;
    if (birim === "USD") {
      return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " ₺";
  }

  function tcMaskele(tc) {
    if (!tc || tc.length < 4) return "—";
    return tc.slice(0, 2) + "•••••" + tc.slice(-2);
  }

  /* ---------- Sunucu iletişimi ---------- */

  function oturumBittiIseYonlendir() {
    window.location.href = "index.html";
  }

  function apiGetir(yol) {
    return fetch(yol, { credentials: "same-origin" }).then(function (r) {
      if (r.status === 401) { oturumBittiIseYonlendir(); return Promise.reject(new Error("oturum_yok")); }
      return r.json().then(function (veri) { return { durum: r.status, veri: veri }; });
    });
  }

  function apiGonder(yol, metod, govde) {
    var secenekler = { method: metod, credentials: "same-origin" };
    if (govde !== undefined) {
      secenekler.headers = { "Content-Type": "application/json" };
      secenekler.body = JSON.stringify(govde);
    }
    return fetch(yol, secenekler).then(function (r) {
      if (r.status === 401) { oturumBittiIseYonlendir(); return Promise.reject(new Error("oturum_yok")); }
      return r.json().then(function (veri) { return { durum: r.status, veri: veri }; });
    });
  }

  /* ---------- Bildirim (toast) ---------- */

  var bildirimZamanlayici = null;
  function bildirimGoster(mesaj, tur) {
    var b = el("bildirim");
    b.textContent = mesaj;
    b.className = "bildirim gorunur" + (tur === "sil" ? " sil-turu" : "");
    clearTimeout(bildirimZamanlayici);
    bildirimZamanlayici = setTimeout(function () { b.classList.remove("gorunur"); }, 2800);
  }

  /* ---------- Oturum kontrolü ---------- */

  apiGetir("/api/oturum").then(function (sonuc) {
    el("kullanici-adi-goster").textContent = sonuc.veri.kullaniciAdi || "Yönetici";
    baslat();
  }).catch(function () { /* yönlendirme zaten yapıldı */ });

  el("cikis-btn").addEventListener("click", function () {
    apiGonder("/api/cikis", "POST").then(function () { window.location.href = "index.html"; })
      .catch(function () { window.location.href = "index.html"; });
  });

  /* =========================================================
     UYGULAMA
     ========================================================= */

  function baslat() {
    var d = new Date();
    var bugunMetin = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
    el("bugun-tarih").textContent = bugunMetin;
    if (el("takvim-guncel-tarih")) el("takvim-guncel-tarih").textContent = bugunMetin;

    takvim.yil = d.getFullYear();
    takvim.ay = d.getMonth();
    takvim.secili = bugunISO();

    baglaNav();
    baglaKiralamaOlaylari();
    baglaTurOlaylari();
    baglaTakvimOlaylari();
    baglaAracOlaylari();
    baglaSoforOlaylari();
    baglaSeciciler();
    baglaModalOrtak();

    veriYenile();
  }

  function veriYenile() {
    return Promise.all([
      apiGetir("/api/kiralamalar"), apiGetir("/api/turlar"),
      apiGetir("/api/araclar"), apiGetir("/api/soforler")
    ])
      .then(function (sonuclar) {
        kiralamaVerisi = sonuclar[0].veri || [];
        turVerisi = sonuclar[1].veri || [];
        aracVerisi = sonuclar[2].veri || [];
        soforVerisi = sonuclar[3].veri || [];
        tumRenderEt();
      })
      .catch(function () { /* yönlendirme zaten yapılmış olabilir */ });
  }

  function tumRenderEt() {
    kiralamaRenderEt();
    turRenderEt();
    ozetRenderEt();
    takvimRenderEt();
    araclarRenderEt();
    soforlerRenderEt();
    aracSecicileriDoldur();
  }

  var kiralamaVerisi = [];
  var turVerisi = [];
  var aracVerisi = [];
  var soforVerisi = [];

  /* ---------- Sekme gezinmesi ---------- */

  function baglaNav() {
    var dugmeler = document.querySelectorAll(".nav-oge");
    var bolumler = document.querySelectorAll(".bolum");
    dugmeler.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var hedef = btn.getAttribute("data-bolum");
        dugmeler.forEach(function (b) { b.classList.toggle("aktif", b === btn); });
        bolumler.forEach(function (b) { b.hidden = b.id !== "bolum-" + hedef; });
      });
    });
  }

  /* =========================================================
     ARAÇ KİRALAMALARI
     ========================================================= */

  var kSiralama = { alan: "baslangic", yon: "desc" };

  var kAlanEslesme = {
    plaka: "k-plaka", marka: "k-marka", model: "k-model", yil: "k-yil",
    baslangic: "k-baslangic", bitis: "k-bitis", fiyat: "k-fiyat", paraBirimi: "k-para-birimi",
    musteriAd: "k-ad", musteriTC: "k-tc"
  };

  function kiralamaFiltreliListe() {
    var liste = kiralamaVerisi.slice();
    var arama = el("kiralama-arama").value.trim().toLowerCase();
    var durum = el("kiralama-durum-filtre").value;
    var tarihBas = el("kiralama-tarih-baslangic").value;
    var tarihBit = el("kiralama-tarih-bitis").value;

    liste = liste.filter(function (k) {
      if (arama) {
        var hedef = (k.plaka + " " + k.marka + " " + k.model + " " + k.musteriAd).toLowerCase();
        if (hedef.indexOf(arama) === -1) return false;
      }
      if (durum === "devam" && k.tamamlandi) return false;
      if (durum === "tamamlandi" && !k.tamamlandi) return false;
      if (tarihBas && k.baslangic < tarihBas) return false;
      if (tarihBit && k.bitis > tarihBit) return false;
      return true;
    });

    liste.sort(function (a, b) {
      var av = a[kSiralama.alan], bv = b[kSiralama.alan];
      if (kSiralama.alan === "fiyat") { av = Number(a.fiyat); bv = Number(b.fiyat); }
      if (kSiralama.alan === "durum") { av = a.tamamlandi ? 1 : 0; bv = b.tamamlandi ? 1 : 0; }
      if (av < bv) return kSiralama.yon === "asc" ? -1 : 1;
      if (av > bv) return kSiralama.yon === "asc" ? 1 : -1;
      return 0;
    });

    return liste;
  }

  function kiralamaRenderEt() {
    var liste = kiralamaFiltreliListe();
    var govde = el("kiralama-tablo-govde");
    var bosDurum = el("kiralama-bos-durum");

    if (liste.length === 0) {
      govde.innerHTML = "";
      bosDurum.hidden = false;
    } else {
      bosDurum.hidden = true;
      govde.innerHTML = liste.map(function (k) {
        return (
          '<tr class="' + (k.tamamlandi ? "tamamlandi-satir" : "") + '" data-id="' + escapeHTML(k.id) + '">' +
            '<td><span class="plaka-etiket">' + escapeHTML(k.plaka) + "</span></td>" +
            '<td><span class="metin-vurgu">' + escapeHTML(k.marka) + " " + escapeHTML(k.model) + " (" + escapeHTML(k.yil) + ")</span></td>" +
            '<td class="mono">' + formatTarihAraligi(k.baslangic, k.bitis) + "</td>" +
            '<td class="mono">' + formatTutar(k.fiyat, k.paraBirimi) + "</td>" +
            "<td>" + escapeHTML(k.musteriAd) + (k.telefon ? '<br><span class="yardim-metin">' + escapeHTML(k.telefon) + "</span>" : "") + "</td>" +
            '<td><span class="tc-gizli">' + escapeHTML(tcMaskele(k.musteriTC)) + "</span></td>" +
            "<td>" + (k.tamamlandi
              ? '<span class="durum-rozet tamam">Tamamlandı</span>'
              : '<span class="durum-rozet devam">Devam Ediyor</span>') + "</td>" +
            '<td><input type="checkbox" class="tik-kutu" data-eylem="tik" ' + (k.tamamlandi ? "checked" : "") + "></td>" +
            '<td class="satir-eylem">' +
              '<button class="simge-btn" data-eylem="duzenle" type="button" title="Düzenle">✎</button>' +
              '<button class="simge-btn sil" data-eylem="sil" type="button" title="Sil">🗑</button>' +
            "</td>" +
          "</tr>"
        );
      }).join("");
    }

    document.querySelectorAll('#bolum-kiralamalar thead th[data-alan]').forEach(function (th) {
      th.classList.toggle("aktif-siralama", th.getAttribute("data-alan") === kSiralama.alan);
    });
  }

  function kiralamaFormHatalariUygula(hatalar) {
    document.querySelectorAll("#kiralama-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });
    var ilk = null;
    (hatalar || []).forEach(function (alanAdi) {
      var girdiId = kAlanEslesme[alanAdi];
      if (!girdiId) return;
      var girdi = el(girdiId);
      if (!girdi) return;
      var sarici = girdi.closest(".alan-form");
      if (sarici) { sarici.classList.add("gecersiz"); if (!ilk) ilk = girdi; }
    });
    if (ilk) ilk.focus();
  }

  var kiralamaModal = el("kiralama-modal");
  var kiralamaForm = el("kiralama-form");

  function kiralamaModalAc(id) {
    kiralamaForm.reset();
    document.querySelectorAll("#kiralama-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });
    el("k-para-birimi").value = "TRY";

    if (id) {
      var kayit = kiralamaVerisi.find(function (k) { return k.id === id; });
      if (!kayit) return;
      el("kiralama-modal-baslik").textContent = "Kiralamayı Düzenle";
      el("kiralama-id").value = kayit.id;
      el("k-plaka").value = kayit.plaka;
      el("k-marka").value = kayit.marka;
      el("k-model").value = kayit.model;
      el("k-yil").value = kayit.yil;
      el("k-baslangic").value = kayit.baslangic;
      el("k-bitis").value = kayit.bitis;
      el("k-fiyat").value = kayit.fiyat;
      el("k-para-birimi").value = kayit.paraBirimi || "TRY";
      el("k-telefon").value = kayit.telefon || "";
      el("k-ad").value = kayit.musteriAd;
      el("k-tc").value = kayit.musteriTC;
      el("k-not").value = kayit.not || "";
      el("k-tamamlandi").checked = !!kayit.tamamlandi;
    } else {
      el("kiralama-modal-baslik").textContent = "Yeni Kiralama Ekle";
      el("kiralama-id").value = "";
    }
    kiralamaModal.classList.add("acik");
    el("k-plaka").focus();
  }
  function kiralamaModalKapat() { kiralamaModal.classList.remove("acik"); }

  function baglaKiralamaOlaylari() {
    ["kiralama-arama", "kiralama-durum-filtre", "kiralama-tarih-baslangic", "kiralama-tarih-bitis"].forEach(function (id) {
      el(id).addEventListener("input", kiralamaRenderEt);
      el(id).addEventListener("change", kiralamaRenderEt);
    });

    el("kiralama-filtre-temizle").addEventListener("click", function () {
      el("kiralama-arama").value = "";
      el("kiralama-durum-filtre").value = "";
      el("kiralama-tarih-baslangic").value = "";
      el("kiralama-tarih-bitis").value = "";
      kiralamaRenderEt();
    });

    document.querySelectorAll('#bolum-kiralamalar thead th[data-alan]').forEach(function (th) {
      th.addEventListener("click", function () {
        var alan = th.getAttribute("data-alan");
        if (kSiralama.alan === alan) kSiralama.yon = kSiralama.yon === "asc" ? "desc" : "asc";
        else { kSiralama.alan = alan; kSiralama.yon = "asc"; }
        kiralamaRenderEt();
      });
    });

    el("kiralama-ekle-btn").addEventListener("click", function () { kiralamaModalAc(null); });

    el("kiralama-tablo-govde").addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      var id = tr.getAttribute("data-id");

      if (e.target.matches('input[data-eylem="tik"]')) {
        var yeniDeger = e.target.checked;
        apiGonder("/api/kiralamalar/" + id + "/tamamlandi", "PATCH", { tamamlandi: yeniDeger }).then(function (sonuc) {
          if (sonuc.durum === 200) {
            var item = kiralamaVerisi.find(function (k) { return k.id === id; });
            if (item) item.tamamlandi = yeniDeger;
            tumRenderEt();
            bildirimGoster(yeniDeger ? "Kiralama tamamlandı olarak işaretlendi." : "Kiralama yeniden devam ediyor olarak işaretlendi.");
          } else {
            e.target.checked = !yeniDeger;
            bildirimGoster("İşlem gerçekleştirilemedi.", "sil");
          }
        }).catch(function () { e.target.checked = !yeniDeger; });
        return;
      }

      var btn = e.target.closest("button[data-eylem]");
      if (!btn) return;
      var eylem = btn.getAttribute("data-eylem");
      if (eylem === "duzenle") kiralamaModalAc(id);
      if (eylem === "sil") {
        var kayit = kiralamaVerisi.find(function (k) { return k.id === id; });
        if (!kayit) return;
        if (!window.confirm(kayit.plaka + " plakalı kiralama kaydı silinsin mi? Bu işlem geri alınamaz.")) return;
        apiGonder("/api/kiralamalar/" + id, "DELETE").then(function (sonuc) {
          if (sonuc.durum === 200) { veriYenile(); bildirimGoster("Kiralama kaydı silindi.", "sil"); }
          else bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Silinemedi.", "sil");
        });
      }
    });

    kiralamaForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var kaydetBtn = el("kiralama-kaydet-btn");
      kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor…";

      var govde = {
        plaka: el("k-plaka").value.trim(),
        marka: el("k-marka").value.trim(),
        model: el("k-model").value.trim(),
        yil: Number(el("k-yil").value),
        baslangic: el("k-baslangic").value,
        bitis: el("k-bitis").value,
        fiyat: Number(el("k-fiyat").value),
        paraBirimi: el("k-para-birimi").value,
        musteriAd: el("k-ad").value.trim(),
        musteriTC: el("k-tc").value.trim(),
        telefon: el("k-telefon").value.trim(),
        not: el("k-not").value.trim(),
        tamamlandi: el("k-tamamlandi").checked
      };

      var mevcutId = el("kiralama-id").value;
      var istek = mevcutId ? apiGonder("/api/kiralamalar/" + mevcutId, "PUT", govde) : apiGonder("/api/kiralamalar", "POST", govde);

      istek.then(function (sonuc) {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
        if (sonuc.durum === 200 || sonuc.durum === 201) {
          kiralamaModalKapat();
          veriYenile();
          bildirimGoster(mevcutId ? "Kiralama güncellendi." : "Yeni kiralama eklendi.");
          return;
        }
        if (sonuc.durum === 422) {
          kiralamaFormHatalariUygula(sonuc.veri.hatalar);
          bildirimGoster("Lütfen işaretli alanları kontrol edin.", "sil");
          return;
        }
        bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Bir hata oluştu.", "sil");
      }).catch(function () {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
      });
    });
  }

  /* =========================================================
     TUR REZERVASYONLARI
     ========================================================= */

  var tSiralama = { alan: "baslangic", yon: "desc" };

  var tAlanEslesme = {
    guzergah: "t-guzergah", arac: "t-arac", sofor: "t-sofor",
    baslangic: "t-baslangic", bitis: "t-bitis", fiyat: "t-fiyat", paraBirimi: "t-para-birimi"
  };

  function turFiltreliListe() {
    var liste = turVerisi.slice();
    var arama = el("tur-arama").value.trim().toLowerCase();
    var durum = el("tur-durum-filtre").value;
    var tarihBas = el("tur-tarih-baslangic").value;
    var tarihBit = el("tur-tarih-bitis").value;

    liste = liste.filter(function (t) {
      if (arama) {
        var hedef = (t.guzergah + " " + t.arac + " " + t.sofor + " " + (t.musteri || "")).toLowerCase();
        if (hedef.indexOf(arama) === -1) return false;
      }
      if (durum === "devam" && t.tamamlandi) return false;
      if (durum === "tamamlandi" && !t.tamamlandi) return false;
      if (tarihBas && t.baslangic < tarihBas) return false;
      if (tarihBit && t.bitis > tarihBit) return false;
      return true;
    });

    liste.sort(function (a, b) {
      var av = a[tSiralama.alan], bv = b[tSiralama.alan];
      if (tSiralama.alan === "fiyat") { av = Number(a.fiyat); bv = Number(b.fiyat); }
      if (tSiralama.alan === "durum") { av = a.tamamlandi ? 1 : 0; bv = b.tamamlandi ? 1 : 0; }
      if (av < bv) return tSiralama.yon === "asc" ? -1 : 1;
      if (av > bv) return tSiralama.yon === "asc" ? 1 : -1;
      return 0;
    });

    return liste;
  }

  function turRenderEt() {
    var liste = turFiltreliListe();
    var govde = el("tur-tablo-govde");
    var bosDurum = el("tur-bos-durum");

    if (liste.length === 0) {
      govde.innerHTML = "";
      bosDurum.hidden = false;
    } else {
      bosDurum.hidden = true;
      govde.innerHTML = liste.map(function (t) {
        return (
          '<tr class="' + (t.tamamlandi ? "tamamlandi-satir" : "") + '" data-id="' + escapeHTML(t.id) + '">' +
            '<td><span class="metin-vurgu">' + escapeHTML(t.guzergah) + "</span>" + (t.musteri ? '<br><span class="yardim-metin">' + escapeHTML(t.musteri) + "</span>" : "") + "</td>" +
            "<td>" + escapeHTML(t.arac) + "</td>" +
            "<td>" + escapeHTML(t.sofor) + "</td>" +
            '<td class="mono">' + formatTarihAraligi(t.baslangic, t.bitis) + "</td>" +
            '<td class="mono">' + formatTutar(t.fiyat, t.paraBirimi) + "</td>" +
            "<td>" + (t.tamamlandi
              ? '<span class="durum-rozet tamam">Tamamlandı</span>'
              : '<span class="durum-rozet devam">Planlandı</span>') + "</td>" +
            '<td><input type="checkbox" class="tik-kutu" data-eylem="tik" ' + (t.tamamlandi ? "checked" : "") + "></td>" +
            '<td class="satir-eylem">' +
              '<button class="simge-btn" data-eylem="duzenle" type="button" title="Düzenle">✎</button>' +
              '<button class="simge-btn sil" data-eylem="sil" type="button" title="Sil">🗑</button>' +
            "</td>" +
          "</tr>"
        );
      }).join("");
    }

    document.querySelectorAll('#bolum-turlar thead th[data-alan]').forEach(function (th) {
      th.classList.toggle("aktif-siralama", th.getAttribute("data-alan") === tSiralama.alan);
    });
  }

  function turFormHatalariUygula(hatalar) {
    document.querySelectorAll("#tur-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });
    var ilk = null;
    (hatalar || []).forEach(function (alanAdi) {
      var girdiId = tAlanEslesme[alanAdi];
      if (!girdiId) return;
      var girdi = el(girdiId);
      if (!girdi) return;
      var sarici = girdi.closest(".alan-form");
      if (sarici) { sarici.classList.add("gecersiz"); if (!ilk) ilk = girdi; }
    });
    if (ilk) ilk.focus();
  }

  var turModal = el("tur-modal");
  var turForm = el("tur-form");

  function turModalAc(id) {
    turForm.reset();
    document.querySelectorAll("#tur-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });
    el("t-para-birimi").value = "TRY";

    if (id) {
      var kayit = turVerisi.find(function (t) { return t.id === id; });
      if (!kayit) return;
      el("tur-modal-baslik").textContent = "Turu Düzenle";
      el("tur-id").value = kayit.id;
      el("t-guzergah").value = kayit.guzergah;
      el("t-arac").value = kayit.arac;
      el("t-sofor").value = kayit.sofor;
      el("t-baslangic").value = kayit.baslangic;
      el("t-bitis").value = kayit.bitis;
      el("t-fiyat").value = kayit.fiyat;
      el("t-para-birimi").value = kayit.paraBirimi || "TRY";
      el("t-musteri").value = kayit.musteri || "";
      el("t-tamamlandi").checked = !!kayit.tamamlandi;
    } else {
      el("tur-modal-baslik").textContent = "Yeni Tur Ekle";
      el("tur-id").value = "";
    }
    turModal.classList.add("acik");
    el("t-guzergah").focus();
  }
  function turModalKapat() { turModal.classList.remove("acik"); }

  function baglaTurOlaylari() {
    ["tur-arama", "tur-durum-filtre", "tur-tarih-baslangic", "tur-tarih-bitis"].forEach(function (id) {
      el(id).addEventListener("input", turRenderEt);
      el(id).addEventListener("change", turRenderEt);
    });

    el("tur-filtre-temizle").addEventListener("click", function () {
      el("tur-arama").value = "";
      el("tur-durum-filtre").value = "";
      el("tur-tarih-baslangic").value = "";
      el("tur-tarih-bitis").value = "";
      turRenderEt();
    });

    document.querySelectorAll('#bolum-turlar thead th[data-alan]').forEach(function (th) {
      th.addEventListener("click", function () {
        var alan = th.getAttribute("data-alan");
        if (tSiralama.alan === alan) tSiralama.yon = tSiralama.yon === "asc" ? "desc" : "asc";
        else { tSiralama.alan = alan; tSiralama.yon = "asc"; }
        turRenderEt();
      });
    });

    el("tur-ekle-btn").addEventListener("click", function () { turModalAc(null); });

    el("tur-tablo-govde").addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      var id = tr.getAttribute("data-id");

      if (e.target.matches('input[data-eylem="tik"]')) {
        var yeniDeger = e.target.checked;
        apiGonder("/api/turlar/" + id + "/tamamlandi", "PATCH", { tamamlandi: yeniDeger }).then(function (sonuc) {
          if (sonuc.durum === 200) {
            var item = turVerisi.find(function (t) { return t.id === id; });
            if (item) item.tamamlandi = yeniDeger;
            tumRenderEt();
            bildirimGoster(yeniDeger ? "Tur tamamlandı olarak işaretlendi." : "Tur yeniden planlandı olarak işaretlendi.");
          } else {
            e.target.checked = !yeniDeger;
            bildirimGoster("İşlem gerçekleştirilemedi.", "sil");
          }
        }).catch(function () { e.target.checked = !yeniDeger; });
        return;
      }

      var btn = e.target.closest("button[data-eylem]");
      if (!btn) return;
      var eylem = btn.getAttribute("data-eylem");
      if (eylem === "duzenle") turModalAc(id);
      if (eylem === "sil") {
        var kayit = turVerisi.find(function (t) { return t.id === id; });
        if (!kayit) return;
        if (!window.confirm(kayit.guzergah + " turu silinsin mi? Bu işlem geri alınamaz.")) return;
        apiGonder("/api/turlar/" + id, "DELETE").then(function (sonuc) {
          if (sonuc.durum === 200) { veriYenile(); bildirimGoster("Tur kaydı silindi.", "sil"); }
          else bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Silinemedi.", "sil");
        });
      }
    });

    turForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var kaydetBtn = el("tur-kaydet-btn");
      kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor…";

      var govde = {
        guzergah: el("t-guzergah").value.trim(),
        arac: el("t-arac").value.trim(),
        sofor: el("t-sofor").value.trim(),
        baslangic: el("t-baslangic").value,
        bitis: el("t-bitis").value,
        fiyat: Number(el("t-fiyat").value),
        paraBirimi: el("t-para-birimi").value,
        musteri: el("t-musteri").value.trim(),
        tamamlandi: el("t-tamamlandi").checked
      };

      var mevcutId = el("tur-id").value;
      var istek = mevcutId ? apiGonder("/api/turlar/" + mevcutId, "PUT", govde) : apiGonder("/api/turlar", "POST", govde);

      istek.then(function (sonuc) {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
        if (sonuc.durum === 200 || sonuc.durum === 201) {
          turModalKapat();
          veriYenile();
          bildirimGoster(mevcutId ? "Tur güncellendi." : "Yeni tur eklendi.");
          return;
        }
        if (sonuc.durum === 422) {
          turFormHatalariUygula(sonuc.veri.hatalar);
          bildirimGoster("Lütfen işaretli alanları kontrol edin.", "sil");
          return;
        }
        bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Bir hata oluştu.", "sil");
      }).catch(function () {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
      });
    });
  }

  /* ---------- Modal ortak davranışlar ---------- */

  function baglaModalOrtak() {
    document.querySelectorAll("[data-kapat]").forEach(function (elm) {
      elm.addEventListener("click", function () { el(elm.getAttribute("data-kapat")).classList.remove("acik"); });
    });
    document.querySelectorAll(".modal-katman").forEach(function (katman) {
      katman.addEventListener("click", function (e) { if (e.target === katman) katman.classList.remove("acik"); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") document.querySelectorAll(".modal-katman.acik").forEach(function (m) { m.classList.remove("acik"); });
    });
  }

  /* =========================================================
     ÖZET
     ========================================================= */

  function ozetRenderEt() {
    var aktifKiralama = kiralamaVerisi.filter(function (k) { return !k.tamamlandi; }).length;
    var planliTur = turVerisi.filter(function (t) { return !t.tamamlandi; }).length;

    var toplamTRY = 0, toplamUSD = 0;
    function topla(liste) {
      liste.forEach(function (x) {
        if (x.paraBirimi === "USD") toplamUSD += Number(x.fiyat) || 0;
        else toplamTRY += Number(x.fiyat) || 0;
      });
    }
    topla(kiralamaVerisi); topla(turVerisi);

    el("ist-aktif-kiralama").textContent = aktifKiralama;
    el("ist-planli-tur").textContent = planliTur;
    el("ist-bekleyen").textContent = aktifKiralama + planliTur;
    el("ist-ciro").textContent = formatTutar(toplamTRY, "TRY") + (toplamUSD > 0 ? " + " + formatTutar(toplamUSD, "USD") : "");

    var birlesik = kiralamaVerisi.filter(function (k) { return !k.tamamlandi; }).map(function (k) {
      return { tur: "Kiralama", detay: k.plaka + " · " + k.marka + " " + k.model, bas: k.baslangic, bit: k.bitis, fiyat: k.fiyat, paraBirimi: k.paraBirimi };
    }).concat(turVerisi.filter(function (t) { return !t.tamamlandi; }).map(function (t) {
      return { tur: "Tur", detay: t.guzergah, bas: t.baslangic, bit: t.bitis, fiyat: t.fiyat, paraBirimi: t.paraBirimi };
    }));

    birlesik.sort(function (a, b) { return a.bas < b.bas ? -1 : a.bas > b.bas ? 1 : 0; });
    birlesik = birlesik.slice(0, 8);

    var govde = el("ozet-tablo-govde");
    if (birlesik.length === 0) {
      govde.innerHTML = '<tr><td colspan="5" class="bos-durum">Şu anda devam eden veya planlanan bir işlem yok.</td></tr>';
    } else {
      govde.innerHTML = birlesik.map(function (o) {
        return (
          "<tr>" +
            "<td>" + escapeHTML(o.tur) + "</td>" +
            "<td>" + escapeHTML(o.detay) + "</td>" +
            '<td class="mono">' + formatTarihAraligi(o.bas, o.bit) + "</td>" +
            '<td class="mono">' + formatTutar(o.fiyat, o.paraBirimi) + "</td>" +
            '<td><span class="durum-rozet devam">Devam Ediyor</span></td>' +
          "</tr>"
        );
      }).join("");
    }
  }

  /* =========================================================
     TAKVİM
     ========================================================= */

  var takvim = { yil: 0, ay: 0, secili: "" };

  var TAKVIM_ETIKET_METNI = { "kir-bas": "Çıkış", "kir-bit": "Dönüş", "tur-gidis": "Tur Gidiş", "tur-donus": "Tur Dönüş" };

  function takvimOlaylariTopla() {
    var harita = {};
    function ekle(iso, sinif, kisaEtiket, tamMetin) {
      if (!iso) return;
      if (!harita[iso]) harita[iso] = [];
      harita[iso].push({ sinif: sinif, kisaEtiket: kisaEtiket, tamMetin: tamMetin });
    }
    kiralamaVerisi.forEach(function (k) {
      var ozet = k.marka + " " + k.model + " (" + k.plaka + ") — " + k.musteriAd + " · " + formatTutar(k.fiyat, k.paraBirimi);
      ekle(k.baslangic, "kir-bas", k.plaka, ozet);
      ekle(k.bitis, "kir-bit", k.plaka, ozet);
    });
    turVerisi.forEach(function (t) {
      var ozet = t.guzergah + " — " + t.sofor + " · " + t.arac + " · " + formatTutar(t.fiyat, t.paraBirimi);
      ekle(t.baslangic, "tur-gidis", t.guzergah, ozet);
      if (t.bitis !== t.baslangic) ekle(t.bitis, "tur-donus", t.guzergah, ozet);
    });
    return harita;
  }

  function takvimRenderEt() {
    var izgara = el("takvim-izgara");
    if (!izgara) return;

    var yil = takvim.yil, ay = takvim.ay;
    var ilkGun = new Date(yil, ay, 1);
    var haftaBasiIndex = (ilkGun.getDay() + 6) % 7; // 0 = Pazartesi
    var ayinGunSayisi = new Date(yil, ay + 1, 0).getDate();
    var toplamHucre = Math.ceil((haftaBasiIndex + ayinGunSayisi) / 7) * 7;
    var bugun = bugunISO();
    var olaylar = takvimOlaylariTopla();

    var html = "";
    for (var i = 0; i < toplamHucre; i++) {
      var tarih = new Date(yil, ay, 1 - haftaBasiIndex + i);
      var iso = tarihToISO(tarih);
      var buAyMi = tarih.getMonth() === ay;
      var siniflar = ["takvim-hucre"];
      if (!buAyMi) siniflar.push("bu-ay-degil");
      if (iso === bugun) siniflar.push("bugun");
      if (iso === takvim.secili) siniflar.push("secili");

      var gunOlaylari = olaylar[iso] || [];
      var pillHtml = "";
      gunOlaylari.slice(0, 2).forEach(function (o) {
        pillHtml += '<span class="takvim-etiket ' + o.sinif + '">' + escapeHTML(o.kisaEtiket) + "</span>";
      });
      if (gunOlaylari.length > 2) pillHtml += '<span class="takvim-daha">+' + (gunOlaylari.length - 2) + " daha</span>";

      html += '<button type="button" class="' + siniflar.join(" ") + '" data-tarih="' + iso + '">' +
                '<span class="takvim-gun-no">' + tarih.getDate() + "</span>" +
                '<span class="takvim-etiketler">' + pillHtml + "</span>" +
              "</button>";
    }
    izgara.innerHTML = html;
    el("takvim-ay-baslik").textContent = ilkGun.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });

    takvimDetayRenderEt(olaylar);
  }

  function takvimDetayRenderEt(olaylar) {
    var liste = (olaylar || takvimOlaylariTopla())[takvim.secili] || [];
    var baslikEl = el("takvim-detay-baslik");
    if (baslikEl) {
      baslikEl.textContent = takvim.secili === bugunISO() ? "Bugünün işlemleri" : formatTarih(takvim.secili) + " tarihindeki işlemler";
    }
    var listeEl = el("takvim-detay-liste");
    if (!listeEl) return;
    if (liste.length === 0) {
      listeEl.innerHTML = '<div class="takvim-detay-bos">Bu tarihte planlı bir işlem yok.</div>';
      return;
    }
    listeEl.innerHTML = liste.map(function (o) {
      return (
        '<div class="takvim-detay-satir">' +
          '<span class="takvim-detay-etiket ' + o.sinif + '">' + TAKVIM_ETIKET_METNI[o.sinif] + "</span>" +
          "<span>" + escapeHTML(o.tamMetin) + "</span>" +
        "</div>"
      );
    }).join("");
  }

  function baglaTakvimOlaylari() {
    var onceki = el("takvim-onceki"), sonraki = el("takvim-sonraki"), bugunBtn = el("takvim-bugun"), izgara = el("takvim-izgara");
    if (!izgara) return;

    onceki.addEventListener("click", function () {
      takvim.ay -= 1;
      if (takvim.ay < 0) { takvim.ay = 11; takvim.yil -= 1; }
      takvimRenderEt();
    });
    sonraki.addEventListener("click", function () {
      takvim.ay += 1;
      if (takvim.ay > 11) { takvim.ay = 0; takvim.yil += 1; }
      takvimRenderEt();
    });
    bugunBtn.addEventListener("click", function () {
      var d = new Date();
      takvim.yil = d.getFullYear(); takvim.ay = d.getMonth(); takvim.secili = bugunISO();
      takvimRenderEt();
    });
    izgara.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-tarih]");
      if (!btn) return;
      takvim.secili = btn.getAttribute("data-tarih");
      takvimRenderEt();
    });
  }

  /* =========================================================
     ARAÇLAR (filo)
     ========================================================= */

  var aracModal = el("arac-modal");
  var aracForm = el("arac-form");
  var aracSeciliFotoBase64; // yeni seçilen fotoğraf (henüz kaydedilmedi); tanımsızsa "değiştirilmedi"

  function aracDisaridaMi(arac) {
    var kiralamada = kiralamaVerisi.some(function (k) { return !k.tamamlandi && k.plaka === arac.plaka; });
    var turda = turVerisi.some(function (t) { return !t.tamamlandi && t.arac.indexOf(arac.plaka) !== -1; });
    return kiralamada || turda;
  }

  function araclarRenderEt() {
    var izgara = el("arac-izgara");
    if (!izgara) return;
    var bosDurum = el("arac-bos-durum");

    if (aracVerisi.length === 0) {
      izgara.innerHTML = "";
      if (bosDurum) bosDurum.hidden = false;
      return;
    }
    if (bosDurum) bosDurum.hidden = true;

    var liste = aracVerisi.slice().sort(function (a, b) { return a.plaka.localeCompare(b.plaka, "tr"); });

    izgara.innerHTML = liste.map(function (a) {
      var disarida = aracDisaridaMi(a);
      var fotoSrc = a.fotoYolu ? a.fotoYolu : "img/arac-yok.svg";
      return (
        '<div class="arac-kart" data-id="' + escapeHTML(a.id) + '">' +
          '<div class="arac-kart-foto"><img src="' + escapeHTML(fotoSrc) + '" alt="' + escapeHTML(a.plaka) + '"></div>' +
          '<div class="arac-kart-govde">' +
            '<span class="plaka-etiket">' + escapeHTML(a.plaka) + "</span>" +
            '<span class="arac-kart-model">' + escapeHTML(a.marka) + " " + escapeHTML(a.model) + " (" + escapeHTML(a.yil) + ")</span>" +
            '<div class="arac-kart-alt">' +
              (disarida ? '<span class="durum-rozet devam">Dışarıda</span>' : '<span class="durum-rozet tamam">Müsait</span>') +
            "</div>" +
          "</div>" +
          '<div class="arac-kart-eylem">' +
            '<button class="simge-btn" data-eylem="duzenle" type="button" title="Düzenle">✎ Düzenle</button>' +
            '<button class="simge-btn sil" data-eylem="sil" type="button" title="Sil">🗑</button>' +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  function aracModalAc(id) {
    aracForm.reset();
    aracSeciliFotoBase64 = undefined;
    document.querySelectorAll("#arac-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });

    if (id) {
      var kayit = aracVerisi.find(function (a) { return a.id === id; });
      if (!kayit) return;
      el("arac-modal-baslik").textContent = "Aracı Düzenle";
      el("arac-id").value = kayit.id;
      el("a-plaka").value = kayit.plaka;
      el("a-marka").value = kayit.marka;
      el("a-model").value = kayit.model;
      el("a-yil").value = kayit.yil;
      el("a-foto-onizleme").src = kayit.fotoYolu ? kayit.fotoYolu : "img/arac-yok.svg";
    } else {
      el("arac-modal-baslik").textContent = "Yeni Araç Ekle";
      el("arac-id").value = "";
      el("a-foto-onizleme").src = "img/arac-yok.svg";
    }
    aracModal.classList.add("acik");
    el("a-plaka").focus();
  }
  function aracModalKapat() { aracModal.classList.remove("acik"); }

  var ARAC_ALAN_ESLESME = { plaka: "a-plaka", marka: "a-marka", model: "a-model", yil: "a-yil" };
  function aracFormHatalariUygula(hatalar) {
    document.querySelectorAll("#arac-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });
    var ilk = null;
    (hatalar || []).forEach(function (alanAdi) {
      var girdiId = ARAC_ALAN_ESLESME[alanAdi];
      if (!girdiId) return;
      var girdi = el(girdiId);
      if (!girdi) return;
      var sarici = girdi.closest(".alan-form");
      if (sarici) { sarici.classList.add("gecersiz"); if (!ilk) ilk = girdi; }
    });
    if (ilk) ilk.focus();
  }

  function baglaAracOlaylari() {
    var ekleBtn = el("arac-ekle-btn");
    if (!ekleBtn) return;
    ekleBtn.addEventListener("click", function () { aracModalAc(null); });

    el("a-foto-girdi").addEventListener("change", function (e) {
      var dosya = e.target.files && e.target.files[0];
      if (!dosya) return;
      if (!/^image\/(jpeg|png|webp)$/.test(dosya.type)) {
        bildirimGoster("Yalnızca JPG, PNG veya WEBP fotoğraf seçebilirsiniz.", "sil");
        e.target.value = "";
        return;
      }
      resimSikistir(dosya, 900, 0.82).then(function (dataUrl) {
        aracSeciliFotoBase64 = dataUrl;
        el("a-foto-onizleme").src = dataUrl;
      }).catch(function () {
        bildirimGoster("Fotoğraf işlenemedi, lütfen başka bir dosya deneyin.", "sil");
      });
    });

    el("arac-izgara").addEventListener("click", function (e) {
      var kart = e.target.closest(".arac-kart[data-id]");
      if (!kart) return;
      var id = kart.getAttribute("data-id");
      var btn = e.target.closest("button[data-eylem]");
      if (!btn) return;
      var eylem = btn.getAttribute("data-eylem");
      if (eylem === "duzenle") aracModalAc(id);
      if (eylem === "sil") {
        var kayit = aracVerisi.find(function (a) { return a.id === id; });
        if (!kayit) return;
        if (!window.confirm(kayit.plaka + " plakalı araç filodan silinsin mi? Geçmiş kiralama/tur kayıtları etkilenmez.")) return;
        apiGonder("/api/araclar/" + id, "DELETE").then(function (sonuc) {
          if (sonuc.durum === 200) { veriYenile(); bildirimGoster("Araç silindi.", "sil"); }
          else bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Silinemedi.", "sil");
        });
      }
    });

    aracForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var kaydetBtn = el("arac-kaydet-btn");
      kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor…";

      var govde = {
        plaka: el("a-plaka").value.trim(),
        marka: el("a-marka").value.trim(),
        model: el("a-model").value.trim(),
        yil: Number(el("a-yil").value)
      };
      if (aracSeciliFotoBase64) govde.fotoBase64 = aracSeciliFotoBase64;

      var mevcutId = el("arac-id").value;
      var istek = mevcutId ? apiGonder("/api/araclar/" + mevcutId, "PUT", govde) : apiGonder("/api/araclar", "POST", govde);

      istek.then(function (sonuc) {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
        if (sonuc.durum === 200 || sonuc.durum === 201) {
          aracModalKapat();
          veriYenile();
          bildirimGoster(mevcutId ? "Araç güncellendi." : "Yeni araç eklendi.");
          return;
        }
        if (sonuc.durum === 422) {
          aracFormHatalariUygula(sonuc.veri.hatalar);
          bildirimGoster("Lütfen işaretli alanları kontrol edin.", "sil");
          return;
        }
        bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Bir hata oluştu.", "sil");
      }).catch(function () {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
      });
    });
  }

  /* =========================================================
     ŞOFÖRLER
     ========================================================= */

  var soforModal = el("sofor-modal");
  var soforForm = el("sofor-form");

  function soforlerRenderEt() {
    var govde = el("sofor-tablo-govde");
    if (!govde) return;
    var bosDurum = el("sofor-bos-durum");

    if (soforVerisi.length === 0) {
      govde.innerHTML = "";
      if (bosDurum) bosDurum.hidden = false;
      return;
    }
    if (bosDurum) bosDurum.hidden = true;

    var liste = soforVerisi.slice().sort(function (a, b) { return a.adSoyad.localeCompare(b.adSoyad, "tr"); });

    govde.innerHTML = liste.map(function (s) {
      return (
        '<tr data-id="' + escapeHTML(s.id) + '">' +
          "<td>" + escapeHTML(s.adSoyad) + "</td>" +
          "<td>" + (s.telefon ? escapeHTML(s.telefon) : '<span class="yardim-metin">—</span>') + "</td>" +
          '<td class="satir-eylem">' +
            '<button class="simge-btn" data-eylem="duzenle" type="button" title="Düzenle">✎</button>' +
            '<button class="simge-btn sil" data-eylem="sil" type="button" title="Sil">🗑</button>' +
          "</td>" +
        "</tr>"
      );
    }).join("");
  }

  function soforModalAc(id) {
    soforForm.reset();
    document.querySelectorAll("#sofor-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });

    if (id) {
      var kayit = soforVerisi.find(function (s) { return s.id === id; });
      if (!kayit) return;
      el("sofor-modal-baslik").textContent = "Şoförü Düzenle";
      el("sofor-id").value = kayit.id;
      el("s-ad").value = kayit.adSoyad;
      el("s-telefon").value = kayit.telefon || "";
    } else {
      el("sofor-modal-baslik").textContent = "Yeni Şoför Ekle";
      el("sofor-id").value = "";
    }
    soforModal.classList.add("acik");
    el("s-ad").focus();
  }
  function soforModalKapat() { soforModal.classList.remove("acik"); }

  function soforFormHatalariUygula(hatalar) {
    document.querySelectorAll("#sofor-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });
    var ilk = null;
    (hatalar || []).forEach(function (alanAdi) {
      if (alanAdi !== "adSoyad") return;
      var girdi = el("s-ad");
      var sarici = girdi.closest(".alan-form");
      if (sarici) { sarici.classList.add("gecersiz"); ilk = girdi; }
    });
    if (ilk) ilk.focus();
  }

  function baglaSoforOlaylari() {
    var ekleBtn = el("sofor-ekle-btn");
    if (!ekleBtn) return;
    ekleBtn.addEventListener("click", function () { soforModalAc(null); });

    el("sofor-tablo-govde").addEventListener("click", function (e) {
      var tr = e.target.closest("tr[data-id]");
      if (!tr) return;
      var id = tr.getAttribute("data-id");
      var btn = e.target.closest("button[data-eylem]");
      if (!btn) return;
      var eylem = btn.getAttribute("data-eylem");
      if (eylem === "duzenle") soforModalAc(id);
      if (eylem === "sil") {
        var kayit = soforVerisi.find(function (s) { return s.id === id; });
        if (!kayit) return;
        if (!window.confirm(kayit.adSoyad + " şoförler listesinden silinsin mi? Geçmiş tur kayıtları etkilenmez.")) return;
        apiGonder("/api/soforler/" + id, "DELETE").then(function (sonuc) {
          if (sonuc.durum === 200) { veriYenile(); bildirimGoster("Şoför silindi.", "sil"); }
          else bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Silinemedi.", "sil");
        });
      }
    });

    soforForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var kaydetBtn = el("sofor-kaydet-btn");
      kaydetBtn.disabled = true; kaydetBtn.textContent = "Kaydediliyor…";

      var govde = { adSoyad: el("s-ad").value.trim(), telefon: el("s-telefon").value.trim() };
      var mevcutId = el("sofor-id").value;
      var istek = mevcutId ? apiGonder("/api/soforler/" + mevcutId, "PUT", govde) : apiGonder("/api/soforler", "POST", govde);

      istek.then(function (sonuc) {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
        if (sonuc.durum === 200 || sonuc.durum === 201) {
          soforModalKapat();
          veriYenile();
          bildirimGoster(mevcutId ? "Şoför güncellendi." : "Yeni şoför eklendi.");
          return;
        }
        if (sonuc.durum === 422) {
          soforFormHatalariUygula(sonuc.veri.hatalar);
          bildirimGoster("Lütfen işaretli alanları kontrol edin.", "sil");
          return;
        }
        bildirimGoster((sonuc.veri && sonuc.veri.mesaj) || "Bir hata oluştu.", "sil");
      }).catch(function () {
        kaydetBtn.disabled = false; kaydetBtn.textContent = "Kaydet";
      });
    });
  }

  /* =========================================================
     KİRALAMA / TUR FORMLARINDAKİ ARAÇ-ŞOFÖR SEÇİCİLER
     ========================================================= */

  function aracSecicileriDoldur() {
    var liste = aracVerisi.slice().sort(function (a, b) { return a.plaka.localeCompare(b.plaka, "tr"); });
    var secenekHtml = liste.map(function (a) {
      return '<option value="' + escapeHTML(a.id) + '">' + escapeHTML(a.plaka) + " — " + escapeHTML(a.marka) + " " + escapeHTML(a.model) + " (" + escapeHTML(a.yil) + ")</option>";
    }).join("");

    [el("k-arac-sec"), el("t-arac-sec")].forEach(function (secim) {
      if (!secim) return;
      var oncekiDeger = secim.value;
      secim.innerHTML = '<option value="">— Listede yok / elle gir —</option>' + secenekHtml;
      if (liste.some(function (a) { return a.id === oncekiDeger; })) secim.value = oncekiDeger;
    });

    var soforListe = soforVerisi.slice().sort(function (a, b) { return a.adSoyad.localeCompare(b.adSoyad, "tr"); });
    var soforSecenekHtml = soforListe.map(function (s) {
      return '<option value="' + escapeHTML(s.id) + '">' + escapeHTML(s.adSoyad) + "</option>";
    }).join("");
    var soforSecim = el("t-sofor-sec");
    if (soforSecim) {
      var oncekiSoforDeger = soforSecim.value;
      soforSecim.innerHTML = '<option value="">— Listede yok / elle gir —</option>' + soforSecenekHtml;
      if (soforListe.some(function (s) { return s.id === oncekiSoforDeger; })) soforSecim.value = oncekiSoforDeger;
    }
  }

  function baglaSeciciler() {
    var kAracSec = el("k-arac-sec");
    if (kAracSec) {
      kAracSec.addEventListener("change", function () {
        var arac = aracVerisi.find(function (a) { return a.id === kAracSec.value; });
        var onizleme = el("k-arac-onizleme");
        if (!arac) { onizleme.src = "img/arac-yok.svg"; return; }
        el("k-plaka").value = arac.plaka;
        el("k-marka").value = arac.marka;
        el("k-model").value = arac.model;
        el("k-yil").value = arac.yil;
        onizleme.src = arac.fotoYolu ? arac.fotoYolu : "img/arac-yok.svg";
      });
    }

    var tAracSec = el("t-arac-sec");
    if (tAracSec) {
      tAracSec.addEventListener("change", function () {
        var arac = aracVerisi.find(function (a) { return a.id === tAracSec.value; });
        var onizleme = el("t-arac-onizleme");
        if (!arac) { onizleme.src = "img/arac-yok.svg"; return; }
        el("t-arac").value = arac.plaka + " — " + arac.marka + " " + arac.model;
        onizleme.src = arac.fotoYolu ? arac.fotoYolu : "img/arac-yok.svg";
      });
    }

    var tSoforSec = el("t-sofor-sec");
    if (tSoforSec) {
      tSoforSec.addEventListener("change", function () {
        var sofor = soforVerisi.find(function (s) { return s.id === tSoforSec.value; });
        if (!sofor) return;
        el("t-sofor").value = sofor.adSoyad;
      });
    }
  }

  /* ---------- Fotoğraf sıkıştırma (yüklemeden önce, tarayıcıda) ---------- */

  function resimSikistir(dosya, maksGenislik, kalite) {
    return new Promise(function (resolve, reject) {
      var okuyucu = new FileReader();
      okuyucu.onerror = function () { reject(new Error("okuma_hatasi")); };
      okuyucu.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error("resim_hatasi")); };
        img.onload = function () {
          var olcek = Math.min(1, maksGenislik / img.width);
          var genislik = Math.round(img.width * olcek);
          var yukseklik = Math.round(img.height * olcek);
          var tuval = document.createElement("canvas");
          tuval.width = genislik; tuval.height = yukseklik;
          var ctx = tuval.getContext("2d");
          ctx.drawImage(img, 0, 0, genislik, yukseklik);
          resolve(tuval.toDataURL("image/jpeg", kalite));
        };
        img.src = okuyucu.result;
      };
      okuyucu.readAsDataURL(dosya);
    });
  }

})();
