/* Areté — penerima data dari Health Auto Export (iOS).
 *
 * ALUR: Zepp -> Apple Health -> Health Auto Export -> POST ke sini
 *       -> ditulis ke wellness intervals.icu -> dibaca app seperti biasa.
 *
 * Tidak ada database baru: intervals.icu tetap satu-satunya sumber, jadi angkanya
 * juga muncul di grafik intervals.icu, bukan cuma di app ini.
 *
 * ENVIRONMENT VARIABLES:
 *   INTERVALS_API_KEY, INTERVALS_ATHLETE_ID   (sama seperti /api/intervals)
 *   HEALTH_INGEST_KEY                          rahasia yang harus dikirim
 *                                              Health Auto Export lewat header
 *                                              X-API-Key. Wajib — tanpa ini
 *                                              siapa pun bisa menulis data palsu.
 */

const BASE = 'https://intervals.icu/api/v1';

/* Nama metrik Health Auto Export -> field wellness intervals.icu.
   Health Auto Export memakai snake_case dan bisa mengirim `qty` atau `Avg`. */
const MAP = {
  heart_rate_variability: 'hrv',
  resting_heart_rate: 'restingHR',
  respiratory_rate: 'respiration',
  blood_oxygen_saturation: 'spO2',
  weight_body_mass: 'weight',
  body_fat_percentage: 'bodyFat',
  step_count: 'steps'
};

function dayKey(s) {
  // "2026-09-04 07:15:00 +0700" -> "2026-09-04"
  const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[0] : null;
}
function val(p) {
  if (p == null) return null;
  const v = p.qty ?? p.Avg ?? p.avg ?? p.value;
  return typeof v === 'number' ? v : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'post_only' });

  const secret = process.env.HEALTH_INGEST_KEY;
  if (!secret) return res.status(503).json({ error: 'not_configured', message: 'HEALTH_INGEST_KEY belum diisi di Vercel.' });
  const sent = req.headers['x-api-key'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (sent !== secret) return res.status(401).json({ error: 'bad_key' });

  const key = process.env.INTERVALS_API_KEY, athlete = process.env.INTERVALS_ATHLETE_ID;
  if (!key || !athlete) return res.status(503).json({ error: 'intervals_not_configured' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const metrics = body?.data?.metrics || body?.metrics || [];
  if (!Array.isArray(metrics)) return res.status(400).json({ error: 'bad_payload', got: Object.keys(body || {}) });

  /* Kumpulkan per tanggal. */
  const byDate = {};
  const seen = [], skipped = [];
  for (const m of metrics) {
    const field = MAP[m.name];
    if (m.name === 'sleep_analysis') {
      for (const p of (m.data || [])) {
        const d = dayKey(p.sleepEnd || p.date || p.endDate); if (!d) continue;
        const hrs = p.asleep ?? p.totalSleep ?? ((p.deep || 0) + (p.core || 0) + (p.rem || 0));
        if (typeof hrs === 'number' && hrs > 0) {
          byDate[d] = byDate[d] || {};
          byDate[d].sleepSecs = Math.round(hrs * 3600);
        }
      }
      seen.push('sleep_analysis');
      continue;
    }
    if (!field) { skipped.push(m.name); continue; }
    for (const p of (m.data || [])) {
      const d = dayKey(p.date); const v = val(p);
      if (!d || v == null) continue;
      byDate[d] = byDate[d] || {};
      byDate[d][field] = field === 'steps' ? Math.round(v) : +v.toFixed(2);
    }
    seen.push(m.name);
  }

  const dates = Object.keys(byDate).sort();
  if (!dates.length) {
    return res.status(200).json({ ok: true, written: 0, seen, skipped,
      message: 'Payload diterima tapi tidak ada metrik yang dikenali. Kirim daftar `skipped` ini kalau ada nama metrik yang seharusnya masuk.' });
  }

  const auth = 'Basic ' + Buffer.from('API_KEY:' + key).toString('base64');
  const results = [];
  for (const d of dates) {
    try {
      const r = await fetch(`${BASE}/athlete/${athlete}/wellness/${d}`, {
        method: 'PUT',
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({ id: d }, byDate[d]))
      });
      results.push({ date: d, status: r.status, fields: Object.keys(byDate[d]) });
    } catch (e) {
      results.push({ date: d, status: 'fetch_failed', message: String(e).slice(0, 160) });
    }
  }
  const ok = results.filter(r => r.status === 200).length;
  return res.status(200).json({ ok: true, written: ok, of: dates.length, seen, skipped, results });
}
