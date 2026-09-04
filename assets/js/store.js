/* Areté — penyimpanan lokal.
   IndexedDB. Skema sengaja dibuat mirip dokumen supaya migrasi ke Supabase
   (Fase 1) tinggal memindahkan isi tiap store jadi tabel.

   logs/<YYYY-MM-DD>   catatan harian
   meta/goals          target & baseline
   meta/profile        nama, foto, tinggi
   photos/<date>-<sudut>   foto progress (base64 terkompresi)
   cache/<nama>        hasil tarikan intervals.icu, berumur pendek
*/
window.Store = (function () {
  const DB = 'arete', VER = 2;
  const STORES = ['logs', 'meta', 'photos', 'cache'];
  let dbp = null;

  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const r = indexedDB.open(DB, VER);
      r.onupgradeneeded = () => {
        const db = r.result;
        STORES.forEach(s => { if (!db.objectStoreNames.contains(s)) db.createObjectStore(s); });
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }

  function tx(store, mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req && req.result);
      t.onerror = () => rej(t.error);
    }));
  }

  const api = {
    get:  (s, k)    => tx(s, 'readonly',  o => o.get(k)),
    put:  (s, k, v) => tx(s, 'readwrite', o => o.put(v, k)),
    del:  (s, k)    => tx(s, 'readwrite', o => o.delete(k)),
    clear:(s)       => tx(s, 'readwrite', o => o.clear()),
    all:  (s)       => open().then(db => new Promise((res, rej) => {
      const out = [], t = db.transaction(s, 'readonly'), c = t.objectStore(s).openCursor();
      c.onsuccess = e => {
        const cur = e.target.result;
        if (cur) { out.push({ key: cur.key, value: cur.value }); cur.continue(); } else res(out);
      };
      c.onerror = () => rej(c.error);
    })),

    /* Ekspor/impor: satu-satunya cadangan sampai Supabase masuk.
       Cache sengaja tidak ikut — bisa ditarik ulang kapan saja. */
    async export() {
      const [logs, meta, photos] = await Promise.all([api.all('logs'), api.all('meta'), api.all('photos')]);
      const obj = a => Object.fromEntries(a.map(r => [r.key, r.value]));
      return { app: 'arete', schema: 2, exported_at: new Date().toISOString(),
               logs: obj(logs), meta: obj(meta), photos: obj(photos) };
    },
    async import(data) {
      if (!data || data.app !== 'arete') throw new Error('File ini bukan cadangan Areté.');
      for (const [k, v] of Object.entries(data.logs   || {})) await api.put('logs', k, v);
      for (const [k, v] of Object.entries(data.meta   || {})) await api.put('meta', k, v);
      for (const [k, v] of Object.entries(data.photos || {})) await api.put('photos', k, v);
      return Object.keys(data.logs || {}).length;
    },

    /* Kompresi gambar di HP sebelum disimpan. Foto kamera 4 MB tidak muat di
       satu dokumen; ini menurunkan dimensi & kualitas sampai di bawah budget. */
    compress(file, budget) {
      budget = budget || 220 * 1024;
      return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onerror = () => reject(new Error('Gagal membaca file.'));
        fr.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('File ini bukan gambar yang bisa dibaca.'));
          img.onload = () => {
            let maxDim = 1100, q = 0.82, url = '';
            for (let i = 0; i < 7; i++) {
              const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
              const c = document.createElement('canvas');
              c.width = Math.round(img.width * scale);
              c.height = Math.round(img.height * scale);
              c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
              url = c.toDataURL('image/jpeg', q);
              if (url.length * 0.75 <= budget) break;
              if (i % 2 === 0) q -= 0.12; else maxDim = Math.round(maxDim * 0.8);
              q = Math.max(0.4, q);
            }
            resolve(url);
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
    }
  };
  return api;
})();

/* Target & baseline — dari analisis nutrisi 2 Sep 2026. Bisa diubah di Profil. */
window.DEFAULT_GOALS = {
  race_date: '2026-09-20',
  bf_estimate_current: 19,
  bf_target_pct: 14,
  protein_target_g: 126,
  cal_target: 2200,
  tdee_low: 2500,
  tdee_high: 2800,
  weight_baseline_kg: 70,
  sleep_target_h: 7
};
