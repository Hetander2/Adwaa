/* =========================================================
   ADWAA TRAVEL — Panel mantığı
   -------------------------------------------------------
   Veriler tarayıcının localStorage'ında tutulur (yalnızca bu
   cihazda / bu tarayıcıda saklanır, herhangi bir sunucuya
   gönderilmez). Bu bir ön izleme/demo davranışıdır — gerçek
   kullanım için bkz. README.md.
   ========================================================= */

(function () {
  "use strict";

  /* ---------- Oturum kontrolü ---------- */
  if (sessionStorage.getItem("adwaa_oturum") !== "aktif") {
    window.location.replace("index.html");
    return;
  }

  var girisYapan = sessionStorage.getItem("adwaa_kullanici") || "Yönetici";
  var kullaniciEtiket = document.getElementById("kullanici-adi-goster");
  if (kullaniciEtiket) kullaniciEtiket.textContent = girisYapan;

  document.getElementById("cikis-btn").addEventListener("click", function () {
    sessionStorage.removeItem("adwaa_oturum");
    sessionStorage.removeItem("adwaa_kullanici");
    window.location.href = "index.html";
  });

  /* ---------- Depolama anahtarları ---------- */
  var ANAHTAR_KIRALAMA = "adwaa_kiralamalar_v1";
  var ANAHTAR_TUR = "adwaa_turlar_v1";
  var ANAHTAR_SEED = "adwaa_seed_yapildi_v1";

  /* ---------- Yardımcı fonksiyonlar ---------- */

  function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uid(onek) {
    return onek + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function tarihEkle(gun) {
    var d = new Date();
    d.setDate(d.getDate() + gun);
    return d.toISOString().slice(0, 10);
  }

  function bugunISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatTarih(iso) {
    if (!iso) return "—";
    var parcalar = iso.split("-");
    if (parcalar.length !== 3) return iso;
    return parcalar[2] + "." + parcalar[1] + "." + parcalar[0];
  }

  function formatTarihAraligi(bas, bit) {
    if (bas && bit && bas === bit) return formatTarih(bas);
    return formatTarih(bas) + " – " + formatTarih(bit);
  }

  function formatPara(sayi) {
    var n = Number(sayi) || 0;
    return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " ₺";
  }

  function tcMaskele(tc) {
    if (!tc || tc.length < 4) return "—";
    return tc.slice(0, 2) + "•••••" + tc.slice(-2);
  }

  // Resmî TC Kimlik No algoritması (11 hane, checksum doğrulaması).
  function tcGecerliMi(tc) {
    if (!/^[1-9][0-9]{10}$/.test(tc)) return false;
    var d = tc.split("").map(Number);
    var tekToplam = d[0] + d[2] + d[4] + d[6] + d[8];
    var ciftToplam = d[1] + d[3] + d[5] + d[7];
    var d10 = ((tekToplam * 7) - ciftToplam) % 10;
    if (d10 < 0) d10 += 10;
    if (d10 !== d[9]) return false;
    var ilk10Toplam = 0;
    for (var i = 0; i < 10; i++) ilk10Toplam += d[i];
    var d11 = ilk10Toplam % 10;
    return d11 === d[10];
  }

  function veriOku(anahtar) {
    try {
      var ham = localStorage.getItem(anahtar);
      return ham ? JSON.parse(ham) : [];
    } catch (e) {
      console.error("Veri okunamadı:", anahtar, e);
      return [];
    }
  }

  function veriYaz(anahtar, dizi) {
    localStorage.setItem(anahtar, JSON.stringify(dizi));
  }

  /* ---------- Örnek veri (yalnızca ilk açılışta) ---------- */

  function ornekVeriYukle() {
    if (localStorage.getItem(ANAHTAR_SEED)) return;

    var kiralamalar = [
      {
        id: uid("kir"), plaka: "61 AB 123", marka: "Renault", model: "Clio", yil: 2023,
        baslangic: bugunISO(), bitis: tarihEkle(3), fiyat: 3600,
        musteriAd: "Mehmet Yılmaz", musteriTC: "12345678950", telefon: "0555 111 22 33",
        not: "Havalimanından teslim.", tamamlandi: false, olusturulma: Date.now()
      },
      {
        id: uid("kir"), plaka: "61 CD 456", marka: "Fiat", model: "Egea", yil: 2022,
        baslangic: tarihEkle(-5), bitis: tarihEkle(-1), fiyat: 2800,
        musteriAd: "Ayşe Kaya", musteriTC: "98765432150", telefon: "0532 222 33 44",
        not: "", tamamlandi: true, olusturulma: Date.now() - 1000
      },
      {
        id: uid("kir"), plaka: "61 EF 789", marka: "Dacia", model: "Duster", yil: 2024,
        baslangic: tarihEkle(2), bitis: tarihEkle(9), fiyat: 6300,
        musteriAd: "Ali Demir", musteriTC: "11223344550", telefon: "0544 333 44 55",
        not: "Uzungöl turu için kiralandı.", tamamlandi: false, olusturulma: Date.now() - 2000
      }
    ];

    var turlar = [
      {
        id: uid("tur"), guzergah: "Uzungöl", arac: "61 AB 123", sofor: "Hasan Öz",
        baslangic: tarihEkle(1), bitis: tarihEkle(1), fiyat: 2500,
        musteri: "Grup — Uzungöl Turu A", tamamlandi: false, olusturulma: Date.now()
      },
      {
        id: uid("tur"), guzergah: "Sümela Manastırı", arac: "61 EF 789", sofor: "Kemal Aydın",
        baslangic: tarihEkle(3), bitis: tarihEkle(3), fiyat: 1800,
        musteri: "Bireysel — Fatma Şahin", tamamlandi: false, olusturulma: Date.now() - 1000
      },
      {
        id: uid("tur"), guzergah: "Ayder Yaylası", arac: "61 GH 321", sofor: "Serkan Kurt",
        baslangic: tarihEkle(-2), bitis: tarihEkle(-2), fiyat: 3200,
        musteri: "Grup — Karadeniz Turu", tamamlandi: true, olusturulma: Date.now() - 2000
      }
    ];

    veriYaz(ANAHTAR_KIRALAMA, kiralamalar);
    veriYaz(ANAHTAR_TUR, turlar);
    localStorage.setItem(ANAHTAR_SEED, "1");
  }

  ornekVeriYukle();

  /* ---------- Bildirim ---------- */
  var bildirimEl = document.getElementById("bildirim");
  var bildirimZamanlayici = null;
  function bildirimGoster(mesaj, tur) {
    bildirimEl.textContent = mesaj;
    bildirimEl.className = "bildirim gorunur" + (tur === "sil" ? " sil-turu" : "");
    clearTimeout(bildirimZamanlayici);
    bildirimZamanlayici = setTimeout(function () {
      bildirimEl.classList.remove("gorunur");
    }, 2600);
  }

  /* ---------- Sekme / bölüm gezinmesi ---------- */
  var navDugmeleri = document.querySelectorAll(".nav-oge");
  var bolumler = document.querySelectorAll(".bolum");
  navDugmeleri.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var hedef = btn.getAttribute("data-bolum");
      navDugmeleri.forEach(function (b) { b.classList.toggle("aktif", b === btn); });
      bolumler.forEach(function (b) {
        b.hidden = b.id !== "bolum-" + hedef;
      });
      if (hedef === "ozet") ozetRenderEt();
    });
  });

  var bugunEtiket = document.getElementById("bugun-tarih");
  if (bugunEtiket) {
    bugunEtiket.textContent = new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  }

  /* =========================================================
     ARAÇ KİRALAMALARI
     ========================================================= */

  var kSiralama = { alan: "baslangic", yon: "desc" };

  function kiralamaListesi() {
    return veriOku(ANAHTAR_KIRALAMA);
  }

  function kiralamaFiltreliListe() {
    var liste = kiralamaListesi();
    var arama = document.getElementById("kiralama-arama").value.trim().toLowerCase();
    var durum = document.getElementById("kiralama-durum-filtre").value;
    var tarihBas = document.getElementById("kiralama-tarih-baslangic").value;
    var tarihBit = document.getElementById("kiralama-tarih-bitis").value;

    liste = liste.filter(function (k) {
      if (arama) {
        var hedefMetin = (k.plaka + " " + k.marka + " " + k.model + " " + k.musteriAd).toLowerCase();
        if (hedefMetin.indexOf(arama) === -1) return false;
      }
      if (durum === "devam" && k.tamamlandi) return false;
      if (durum === "tamamlandi" && !k.tamamlandi) return false;
      if (tarihBas && k.baslangic < tarihBas) return false;
      if (tarihBit && k.bitis > tarihBit) return false;
      return true;
    });

    liste.sort(function (a, b) {
      var av = a[kSiralama.alan], bv = b[kSiralama.alan];
      if (kSiralama.alan === "fiyat" || kSiralama.alan === "yil") { av = Number(av); bv = Number(bv); }
      if (kSiralama.alan === "durum") { av = a.tamamlandi ? 1 : 0; bv = b.tamamlandi ? 1 : 0; }
      if (av < bv) return kSiralama.yon === "asc" ? -1 : 1;
      if (av > bv) return kSiralama.yon === "asc" ? 1 : -1;
      return 0;
    });

    return liste;
  }

  function kiralamaRenderEt() {
    var liste = kiralamaFiltreliListe();
    var govde = document.getElementById("kiralama-tablo-govde");
    var bosDurum = document.getElementById("kiralama-bos-durum");

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
            '<td class="mono">' + formatPara(k.fiyat) + "</td>" +
            "<td>" + escapeHTML(k.musteriAd) + (k.telefon ? '<br><span class="yardim" style="color:var(--ink-faint)">' + escapeHTML(k.telefon) + "</span>" : "") + "</td>" +
            '<td><span class="tc-gizli">' + escapeHTML(tcMaskele(k.musteriTC)) + "</span></td>" +
            "<td>" + (k.tamamlandi
              ? '<span class="durum-rozet tamam">Tamamlandı</span>'
              : '<span class="durum-rozet devam">Devam Ediyor</span>') + "</td>" +
            '<td><input type="checkbox" class="tik-kutu" data-eylem="tik" ' + (k.tamamlandi ? "checked" : "") + "></td>" +
            '<td class="satir-eylem">' +
              '<button class="simge-btn" data-eylem="duzenle" title="Düzenle">✎</button>' +
              '<button class="simge-btn sil" data-eylem="sil" title="Sil">🗑</button>' +
            "</td>" +
          "</tr>"
        );
      }).join("");
    }

    document.querySelectorAll('#bolum-kiralamalar thead th[data-alan]').forEach(function (th) {
      th.classList.toggle("aktif-siralama", th.getAttribute("data-alan") === kSiralama.alan);
    });

    ozetRenderEt();
  }

  document.querySelectorAll('#bolum-kiralamalar thead th[data-alan]').forEach(function (th) {
    th.addEventListener("click", function () {
      var alan = th.getAttribute("data-alan");
      if (kSiralama.alan === alan) {
        kSiralama.yon = kSiralama.yon === "asc" ? "desc" : "asc";
      } else {
        kSiralama.alan = alan;
        kSiralama.yon = "asc";
      }
      kiralamaRenderEt();
    });
  });

  ["kiralama-arama", "kiralama-durum-filtre", "kiralama-tarih-baslangic", "kiralama-tarih-bitis"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", kiralamaRenderEt);
    document.getElementById(id).addEventListener("change", kiralamaRenderEt);
  });

  document.getElementById("kiralama-filtre-temizle").addEventListener("click", function () {
    document.getElementById("kiralama-arama").value = "";
    document.getElementById("kiralama-durum-filtre").value = "";
    document.getElementById("kiralama-tarih-baslangic").value = "";
    document.getElementById("kiralama-tarih-bitis").value = "";
    kiralamaRenderEt();
  });

  document.getElementById("kiralama-tablo-govde").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-eylem]");
    var tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    var id = tr.getAttribute("data-id");

    if (e.target.matches('input[data-eylem="tik"]')) {
      kiralamaTamamlandiDegistir(id, e.target.checked);
      return;
    }
    if (!btn) return;
    var eylem = btn.getAttribute("data-eylem");
    if (eylem === "duzenle") kiralamaModalAc(id);
    if (eylem === "sil") kiralamaSil(id);
  });

  function kiralamaTamamlandiDegistir(id, deger) {
    var liste = kiralamaListesi();
    var kayit = liste.find(function (k) { return k.id === id; });
    if (!kayit) return;
    kayit.tamamlandi = deger;
    veriYaz(ANAHTAR_KIRALAMA, liste);
    kiralamaRenderEt();
    bildirimGoster(deger ? "Kiralama tamamlandı olarak işaretlendi." : "Kiralama yeniden devam ediyor olarak işaretlendi.");
  }

  function kiralamaSil(id) {
    var liste = kiralamaListesi();
    var kayit = liste.find(function (k) { return k.id === id; });
    if (!kayit) return;
    var onay = window.confirm(kayit.plaka + " plakalı kiralama kaydı silinsin mi? Bu işlem geri alınamaz.");
    if (!onay) return;
    liste = liste.filter(function (k) { return k.id !== id; });
    veriYaz(ANAHTAR_KIRALAMA, liste);
    kiralamaRenderEt();
    bildirimGoster("Kiralama kaydı silindi.", "sil");
  }

  /* ---- Kiralama modalı ---- */
  var kiralamaModal = document.getElementById("kiralama-modal");
  var kiralamaForm = document.getElementById("kiralama-form");

  function kiralamaModalAc(id) {
    kiralamaForm.reset();
    document.querySelectorAll("#kiralama-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });

    if (id) {
      var kayit = kiralamaListesi().find(function (k) { return k.id === id; });
      if (!kayit) return;
      document.getElementById("kiralama-modal-baslik").textContent = "Kiralamayı Düzenle";
      document.getElementById("kiralama-id").value = kayit.id;
      document.getElementById("k-plaka").value = kayit.plaka;
      document.getElementById("k-marka").value = kayit.marka;
      document.getElementById("k-model").value = kayit.model;
      document.getElementById("k-yil").value = kayit.yil;
      document.getElementById("k-baslangic").value = kayit.baslangic;
      document.getElementById("k-bitis").value = kayit.bitis;
      document.getElementById("k-fiyat").value = kayit.fiyat;
      document.getElementById("k-telefon").value = kayit.telefon || "";
      document.getElementById("k-ad").value = kayit.musteriAd;
      document.getElementById("k-tc").value = kayit.musteriTC;
      document.getElementById("k-not").value = kayit.not || "";
      document.getElementById("k-tamamlandi").checked = !!kayit.tamamlandi;
    } else {
      document.getElementById("kiralama-modal-baslik").textContent = "Yeni Kiralama Ekle";
      document.getElementById("kiralama-id").value = "";
    }
    kiralamaModal.classList.add("acik");
    document.getElementById("k-plaka").focus();
  }

  document.getElementById("kiralama-ekle-btn").addEventListener("click", function () { kiralamaModalAc(null); });

  kiralamaForm.addEventListener("submit", function (e) {
    e.preventDefault();

    function alanGetir(girdiId) { return document.getElementById(girdiId); }
    function gecersizIsaretle(girdiId, kosul) {
      var alan = alanGetir(girdiId).closest(".alan-form");
      alan.classList.toggle("gecersiz", kosul);
      return kosul;
    }

    var plaka = alanGetir("k-plaka").value.trim();
    var marka = alanGetir("k-marka").value.trim();
    var model = alanGetir("k-model").value.trim();
    var yil = alanGetir("k-yil").value;
    var baslangic = alanGetir("k-baslangic").value;
    var bitis = alanGetir("k-bitis").value;
    var fiyat = alanGetir("k-fiyat").value;
    var ad = alanGetir("k-ad").value.trim();
    var tc = alanGetir("k-tc").value.trim();

    var hataVar = false;
    if (gecersizIsaretle("k-plaka", !plaka)) hataVar = true;
    if (gecersizIsaretle("k-marka", !marka)) hataVar = true;
    if (gecersizIsaretle("k-model", !model)) hataVar = true;
    if (gecersizIsaretle("k-yil", !yil || yil < 1990 || yil > 2030)) hataVar = true;
    if (gecersizIsaretle("k-baslangic", !baslangic)) hataVar = true;
    if (gecersizIsaretle("k-bitis", !bitis || (baslangic && bitis < baslangic))) hataVar = true;
    if (gecersizIsaretle("k-fiyat", fiyat === "" || Number(fiyat) < 0)) hataVar = true;
    if (gecersizIsaretle("k-ad", !ad)) hataVar = true;
    if (gecersizIsaretle("k-tc", !tcGecerliMi(tc))) hataVar = true;

    if (hataVar) {
      bildirimGoster("Lütfen işaretli alanları kontrol edin.", "sil");
      return;
    }

    var liste = kiralamaListesi();
    var mevcutId = document.getElementById("kiralama-id").value;

    var kayit = {
      plaka: plaka, marka: marka, model: model, yil: Number(yil),
      baslangic: baslangic, bitis: bitis, fiyat: Number(fiyat),
      musteriAd: ad, musteriTC: tc,
      telefon: alanGetir("k-telefon").value.trim(),
      not: alanGetir("k-not").value.trim(),
      tamamlandi: alanGetir("k-tamamlandi").checked
    };

    if (mevcutId) {
      var index = liste.findIndex(function (k) { return k.id === mevcutId; });
      if (index !== -1) {
        kayit.id = mevcutId;
        kayit.olusturulma = liste[index].olusturulma;
        liste[index] = kayit;
      }
    } else {
      kayit.id = uid("kir");
      kayit.olusturulma = Date.now();
      liste.push(kayit);
    }

    veriYaz(ANAHTAR_KIRALAMA, liste);
    kiralamaModalKapat();
    kiralamaRenderEt();
    bildirimGoster(mevcutId ? "Kiralama güncellendi." : "Yeni kiralama eklendi.");
  });

  function kiralamaModalKapat() { kiralamaModal.classList.remove("acik"); }

  /* =========================================================
     TUR REZERVASYONLARI
     ========================================================= */

  var tSiralama = { alan: "baslangic", yon: "desc" };

  function turListesi() { return veriOku(ANAHTAR_TUR); }

  function turFiltreliListe() {
    var liste = turListesi();
    var arama = document.getElementById("tur-arama").value.trim().toLowerCase();
    var durum = document.getElementById("tur-durum-filtre").value;
    var tarihBas = document.getElementById("tur-tarih-baslangic").value;
    var tarihBit = document.getElementById("tur-tarih-bitis").value;

    liste = liste.filter(function (t) {
      if (arama) {
        var hedefMetin = (t.guzergah + " " + t.arac + " " + t.sofor + " " + (t.musteri || "")).toLowerCase();
        if (hedefMetin.indexOf(arama) === -1) return false;
      }
      if (durum === "devam" && t.tamamlandi) return false;
      if (durum === "tamamlandi" && !t.tamamlandi) return false;
      if (tarihBas && t.baslangic < tarihBas) return false;
      if (tarihBit && t.bitis > tarihBit) return false;
      return true;
    });

    liste.sort(function (a, b) {
      var av = a[tSiralama.alan], bv = b[tSiralama.alan];
      if (tSiralama.alan === "fiyat") { av = Number(av); bv = Number(bv); }
      if (tSiralama.alan === "durum") { av = a.tamamlandi ? 1 : 0; bv = b.tamamlandi ? 1 : 0; }
      if (av < bv) return tSiralama.yon === "asc" ? -1 : 1;
      if (av > bv) return tSiralama.yon === "asc" ? 1 : -1;
      return 0;
    });

    return liste;
  }

  function turRenderEt() {
    var liste = turFiltreliListe();
    var govde = document.getElementById("tur-tablo-govde");
    var bosDurum = document.getElementById("tur-bos-durum");

    if (liste.length === 0) {
      govde.innerHTML = "";
      bosDurum.hidden = false;
    } else {
      bosDurum.hidden = true;
      govde.innerHTML = liste.map(function (t) {
        return (
          '<tr class="' + (t.tamamlandi ? "tamamlandi-satir" : "") + '" data-id="' + escapeHTML(t.id) + '">' +
            '<td><span class="metin-vurgu">' + escapeHTML(t.guzergah) + "</span>" + (t.musteri ? '<br><span class="yardim" style="color:var(--ink-faint)">' + escapeHTML(t.musteri) + "</span>" : "") + "</td>" +
            "<td>" + escapeHTML(t.arac) + "</td>" +
            "<td>" + escapeHTML(t.sofor) + "</td>" +
            '<td class="mono">' + formatTarihAraligi(t.baslangic, t.bitis) + "</td>" +
            '<td class="mono">' + formatPara(t.fiyat) + "</td>" +
            "<td>" + (t.tamamlandi
              ? '<span class="durum-rozet tamam">Tamamlandı</span>'
              : '<span class="durum-rozet devam">Planlandı</span>') + "</td>" +
            '<td><input type="checkbox" class="tik-kutu" data-eylem="tik" ' + (t.tamamlandi ? "checked" : "") + "></td>" +
            '<td class="satir-eylem">' +
              '<button class="simge-btn" data-eylem="duzenle" title="Düzenle">✎</button>' +
              '<button class="simge-btn sil" data-eylem="sil" title="Sil">🗑</button>' +
            "</td>" +
          "</tr>"
        );
      }).join("");
    }

    document.querySelectorAll('#bolum-turlar thead th[data-alan]').forEach(function (th) {
      th.classList.toggle("aktif-siralama", th.getAttribute("data-alan") === tSiralama.alan);
    });

    ozetRenderEt();
  }

  document.querySelectorAll('#bolum-turlar thead th[data-alan]').forEach(function (th) {
    th.addEventListener("click", function () {
      var alan = th.getAttribute("data-alan");
      if (tSiralama.alan === alan) {
        tSiralama.yon = tSiralama.yon === "asc" ? "desc" : "asc";
      } else {
        tSiralama.alan = alan;
        tSiralama.yon = "asc";
      }
      turRenderEt();
    });
  });

  ["tur-arama", "tur-durum-filtre", "tur-tarih-baslangic", "tur-tarih-bitis"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", turRenderEt);
    document.getElementById(id).addEventListener("change", turRenderEt);
  });

  document.getElementById("tur-filtre-temizle").addEventListener("click", function () {
    document.getElementById("tur-arama").value = "";
    document.getElementById("tur-durum-filtre").value = "";
    document.getElementById("tur-tarih-baslangic").value = "";
    document.getElementById("tur-tarih-bitis").value = "";
    turRenderEt();
  });

  document.getElementById("tur-tablo-govde").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-eylem]");
    var tr = e.target.closest("tr[data-id]");
    if (!tr) return;
    var id = tr.getAttribute("data-id");

    if (e.target.matches('input[data-eylem="tik"]')) {
      turTamamlandiDegistir(id, e.target.checked);
      return;
    }
    if (!btn) return;
    var eylem = btn.getAttribute("data-eylem");
    if (eylem === "duzenle") turModalAc(id);
    if (eylem === "sil") turSil(id);
  });

  function turTamamlandiDegistir(id, deger) {
    var liste = turListesi();
    var kayit = liste.find(function (t) { return t.id === id; });
    if (!kayit) return;
    kayit.tamamlandi = deger;
    veriYaz(ANAHTAR_TUR, liste);
    turRenderEt();
    bildirimGoster(deger ? "Tur tamamlandı olarak işaretlendi." : "Tur yeniden planlandı olarak işaretlendi.");
  }

  function turSil(id) {
    var liste = turListesi();
    var kayit = liste.find(function (t) { return t.id === id; });
    if (!kayit) return;
    var onay = window.confirm(kayit.guzergah + " turu silinsin mi? Bu işlem geri alınamaz.");
    if (!onay) return;
    liste = liste.filter(function (t) { return t.id !== id; });
    veriYaz(ANAHTAR_TUR, liste);
    turRenderEt();
    bildirimGoster("Tur kaydı silindi.", "sil");
  }

  /* ---- Tur modalı ---- */
  var turModal = document.getElementById("tur-modal");
  var turForm = document.getElementById("tur-form");

  function turModalAc(id) {
    turForm.reset();
    document.querySelectorAll("#tur-form .alan-form").forEach(function (a) { a.classList.remove("gecersiz"); });

    if (id) {
      var kayit = turListesi().find(function (t) { return t.id === id; });
      if (!kayit) return;
      document.getElementById("tur-modal-baslik").textContent = "Turu Düzenle";
      document.getElementById("tur-id").value = kayit.id;
      document.getElementById("t-guzergah").value = kayit.guzergah;
      document.getElementById("t-arac").value = kayit.arac;
      document.getElementById("t-sofor").value = kayit.sofor;
      document.getElementById("t-baslangic").value = kayit.baslangic;
      document.getElementById("t-bitis").value = kayit.bitis;
      document.getElementById("t-fiyat").value = kayit.fiyat;
      document.getElementById("t-musteri").value = kayit.musteri || "";
      document.getElementById("t-tamamlandi").checked = !!kayit.tamamlandi;
    } else {
      document.getElementById("tur-modal-baslik").textContent = "Yeni Tur Ekle";
      document.getElementById("tur-id").value = "";
    }
    turModal.classList.add("acik");
    document.getElementById("t-guzergah").focus();
  }

  document.getElementById("tur-ekle-btn").addEventListener("click", function () { turModalAc(null); });

  turForm.addEventListener("submit", function (e) {
    e.preventDefault();

    function alanGetir(girdiId) { return document.getElementById(girdiId); }
    function gecersizIsaretle(girdiId, kosul) {
      var alan = alanGetir(girdiId).closest(".alan-form");
      alan.classList.toggle("gecersiz", kosul);
      return kosul;
    }

    var guzergah = alanGetir("t-guzergah").value.trim();
    var arac = alanGetir("t-arac").value.trim();
    var sofor = alanGetir("t-sofor").value.trim();
    var baslangic = alanGetir("t-baslangic").value;
    var bitis = alanGetir("t-bitis").value;
    var fiyat = alanGetir("t-fiyat").value;

    var hataVar = false;
    if (gecersizIsaretle("t-guzergah", !guzergah)) hataVar = true;
    if (gecersizIsaretle("t-arac", !arac)) hataVar = true;
    if (gecersizIsaretle("t-sofor", !sofor)) hataVar = true;
    if (gecersizIsaretle("t-baslangic", !baslangic)) hataVar = true;
    if (gecersizIsaretle("t-bitis", !bitis || (baslangic && bitis < baslangic))) hataVar = true;
    if (gecersizIsaretle("t-fiyat", fiyat === "" || Number(fiyat) < 0)) hataVar = true;

    if (hataVar) {
      bildirimGoster("Lütfen işaretli alanları kontrol edin.", "sil");
      return;
    }

    var liste = turListesi();
    var mevcutId = document.getElementById("tur-id").value;

    var kayit = {
      guzergah: guzergah, arac: arac, sofor: sofor,
      baslangic: baslangic, bitis: bitis, fiyat: Number(fiyat),
      musteri: alanGetir("t-musteri").value.trim(),
      tamamlandi: alanGetir("t-tamamlandi").checked
    };

    if (mevcutId) {
      var index = liste.findIndex(function (t) { return t.id === mevcutId; });
      if (index !== -1) {
        kayit.id = mevcutId;
        kayit.olusturulma = liste[index].olusturulma;
        liste[index] = kayit;
      }
    } else {
      kayit.id = uid("tur");
      kayit.olusturulma = Date.now();
      liste.push(kayit);
    }

    veriYaz(ANAHTAR_TUR, liste);
    turModalKapat();
    turRenderEt();
    bildirimGoster(mevcutId ? "Tur güncellendi." : "Yeni tur eklendi.");
  });

  function turModalKapat() { turModal.classList.remove("acik"); }

  /* ---------- Modal ortak davranışlar ---------- */
  document.querySelectorAll("[data-kapat]").forEach(function (el) {
    el.addEventListener("click", function () {
      document.getElementById(el.getAttribute("data-kapat")).classList.remove("acik");
    });
  });
  document.querySelectorAll(".modal-katman").forEach(function (katman) {
    katman.addEventListener("click", function (e) {
      if (e.target === katman) katman.classList.remove("acik");
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-katman.acik").forEach(function (m) { m.classList.remove("acik"); });
    }
  });

  /* =========================================================
     ÖZET
     ========================================================= */

  function ozetRenderEt() {
    var kiralamalar = kiralamaListesi();
    var turlar = turListesi();

    var aktifKiralama = kiralamalar.filter(function (k) { return !k.tamamlandi; }).length;
    var planliTur = turlar.filter(function (t) { return !t.tamamlandi; }).length;
    var toplamCiro = kiralamalar.reduce(function (a, k) { return a + Number(k.fiyat || 0); }, 0) +
                      turlar.reduce(function (a, t) { return a + Number(t.fiyat || 0); }, 0);

    document.getElementById("ist-aktif-kiralama").textContent = aktifKiralama;
    document.getElementById("ist-planli-tur").textContent = planliTur;
    document.getElementById("ist-bekleyen").textContent = aktifKiralama + planliTur;
    document.getElementById("ist-ciro").textContent = formatPara(toplamCiro);

    var birlesikListe = kiralamalar.filter(function (k) { return !k.tamamlandi; }).map(function (k) {
      return { tur: "Kiralama", detay: k.plaka + " · " + k.marka + " " + k.model, bas: k.baslangic, bit: k.bitis, fiyat: k.fiyat, tamamlandi: k.tamamlandi };
    }).concat(turlar.filter(function (t) { return !t.tamamlandi; }).map(function (t) {
      return { tur: "Tur", detay: t.guzergah, bas: t.baslangic, bit: t.bitis, fiyat: t.fiyat, tamamlandi: t.tamamlandi };
    }));

    birlesikListe.sort(function (a, b) { return a.bas < b.bas ? -1 : a.bas > b.bas ? 1 : 0; });
    birlesikListe = birlesikListe.slice(0, 8);

    var govde = document.getElementById("ozet-tablo-govde");
    if (birlesikListe.length === 0) {
      govde.innerHTML = '<tr><td colspan="5" class="bos-durum">Şu anda devam eden veya planlanan bir işlem yok.</td></tr>';
    } else {
      govde.innerHTML = birlesikListe.map(function (o) {
        return (
          "<tr>" +
            "<td>" + escapeHTML(o.tur) + "</td>" +
            "<td>" + escapeHTML(o.detay) + "</td>" +
            '<td class="mono">' + formatTarihAraligi(o.bas, o.bit) + "</td>" +
            '<td class="mono">' + formatPara(o.fiyat) + "</td>" +
            '<td><span class="durum-rozet devam">Devam Ediyor</span></td>' +
          "</tr>"
        );
      }).join("");
    }
  }

  /* ---------- İlk çizim ---------- */
  kiralamaRenderEt();
  turRenderEt();
  ozetRenderEt();

})();
