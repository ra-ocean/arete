/* Areté — klien Supabase kecil, ditulis sendiri.

   Kenapa tidak memakai supabase-js. Aplikasi ini tanpa build step dan seluruh
   isinya di-cache service worker supaya bisa dibuka tanpa sinyal. Menarik
   pustaka 100 KB dari CDN merusak dua duanya. Yang benar benar dipakai cuma
   dua hal: masuk lewat kode email, dan baca tulis tabel lewat PostgREST.
   Keduanya cukup dengan fetch biasa.

   Anon key memang dirancang untuk dipasang di klien. Yang mengunci data bukan
   kerahasiaan kunci itu, tapi Row Level Security di Postgres: tiap baris
   dicocokkan dengan auth.uid() dan baris milik orang lain ditolak oleh
   databasenya sendiri, bukan oleh aplikasi. */
window.Supa = (function () {
  const CFG = window.ARETE_SUPABASE || {};
  const URL = (CFG.url || '').replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  const KEY = CFG.anonKey || '';
  const LS  = 'arete_sesi_supabase';

  let ses = null;
  try { ses = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}

  const ada = () => !!(URL && KEY);
  const masuk = () => !!(ses && ses.access_token);
  const user = () => (ses && ses.user) || null;

  function simpan(s) {
    ses = s;
    try { s ? localStorage.setItem(LS, JSON.stringify(s)) : localStorage.removeItem(LS); } catch (e) {}
  }

  /* Pesan gagal diterjemahkan di sini. "Failed to fetch" tidak memberi tahu
     siapa pun apa yang harus dilakukan. */
  function ramah(e, status) {
    const t = String(e && e.message || e || '');
    if (/failed to fetch|networkerror|load failed|tunnel/i.test(t))
      return 'Tidak bisa menghubungi server. Periksa sinyal atau Wi-Fi, lalu coba lagi.';
    if (status === 429 || /rate limit|too many/i.test(t))
      return 'Terlalu sering meminta kode. Tunggu satu menit, lalu coba lagi.';
    if (/expired|invalid|otp/i.test(t))
      return 'Kodenya salah atau sudah kedaluwarsa. Minta kode baru.';
    return t || 'Gagal tanpa keterangan.';
  }

  async function auth(path, body) {
    let r;
    try {
      r = await fetch(`${URL}/auth/v1/${path}`, {
        method:'POST',
        headers:{ 'apikey':KEY, 'Content-Type':'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) { throw new Error(ramah(e)); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(ramah(new Error(j.error_description || j.msg || j.error || ''), r.status));
    return j;
  }

  /* Kode enam angka lewat email, bukan tautan yang harus diklik.
     Tautan magic link membuka Safari, bukan aplikasi yang sudah kamu pasang
     di layar depan, jadi sesinya mendarat di tempat yang salah dan kamu
     tetap terlihat belum masuk. Kode yang diketik tidak punya masalah itu. */
  async function kirimKode(email) {
    await auth('otp', { email: email, create_user: true });
    return true;
  }
  async function verifikasi(email, token) {
    const j = await auth('verify', { email: email, token: String(token).trim(), type: 'email' });
    if (!j.access_token) throw new Error('Kode ditolak. Periksa lagi atau minta kode baru.');
    simpan({ access_token:j.access_token, refresh_token:j.refresh_token,
             expires_at: Date.now() + (j.expires_in || 3600) * 1000, user:j.user });
    return j.user;
  }
  async function segarkan() {
    if (!ses || !ses.refresh_token) return false;
    try {
      const j = await auth('token?grant_type=refresh_token', { refresh_token: ses.refresh_token });
      if (!j.access_token) return false;
      simpan({ access_token:j.access_token, refresh_token:j.refresh_token,
               expires_at: Date.now() + (j.expires_in || 3600) * 1000, user:j.user || ses.user });
      return true;
    } catch (e) { return false; }
  }
  function keluar() { simpan(null); }

  /* Jaring pengaman kalau tautan di email yang diklik, bukan kodenya diketik.
     Supabase memulangkan token di bagian pagar alamat. Kalau ada, sesinya
     dipungut di sini dan alamatnya dibersihkan supaya token tidak tertinggal
     di riwayat browser. */
  function tangkapTautan() {
    const h = location.hash || '';
    if (h.indexOf('access_token=') < 0) return false;
    const q = new URLSearchParams(h.replace(/^#/, ''));
    const at = q.get('access_token'), rt = q.get('refresh_token');
    if (!at) return false;
    simpan({ access_token:at, refresh_token:rt,
             expires_at: Date.now() + (+(q.get('expires_in') || 3600)) * 1000, user:null });
    try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
    return true;
  }

  /* Siapa yang sedang masuk. Dipanggil kalau sesi datang dari tautan, karena
     tautan tidak membawa data pengguna. */
  async function ambilUser() {
    if (!ses || !ses.access_token) return null;
    try {
      const r = await fetch(`${URL}/auth/v1/user`, {
        headers:{ 'apikey':KEY, 'Authorization':'Bearer ' + ses.access_token } });
      if (!r.ok) return null;
      const u = await r.json();
      if (u && u.id) { ses.user = u; simpan(ses); }
      return u;
    } catch (e) { return null; }
  }

  async function siap() {
    if (!masuk()) return false;
    if (ses.expires_at && ses.expires_at - Date.now() < 120000) {
      if (!(await segarkan())) return false;
    }
    if (!ses.user) await ambilUser();
    return !!(ses && ses.user && ses.user.id);
  }

  /* PostgREST. Satu pintu untuk select dan upsert. */
  async function rest(tabel, opts) {
    opts = opts || {};
    if (!(await siap())) throw new Error('Belum masuk.');
    const q = opts.query ? '?' + opts.query : '';
    const h = {
      'apikey': KEY,
      'Authorization': 'Bearer ' + ses.access_token,
      'Content-Type': 'application/json'
    };
    if (opts.upsert) h['Prefer'] = 'resolution=merge-duplicates,return=minimal';
    let r;
    try {
      r = await fetch(`${URL}/rest/v1/${tabel}${q}`, {
        method: opts.method || 'GET', headers: h,
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
    } catch (e) { throw new Error(ramah(e)); }
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      if (r.status === 404 || /does not exist|relation/i.test(t))
        throw new Error(`Tabel ${tabel} belum ada di Supabase. Jalankan dulu berkas docs/supabase.sql di SQL Editor.`);
      if (r.status === 401 || r.status === 403)
        throw new Error('Sesi ditolak. Keluar lalu masuk lagi.');
      throw new Error(`${tabel} ${r.status}: ${t.slice(0, 140)}`);
    }
    if (opts.method && opts.method !== 'GET' && h['Prefer']) return null;
    return await r.json().catch(() => null);
  }

  const pilih  = (tabel, query) => rest(tabel, { query:query });
  const tulis  = (tabel, rows)  => rest(tabel, { method:'POST', body:rows, upsert:true });

  tangkapTautan();

  return { ada, masuk, user, kirimKode, verifikasi, keluar, siap, pilih, tulis, segarkan, ramah,
           tangkapTautan, ambilUser, url: () => URL };
})();
