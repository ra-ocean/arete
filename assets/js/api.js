/* Areté — jembatan ke intervals.icu lewat serverless function sendiri.
   Halaman ini tidak pernah memegang API key. Kalau /api/intervals belum ada
   (misalnya masih di GitHub Pages), semua fungsi mengembalikan status jelas
   supaya UI bisa menampilkan ajakan menyambungkan, bukan error mentah. */
window.Api = (function () {
  const TTL = 30 * 60 * 1000;   // cache 30 menit di IndexedDB

  async function call(what, days) {
    const cacheKey = 'intervals_' + what + '_' + (days || 42);
    const cached = await Store.get('cache', cacheKey);
    if (cached && Date.now() - cached.at < TTL) return { ok: true, data: cached.data, cached: true };

    let r;
    try {
      r = await fetch(`./api/intervals?what=${what}&days=${days || 42}`, { headers: { Accept: 'application/json' } });
    } catch (e) {
      if (cached) return { ok: true, data: cached.data, cached: true, stale: true };
      return { ok: false, reason: 'offline' };
    }

    if (r.status === 404) return { ok: false, reason: 'no_backend' };
    if (r.status === 503) return { ok: false, reason: 'not_configured' };
    if (!r.ok) {
      let msg = '';
      try { msg = (await r.json()).message || ''; } catch (e) {}
      if (cached) return { ok: true, data: cached.data, cached: true, stale: true };
      return { ok: false, reason: 'error', status: r.status, message: msg };
    }

    const data = await r.json();
    await Store.put('cache', cacheKey, { at: Date.now(), data });
    return { ok: true, data };
  }

  return {
    wellness: (d) => call('wellness', d || 42),
    activities: (d) => call('activities', d || 42),
    async clearCache() {
      const all = await Store.all('cache');
      for (const r of all) if (String(r.key).startsWith('intervals_')) await Store.del('cache', r.key);
    }
  };
})();
