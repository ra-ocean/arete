/* Areté — sinkronisasi dua arah antara IndexedDB dan Supabase.

   Aturan yang dipakai: local-first. Aplikasi selalu membaca dan menulis ke
   IndexedDB dulu, jadi tetap jalan penuh tanpa sinyal. Awan cuma tempat
   bertemunya dua alat.

   Penyelesaian bentrok: baris yang updated_at nya paling baru yang menang,
   per baris, bukan per seluruh database. Untuk satu orang dengan dua alat ini
   sudah benar, dan kalau suatu hari salah, yang hilang paling banyak satu
   hari di satu alat, bukan semuanya. Penggabungan per field sengaja tidak
   dipakai karena diam diam bisa menghasilkan hari yang tidak pernah kamu
   catat seperti itu.

   Foto tidak ikut. Ukurannya besar dan Storage dikerjakan terpisah. */
window.Sync = (function () {
  let D = {};                        /* Store, UI, $, $$, onData */
  let jalan = false, pesanEl = null;

  const now = () => new Date().toISOString();
  const lebihBaru = (a, b) => !b ? true : !a ? false : String(a) > String(b);

  /* ---------- bentuk baris ---------- */
  async function lokalLogs() {
    const rows = await D.Store.all('logs');
    return rows.map(r => ({ day:r.key, payload:r.value, updated_at:r.value.updated_at || '1970-01-01T00:00:00Z' }));
  }
  function lokalSesi() {
    if (!window.TRAIN) return [];
    return TRAIN.exportRows();
  }
  async function lokalSetting() {
    const [goals, profile, targets] = await Promise.all([
      D.Store.get('meta','goals'), D.Store.get('meta','profile'), D.Store.get('meta','targets')
    ]);
    const t = window.TRAIN ? TRAIN.exportSettings() : {};
    const data = { goals:goals||null, profile:profile||null, targets:targets||null,
                   gear:t.gear||{}, mine:t.mine||{} };
    let u = null;
    try { u = localStorage.getItem('arete_setting_u'); } catch (e) {}
    return { data:data, updated_at: u || '1970-01-01T00:00:00Z' };
  }
  function tandaiSetting() { try { localStorage.setItem('arete_setting_u', now()); } catch (e) {} }

  /* ---------- satu putaran sinkronisasi ---------- */
  async function putar(diam) {
    if (!Supa.ada() || !Supa.masuk()) return false;
    /* Kalau satu putaran sedang berjalan, tunggu sampai selesai dan ikut
       hasilnya. Versi sebelumnya langsung keluar diam diam, jadi menekan
       Sinkronkan sekarang saat dorongan otomatis sedang jalan terlihat
       seperti tombolnya rusak. */
    if (jalan) {
      if (!diam) kabar('Sedang berjalan, tunggu sebentar…');
      for (let i = 0; i < 60 && jalan; i++) await new Promise(r => setTimeout(r, 250));
      if (!diam) kabar('Selesai.');
      return true;
    }
    jalan = true;
    try {
      if (!(await Supa.siap())) throw new Error('Sesi kedaluwarsa, masuk lagi.');
      const uid = Supa.user().id;
      let naik = 0, turun = 0;

      /* --- catatan harian --- */
      const lo = await lokalLogs();
      const re = await Supa.pilih('logs', 'select=day,payload,updated_at');
      const peta = {}; (re || []).forEach(r => peta[r.day] = r);
      const kirim = [];
      lo.forEach(l => {
        const r = peta[l.day];
        if (!r || lebihBaru(l.updated_at, r.updated_at))
          kirim.push({ user_id:uid, day:l.day, payload:l.payload, updated_at:l.updated_at });
      });
      if (kirim.length) { await Supa.tulis('logs', kirim); naik += kirim.length; }
      const lokalPeta = {}; lo.forEach(l => lokalPeta[l.day] = l);
      for (const r of (re || [])) {
        const l = lokalPeta[r.day];
        if (!l || lebihBaru(r.updated_at, l.updated_at)) {
          const v = Object.assign({}, r.payload, { updated_at:r.updated_at });
          await D.Store.put('logs', r.day, v); turun++;
        }
      }

      /* --- sesi latihan, sesi coach, perut harian --- */
      const ls = lokalSesi();
      const rs = await Supa.pilih('sessions', 'select=day,kind,payload,updated_at');
      const rp = {}; (rs || []).forEach(r => rp[r.kind + '|' + r.day] = r);
      const ks = [];
      ls.forEach(x => {
        const r = rp[x.kind + '|' + x.day];
        if (!r || lebihBaru(x.updated_at, r.updated_at))
          ks.push({ user_id:uid, day:x.day, kind:x.kind, payload:x.payload, updated_at:x.updated_at });
      });
      if (ks.length) { await Supa.tulis('sessions', ks); naik += ks.length; }
      const lp = {}; ls.forEach(x => lp[x.kind + '|' + x.day] = x);
      const masukkan = (rs || []).filter(r => {
        const l = lp[r.kind + '|' + r.day];
        return !l || lebihBaru(r.updated_at, l.updated_at);
      });
      if (masukkan.length && window.TRAIN) { await TRAIN.importRows(masukkan); turun += masukkan.length; }

      /* --- pengaturan --- */
      const se = await lokalSetting();
      const rr = await Supa.pilih('settings', 'select=data,updated_at');
      const r0 = (rr || [])[0];
      if (!r0 || lebihBaru(se.updated_at, r0.updated_at)) {
        if (se.updated_at !== '1970-01-01T00:00:00Z' || !r0) {
          await Supa.tulis('settings', [{ user_id:uid, data:se.data, updated_at: se.updated_at === '1970-01-01T00:00:00Z' ? now() : se.updated_at }]);
          naik++;
        }
      } else if (lebihBaru(r0.updated_at, se.updated_at)) {
        const d = r0.data || {};
        if (d.goals)   await D.Store.put('meta','goals', d.goals);
        if (d.profile) await D.Store.put('meta','profile', d.profile);
        if (d.targets) await D.Store.put('meta','targets', d.targets);
        if (window.TRAIN) await TRAIN.importSettings({ gear:d.gear, mine:d.mine });
        try { localStorage.setItem('arete_setting_u', r0.updated_at); } catch (e) {}
        turun++;
      }

      try { localStorage.setItem('arete_sync_at', now()); } catch (e) {}
      if (turun && D.onData) await D.onData();
      render();
      if (!diam) kabar(`Selesai. ${naik} baris dikirim, ${turun} baris diambil.`);
      return true;
    } catch (e) {
      if (!diam) kabar('Gagal: ' + e.message, true);
      return false;
    } finally { jalan = false; }
  }

  /* Dorong tanpa menarik, dipakai sesaat setelah kamu menyimpan sesuatu.
     Sengaja diam diam dan tidak menahan tampilan. */
  let tunda = null;
  function dorong() {
    if (!Supa.ada() || !Supa.masuk()) return;
    clearTimeout(tunda);
    tunda = setTimeout(() => { putar(true); }, 2500);
  }

  function kabar(t, buruk) {
    if (!pesanEl) return;
    pesanEl.textContent = t;
    pesanEl.classList.toggle('bad', !!buruk);
    clearTimeout(kabar._t);
    kabar._t = setTimeout(() => { pesanEl.textContent = ''; pesanEl.classList.remove('bad'); }, 7000);
  }

  /* ---------- tampilan kartu Akun ---------- */
  let tahap = 'email', email = '';

  function render() {
    const el = D.$('#akun-body'); if (!el) return;
    /* Pesan terakhir dibawa ikut. Tanpa ini, dorongan otomatis yang kebetulan
       jalan dua detik setelah kamu menekan Sinkronkan akan menggambar ulang
       kartunya dan pesannya hilang, jadi tombolnya terlihat tidak bereaksi. */
    const bawa = pesanEl ? { t:pesanEl.textContent, bad:pesanEl.classList.contains('bad') } : null;
    pesanEl = null;
    if (!Supa.ada()) {
      el.innerHTML = `<p class="note-sm">Alamat Supabase belum diisi di <code>assets/js/config.js</code>.</p>`;
      return;
    }
    if (!Supa.masuk()) {
      el.innerHTML = tahap === 'email'
        ? `<p class="note-sm">Masuk sekali di tiap alat, lalu catatanmu muncul di dua duanya. Kodenya dikirim ke email, tidak ada kata sandi yang perlu diingat.</p>
           <div class="field"><label for="ak-email">Email</label><input id="ak-email" type="email" inputmode="email" autocomplete="email" placeholder="${esc(email) || 'nama@email.com'}" value="${esc(email)}"></div>
           <button class="btn ghost" id="ak-kirim" type="button">Kirim kode</button>
           <div class="msg" id="ak-msg"></div>`
        : `<p class="note-sm">Kode enam angka sudah dikirim ke <b>${esc(email)}</b>. Buka emailnya, lalu ketik kodenya di sini. Jangan klik tautannya, karena tautan membuka browser dan bukan aplikasi ini.</p>
           <div class="field"><label for="ak-kode">Kode</label><input id="ak-kode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456"></div>
           <div class="btnrow">
             <button class="btn ghost sm" id="ak-verif" type="button">Masuk</button>
             <button class="btn ghost sm" id="ak-ulang" type="button">Kirim ulang</button>
             <button class="btn ghost sm" id="ak-batal" type="button">Ganti email</button>
           </div>
           <div class="msg" id="ak-msg"></div>`;
    } else {
      const u = Supa.user() || {};
      let at = null; try { at = localStorage.getItem('arete_sync_at'); } catch (e) {}
      const kv = (k, v) => `<div class="kv"><span class="k">${k}</span><span class="v">${v}</span></div>`;
      el.innerHTML =
        kv('Masuk sebagai', esc(u.email || '—')) +
        kv('Sinkronisasi terakhir', at ? D.UI.fmt(at.slice(0, 10)) + ', ' + at.slice(11, 16) : 'belum pernah') +
        `<div class="btnrow" style="margin-top:14px">
           <button class="btn ghost sm" id="ak-sync" type="button">Sinkronkan sekarang</button>
           <button class="btn ghost sm" id="ak-keluar" type="button">Keluar</button>
         </div>
         <div class="msg" id="ak-msg"></div>
         <p class="note-sm">Yang ikut: catatan harian, sesi latihan, sesi coach, perut harian, sasaran, inventaris alat, dan gerakan buatanmu sendiri. Yang tidak ikut: foto, karena ukurannya besar, dan data intervals.icu, karena sumbernya memang di sana dan ditarik ulang tiap buka aplikasi.</p>`;
    }
    pesanEl = D.$('#ak-msg');
    if (pesanEl && bawa && bawa.t) { pesanEl.textContent = bawa.t; pesanEl.classList.toggle('bad', bawa.bad); }
    pasang();
  }
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

  function pasang() {
    const $ = D.$;
    const k = $('#ak-kirim');
    if (k) k.onclick = async () => {
      const v = ($('#ak-email').value || '').trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { kabar('Alamat emailnya belum benar.', true); return; }
      k.disabled = true; kabar('Mengirim kode…');
      try { await Supa.kirimKode(v); email = v; tahap = 'kode'; render(); kabar('Kode terkirim. Cek email, termasuk folder spam.'); }
      catch (e) { k.disabled = false; kabar('Gagal: ' + e.message, true); }
    };
    const v = $('#ak-verif');
    if (v) v.onclick = async () => {
      const kode = ($('#ak-kode').value || '').trim();
      if (kode.length < 6) { kabar('Kodenya enam angka.', true); return; }
      v.disabled = true; kabar('Memeriksa…');
      try {
        await Supa.verifikasi(email, kode);
        tahap = 'email'; render();
        kabar('Masuk. Menyinkronkan…');
        await putar(false);
      } catch (e) { v.disabled = false; kabar(e.message, true); }
    };
    const u = $('#ak-ulang');
    if (u) u.onclick = async () => { try { await Supa.kirimKode(email); kabar('Kode baru terkirim.'); }
                                     catch (e) { kabar('Gagal: ' + e.message, true); } };
    const b = $('#ak-batal');
    if (b) b.onclick = () => { tahap = 'email'; render(); };
    const s = $('#ak-sync');
    if (s) s.onclick = async () => { s.disabled = true; kabar('Menyinkronkan…'); await putar(false); s.disabled = false; };
    const q = $('#ak-keluar');
    if (q) q.onclick = () => { Supa.keluar(); render(); kabar('Sudah keluar. Datamu tetap ada di alat ini.'); };
  }

  async function init(deps) {
    D = deps;
    if (Supa.ada() && Supa.masuk() && !Supa.user()) await Supa.ambilUser();
    render();
    if (Supa.ada() && Supa.masuk()) { await putar(true); }
  }

  return { init, render, putar, dorong, tandaiSetting };
})();
