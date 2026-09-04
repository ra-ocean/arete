/* Areté — proxy intervals.icu.
 *
 * KENAPA ADA: API key intervals.icu tidak boleh pernah masuk ke kode yang dikirim
 * ke browser — siapa pun bisa membacanya dan memakai akun intervals.icu Rausyan.
 * Function ini jalan di server Vercel, memegang key dari environment variable,
 * dan hanya mengembalikan angka yang app butuhkan.
 *
 * ENVIRONMENT VARIABLES yang harus diisi di Vercel:
 *   INTERVALS_API_KEY      API key dari intervals.icu -> Settings -> Developer
 *   INTERVALS_ATHLETE_ID   ID atlet, bentuknya i123456 (ada di URL profil)
 *   ALLOWED_ORIGIN         (opsional) origin situs, mis. https://arete.vercel.app
 *
 * BATAS KEAMANAN — dibaca dulu:
 * Pengecekan Origin di bawah menahan pemanggilan dari situs lain lewat browser,
 * tapi TIDAK menahan curl yang memalsukan header. Artinya: siapa pun yang tahu
 * URL ini bisa membaca angka latihan (CTL, pace, jarak). Yang TIDAK bisa bocor
 * adalah API key-nya sendiri — itu tetap di server. Kalau nanti data ini terasa
 * terlalu pribadi, langkah berikutnya adalah menambah login, bukan menambal ini.
 */

const BASE = 'https://intervals.icu/api/v1';

function iso(d) { return d.toISOString().slice(0, 10); }

export default async function handler(req, res) {
  const key = process.env.INTERVALS_API_KEY;
  const athlete = process.env.INTERVALS_ATHLETE_ID;

  if (!key || !athlete) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'INTERVALS_API_KEY dan INTERVALS_ATHLETE_ID belum diisi di Vercel.'
    });
  }

  const allowed = process.env.ALLOWED_ORIGIN;
  const origin = req.headers.origin;
  if (allowed && origin && origin !== allowed) {
    return res.status(403).json({ error: 'forbidden_origin' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);

  const what = (req.query.what || 'wellness').toString();
  const days = Math.min(parseInt(req.query.days, 10) || 42, 180);

  const newest = new Date();
  const oldest = new Date(Date.now() - days * 86400000);

  let url;
  if (what === 'wellness') {
    url = `${BASE}/athlete/${athlete}/wellness?oldest=${iso(oldest)}&newest=${iso(newest)}`;
  } else if (what === 'activities') {
    url = `${BASE}/athlete/${athlete}/activities?oldest=${iso(oldest)}&newest=${iso(newest)}`;
  } else {
    return res.status(400).json({ error: 'bad_what', message: 'what harus wellness atau activities' });
  }

  try {
    const auth = Buffer.from('API_KEY:' + key).toString('base64');
    const r = await fetch(url, { headers: { Authorization: 'Basic ' + auth } });

    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({
        error: 'upstream',
        status: r.status,
        message: r.status === 401 ? 'API key ditolak intervals.icu.'
               : r.status === 404 ? 'Athlete ID tidak ditemukan.'
               : body.slice(0, 300)
      });
    }

    const data = await r.json();
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
    return res.status(200).json(slim(what, data));
  } catch (e) {
    return res.status(502).json({ error: 'fetch_failed', message: String(e).slice(0, 300) });
  }
}

/* Kirim hanya field yang app pakai. Payload mentah intervals.icu besar sekali
   dan sebagian besar tidak dipakai — ini menghemat kuota dan waktu muat di HP. */
function slim(what, data) {
  if (!Array.isArray(data)) return data;

  if (what === 'wellness') {
    return data.map(d => ({
      date: d.id,
      ctl: d.ctl, atl: d.atl,
      form: (d.ctl != null && d.atl != null) ? +(d.ctl - d.atl).toFixed(1) : null,
      rhr: d.restingHR, hrv: d.hrv,
      sleep_h: d.sleepSecs != null ? +(d.sleepSecs / 3600).toFixed(1) : null,
      sleep_score: d.sleepScore,
      weight: d.weight
    })).filter(d => d.ctl != null || d.rhr != null || d.hrv != null || d.sleep_h != null);
  }

  return data.map(a => ({
    id: a.id,
    date: (a.start_date_local || '').slice(0, 10),
    start: a.start_date_local,
    name: a.name,
    type: a.type,
    km: a.distance != null ? +(a.distance / 1000).toFixed(2) : null,
    moving_s: a.moving_time,
    elapsed_s: a.elapsed_time,
    pace_s_per_km: (a.distance > 0 && a.moving_time) ? Math.round(a.moving_time / (a.distance / 1000)) : null,
    avg_hr: a.average_heartrate,
    max_hr: a.max_heartrate,
    avg_power: a.icu_average_watts ?? a.average_watts ?? null,
    load: a.icu_training_load,
    elev: a.total_elevation_gain,
    cadence: a.average_cadence
  }));
}
