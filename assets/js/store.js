/* Areté — penyimpanan lokal (Fase 0).
   IndexedDB, bukan localStorage: nanti Fase 1 foto progress masuk ke sini juga.
   Skema mengikuti docs/HANDOFF.md bagian 6 supaya migrasi ke Supabase lurus. */
window.Store = (function () {
  const DB = 'arete', VER = 1;
  const STORES = ['logs', 'meta'];   // logs: key = YYYY-MM-DD · meta: key = nama
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

  return {
    get:  (s, k)    => tx(s, 'readonly',  o => o.get(k)),
    put:  (s, k, v) => tx(s, 'readwrite', o => o.put(v, k)),
    del:  (s, k)    => tx(s, 'readwrite', o => o.delete(k)),
    all:  (s)       => open().then(db => new Promise((res, rej) => {
      const out = [], t = db.transaction(s, 'readonly'), c = t.objectStore(s).openCursor();
      c.onsuccess = e => {
        const cur = e.target.result;
        if (cur) { out.push({ key: cur.key, value: cur.value }); cur.continue(); } else res(out);
      };
      c.onerror = () => rej(c.error);
    })),

    /* ---- ekspor / impor: satu-satunya cadangan di Fase 0 ---- */
    async export() {
      const [logs, meta] = await Promise.all([this.all('logs'), this.all('meta')]);
      return {
        app: 'arete', schema: 1, exported_at: new Date().toISOString(),
        logs: Object.fromEntries(logs.map(r => [r.key, r.value])),
        meta: Object.fromEntries(meta.map(r => [r.key, r.value]))
      };
    },
    async import(data) {
      if (!data || data.app !== 'arete') throw new Error('File ini bukan cadangan Areté.');
      for (const [k, v] of Object.entries(data.logs || {})) await this.put('logs', k, v);
      for (const [k, v] of Object.entries(data.meta || {})) await this.put('meta', k, v);
      return Object.keys(data.logs || {}).length;
    }
  };
})();

/* Target dan baseline — dari analisis nutrisi 2 Sep 2026.
   Disimpan di meta/goals supaya bisa diedit tanpa menyentuh kode. */
window.DEFAULT_GOALS = {
  race_date: '2026-09-20',
  bf_estimate_current: 19,
  bf_target_pct: 14,
  protein_target_g: 126,
  tdee_low: 2500,
  tdee_high: 2800,
  weight_baseline_kg: 70
};
