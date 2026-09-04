/* Areté — logika aplikasi.
   Lima tab: Beranda · Tubuh · Catat · Performa · Profil.
   Data lokal (IndexedDB) + intervals.icu lewat serverless function sendiri. */
(function () {
  const $  = s => document.querySelector(s);
  const $$ = s => [].slice.call(document.querySelectorAll(s));
  const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
  const ANGLES = [['abs', 'Perut'], ['side', 'Samping'], ['back', 'Punggung'], ['arms', 'Lengan']];

  let goals   = Object.assign({}, window.DEFAULT_GOALS);
  let profile = { name: 'Rausyan', photo: null };
  let logs = [], photos = [], wellness = null, activities = null;
  let today = UI.todayKey();

  const logOf = k => (logs.find(l => l.key === k) || {}).value || {};

  /* Recovery bisa datang dari dua arah: diketik manual dari Zepp, atau ikut
     masuk lewat intervals.icu kalau jam/ring-nya tersambung ke sana.
     Yang diketik manual selalu menang — itu yang paling sengaja dimasukkan. */
  function wellnessMap() {
    const m = {};
    if (wellness && wellness.ok) wellness.data.forEach(d => { m[d.date] = d; });
    return m;
  }
  function mergedRecovery() {
    const wm = wellnessMap();
    const keys = [...new Set(logs.map(l => l.key).concat(Object.keys(wm)))].sort();
    return keys.map(k => {
      const l = logOf(k), w = wm[k] || {};
      return {
        key: k,
        sleep: l.sleep != null ? l.sleep : (w.sleep_h ?? null),
        hrv:   l.hrv   != null ? l.hrv   : (w.hrv ?? null),
        rhr:   l.rhr   != null ? l.rhr   : (w.rhr ?? null)
      };
    });
  }
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const series = (field, n) => logs.slice(-(n || 30)).filter(l => l.value[field] != null)
                                   .map(l => ({ v: l.value[field], label: UI.shortDate(l.key).dm }));

  /* ================= READINESS =================
     Gabungan tidur, HRV, dan resting HR terhadap baseline 30 hari sendiri.
     Komponen yang kosong tidak ditebak — bobotnya dibagi ulang ke yang ada. */
  function readiness() {
    const rec = mergedRecovery();
    const hist = rec.slice(-30);
    const cur = rec.filter(r => r.key <= today);
    /* Angka "hari ini" boleh diambil dari hari terakhir yang ada isinya —
       data recovery sering baru masuk siang, dan kemarin masih relevan pagi ini. */
    const pick = f => {
      const t = rec.find(r => r.key === today);
      if (t && t[f] != null) return t[f];
      const back = cur.filter(r => r[f] != null).slice(-1)[0];
      return back ? back[f] : null;
    };
    const sleep = pick('sleep'), hrv = pick('hrv'), rhr = pick('rhr');
    const hrvHist = hist.map(r => r.hrv).filter(v => v != null);
    const rhrHist = hist.map(r => r.rhr).filter(v => v != null);

    /* HRV dan resting HR hanya berarti dibandingkan ke kebiasaan sendiri.
       Di bawah 5 catatan, baseline-nya adalah angka itu sendiri — perbandingan
       jadi selalu "normal" dan skornya bohong. Komponen itu dilewati dulu. */
    const MIN = 5;
    const bHrv = hrvHist.length >= MIN ? median(hrvHist) : null;
    const bRhr = rhrHist.length >= MIN ? median(rhrHist) : null;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const target = goals.sleep_target_h || 7;
    const parts = [];
    if (sleep != null) parts.push([0.40, clamp(100 - Math.max(0, target - sleep) * 30, 0, 100)]);
    if (hrv != null && bHrv) parts.push([0.35, clamp(100 + (hrv / bHrv - 1) * 200, 40, 112)]);
    if (rhr != null && bRhr) parts.push([0.25, clamp(100 + (1 - rhr / bRhr) * 300, 40, 112)]);

    if (!parts.length) return { score: null, sleep, hrv, rhr, need: [] };
    const wsum = parts.reduce((s, p) => s + p[0], 0);
    const score = Math.round(clamp(parts.reduce((s, p) => s + p[0] * p[1], 0) / wsum, 0, 100));
    const need = [];
    if (sleep == null) need.push('tidur');
    if (!bHrv) need.push(hrv == null ? 'HRV' : 'HRV (' + hrvHist.length + '/' + MIN + ' hari)');
    if (!bRhr) need.push(rhr == null ? 'resting HR' : 'resting HR (' + rhrHist.length + '/' + MIN + ' hari)');
    return { score, sleep, hrv, rhr, need };
  }

  function renderReadiness() {
    const r = readiness();
    const el = $('#readiness-body');
    const mini = `<div class="mini3">
      <div><div class="k">Tidur</div><div class="v ${r.sleep == null ? 'none' : ''}">${r.sleep == null ? 'belum' : r.sleep + ' j'}</div></div>
      <div><div class="k">HRV</div><div class="v ${r.hrv == null ? 'none' : ''}">${r.hrv == null ? 'belum' : r.hrv + ' ms'}</div></div>
      <div><div class="k">Resting HR</div><div class="v ${r.rhr == null ? 'none' : ''}">${r.rhr == null ? 'belum' : r.rhr + ' bpm'}</div></div>
    </div>`;

    if (r.score == null) {
      el.innerHTML = `<div class="connect"><p>Isi tidur, HRV, dan resting HR dari app Zepp untuk melihat skor kesiapan. Butuh sekitar 15 detik tiap pagi.</p></div>` + mini;
      return;
    }
    const s = r.score;
    const lab = s >= 80 ? 'Siap' : s >= 65 ? 'Cukup siap' : s >= 50 ? 'Hati-hati' : 'Pulihkan dulu';
    const say = s >= 80 ? 'Badan pulih. Sesi berat hari ini aman dijalankan penuh.'
              : s >= 65 ? 'Kondisi wajar. Jalankan rencana, tapi jangan menambah dosis.'
              : s >= 50 ? 'Pemulihan belum penuh. Turunkan intensitas satu tingkat, volume boleh tetap.'
              : 'Sinyal pemulihan rendah. Ganti dengan easy atau mobility — memaksa hari ini menambah beban tanpa adaptasi.';
    const C = 2 * Math.PI * 34;
    el.innerHTML = `<div class="ready">
        <div class="gauge">
          <svg viewBox="0 0 80 80"><circle class="bg" cx="40" cy="40" r="34"/>
          <circle class="fg" cx="40" cy="40" r="34" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - s / 100)).toFixed(1)}"/></svg>
          <b>${s}</b>
        </div>
        <div class="ready-txt"><div class="lab">${lab}</div><p>${say}</p></div>
      </div>` + mini
      + (r.need.length ? `<p class="note-sm" style="margin:10px 0 0">Skor ini baru dari ${r.need.length === 3 ? 'sebagian data' : 'sebagian data'} — belum ikut ${r.need.join(', ')}. HRV dan resting HR baru dipakai setelah 5 hari tercatat, supaya ada pembanding.</p>` : '');
  }

  /* ================= BODY FIT (intervals.icu) ================= */
  function connectBlock(reason, short) {
    const msg = {
      no_backend:     ['Belum tersambung', 'Halaman ini masih dilayani GitHub Pages yang tidak bisa menjalankan kode server. Pindahkan hosting ke Vercel supaya intervals.icu bisa ditarik dengan aman.'],
      not_configured: ['Perlu API key', 'Isi INTERVALS_API_KEY dan INTERVALS_ATHLETE_ID di Environment Variables Vercel, lalu redeploy.'],
      offline:        ['Sedang offline', 'Angka terakhir akan muncul lagi begitu ada internet.'],
      error:          ['Gagal menarik data', 'intervals.icu menolak permintaan. Cek API key di pengaturan Vercel.']
    }[reason] || ['Belum ada data', 'Belum ada yang bisa ditampilkan.'];
    if (short) return `<div class="connect"><p>${msg[0]} — lihat kartu Body fit.</p></div>`;
    return `<div class="connect"><div class="st">${msg[0]}</div><p>${msg[1]}</p></div>`;
  }

  function renderFit() {
    const el = $('#fit-body'), src = $('#fit-src');
    if (!wellness || !wellness.ok) { src.textContent = ''; el.innerHTML = connectBlock(wellness && wellness.reason); return; }
    src.textContent = wellness.cached ? 'intervals.icu · tersimpan' : 'intervals.icu';
    const rows = wellness.data.filter(d => d.ctl != null);
    if (!rows.length) { el.innerHTML = `<p class="empty-note">Belum ada data fitness di intervals.icu.</p>`; return; }
    const w = rows[rows.length - 1];
    const form = w.form;
    const state = form == null ? '' : form > 5 ? 'Segar' : form > -10 ? 'Seimbang' : form > -20 ? 'Terbebani' : 'Kelelahan';
    el.innerHTML = `<div class="stats" style="margin:0">
        <div class="stat"><div class="k">Fitness</div><div class="v">${Math.round(w.ctl)}</div></div>
        <div class="stat"><div class="k">Fatigue</div><div class="v">${Math.round(w.atl)}</div></div>
        <div class="stat"><div class="k">Form</div><div class="v">${form > 0 ? '+' : ''}${form}<span class="u">${state}</span></div></div>
      </div>
      <p class="note-sm" style="margin:11px 0 0">Fitness naik pelan lewat latihan rutin. Form di bawah −20 artinya beban akut jauh di atas kapasitas — itu zona rawan cedera, bukan zona adaptasi.</p>`;
  }

  /* ================= RENCANA HARI INI ================= */
  function renderPlan() {
    const p = PLAN.today(UI.dow(today), today);
    const t = logOf(today);
    const d = t.daily || {};
    const kindCls = p.day.kind === 'st' ? 'st' : p.day.kind === 'run' ? 'run' : 'flex';
    const kindTxt = p.day.kind === 'st' ? 'Strength' : p.day.kind === 'run' ? 'Lari' : 'Fleksibel';
    const dose = { full: 'dosis penuh', light: 'dosis ringan', moderate: 'dosis sedang' }[p.day.dose];

    const trk = (key, label, list) => `<button class="trk" data-track="${key}" type="button" aria-pressed="${!!d[key]}">
        <span class="box"></span>
        <span class="t"><span class="n">${label}</span><span class="d">${list.map(x => x[0]).join(' · ')}</span></span>
      </button>`;

    $('#plan-body').innerHTML =
      `<span class="kind ${kindCls}">${kindTxt}</span>
       <h3 class="plan-title">${p.day.title}</h3>
       <p class="plan-sub">${p.day.sub}</p>
       <div class="card-head" style="margin-bottom:9px"><h2>Daily-track — ${dose}</h2></div>
       <div class="track">
         ${trk('abs',  'Abs',              p.track.abs)}
         ${trk('calf', 'Calf · ankle',     p.track.calf)}
         ${trk('hip',  'Hip flexor · glute', p.track.hip)}
       </div>`;
    $('#plan-detail').hidden = false;
  }

  function openProgram(which) {
    const p = PLAN.today(UI.dow(today), today);
    const list = (arr, numbered) => `<div class="exlist">` + arr.map((x, i) =>
      `<div class="ex"><div class="n">${numbered ? i + 1 : '·'}</div><div>
        <div class="nm">${x[0]}</div><div class="ds">${x[1]}</div>${x[2] ? `<div class="nt">${x[2]}</div>` : ''}
      </div></div>`).join('') + `</div>`;

    let html = '';
    if (which === 'all') {
      $('#prog-title').textContent = 'Program lengkap';
      html = `<div class="prog-sec">Sesi A — Lower Power &amp; Posterior Chain</div>${list(PLAN.sesiA, true)}
              <div class="prog-sec">Sesi B — Upper Toning + Hip Flexor/Glute</div>${list(PLAN.sesiB, true)}`;
    } else {
      $('#prog-title').textContent = p.day.title;
      if (p.session) html += `<div class="prog-sec">Sesi gym</div>${list(p.session, true)}`;
      html += `<div class="prog-sec">Abs</div>${list(p.track.abs)}
               <div class="prog-sec">Calf · ankle · soleus</div>${list(p.track.calf)}
               <div class="prog-sec">Hip flexor &amp; glute</div>${list(p.track.hip)}`;
      if (!p.session) html += `<p class="note-sm" style="margin-top:16px">Hari ini tidak ada sesi gym terjadwal. Sesi lari dari coach dibuat di TrainingPeaks dan tidak ditarik ke sini — hasilnya muncul di tab Performa setelah aktivitas selesai.</p>`;
    }
    $('#prog-content').innerHTML = html;
    UI.openSheet('prog-sheet');
  }

  /* ================= LARI TERAKHIR ================= */
  const RUNTYPE = t => /run/i.test(t || '');
  const GYMTYPE = t => /weight|strength/i.test(t || '');

  function renderLastRun() {
    const el = $('#lastrun-body');
    if (!activities || !activities.ok) { el.innerHTML = connectBlock(activities && activities.reason, true); return; }
    const runs = activities.data.filter(a => RUNTYPE(a.type)).sort((a, b) => a.start < b.start ? 1 : -1);
    if (!runs.length) { el.innerHTML = `<p class="empty-note">Belum ada aktivitas lari dalam 6 minggu terakhir.</p>`; return; }
    el.innerHTML = actCard(runs[0]);
  }

  function actCard(a) {
    return `<div class="act">
      <div class="top"><span class="nm">${a.name || 'Lari'}</span><span class="dt">${UI.fmt(a.date)}</span></div>
      <div class="grid4">
        <div><div class="k">Jarak</div><div class="v">${a.km != null ? a.km : '—'}<span class="u"> km</span></div></div>
        <div><div class="k">Pace</div><div class="v">${UI.pace(a.pace_s_per_km)}</div></div>
        <div><div class="k">Waktu</div><div class="v">${UI.dur(a.moving_s)}</div></div>
        <div><div class="k">${a.avg_power ? 'Power' : 'HR'}</div><div class="v">${a.avg_power ? Math.round(a.avg_power) + 'w' : (a.avg_hr ? Math.round(a.avg_hr) : '—')}</div></div>
      </div></div>`;
  }

  /* ================= INSIGHT ================= */
  function renderInsight() {
    const p = PLAN.today(UI.dow(today), today);
    let lastPhotoDays = null;
    if (photos.length) {
      const last = photos.map(x => x.key.slice(0, 10)).sort().pop();
      lastPhotoDays = Math.round((UI.parse(today) - UI.parse(last)) / 86400000);
    }
    const list = Insight.build({
      logs, goals, plan: p, dateKey: today, lastPhotoDays,
      wellness: (wellness && wellness.ok) ? wellness.data.filter(d => d.ctl != null) : null
    });
    $('#c-insight').hidden = !list.length;
    $('#insight-body').innerHTML = list.slice(0, 4)
      .map(i => `<div class="ins ${i.level}"><i></i><p>${i.text}</p></div>`).join('');
  }

  /* ================= TUBUH ================= */
  function statTile(k, v, u, empty) {
    return `<div class="stat${empty ? ' empty' : ''}"><div class="k">${k}</div><div class="v">${v}${u ? `<span class="u">${u}</span>` : ''}</div></div>`;
  }

  function renderBody() {
    const wm = wellnessMap();
    const autoCount = Object.values(wm).filter(d => d.rhr != null || d.sleep_h != null || d.hrv != null).length;
    const rn = document.getElementById('rec-note');
    if (rn) rn.textContent = autoCount
      ? `${autoCount} hari data recovery sudah masuk otomatis dari intervals.icu. Angka yang kamu ketik manual selalu menimpa yang otomatis.`
      : 'Zepp tidak punya API resmi. Sambungkan jam ke intervals.icu, atau ketik tidur, HRV, dan resting HR manual tiap pagi — sekitar 15 detik.';
    const t = logOf(today);
    const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
    const last7 = f => logs.slice(-7).map(l => l.value[f]).filter(v => v != null);

    /* recovery — gabungan manual + intervals.icu */
    const rec = mergedRecovery();
    const rser = f => rec.slice(-30).filter(r => r[f] != null)
                      .map(r => ({ v: r[f], label: UI.shortDate(r.key).dm }));
    const r7 = f => rec.slice(-7).map(r => r[f]).filter(v => v != null);
    const s7 = avg(r7('sleep'));
    const rd = readiness();
    $('#rec-stats').innerHTML =
      statTile('Tidur 7 hari', s7 == null ? 'belum' : s7.toFixed(1), s7 == null ? '' : ' j', s7 == null) +
      statTile('HRV', rd.hrv == null ? 'belum' : rd.hrv, rd.hrv == null ? '' : ' ms', rd.hrv == null) +
      statTile('Resting HR', rd.rhr == null ? 'belum' : rd.rhr, rd.rhr == null ? '' : ' bpm', rd.rhr == null);
    UI.lineChart($('#chart-sleep'), rser('sleep'), { dp: 1, target: goals.sleep_target_h });
    UI.lineChart($('#chart-hrv'),   rser('hrv'),   { dp: 0, empty: 'Belum ada HRV. Cek di intervals.icu apakah jam/ring-mu benar-benar mengirim HRV — kalau di sana kosong juga, isi manual dari Zepp.' });
    UI.lineChart($('#chart-rhr'),   rser('rhr'),   { dp: 0 });

    /* nutrisi */
    const c7 = avg(last7('cal')), p7 = avg(last7('protein'));
    $('#nut-stats').innerHTML =
      statTile('Kalori 7 hari', c7 == null ? 'belum' : Math.round(c7), c7 == null ? '' : ' kkal', c7 == null) +
      statTile('Protein 7 hari', p7 == null ? 'belum' : Math.round(p7), p7 == null ? '' : ' g', p7 == null) +
      statTile('Target protein', goals.protein_target_g, ' g');
    UI.lineChart($('#chart-cal'),  series('cal'),     { dp: 0, target: goals.cal_target });
    UI.lineChart($('#chart-prot'), series('protein'), { dp: 0, target: goals.protein_target_g });
    const nl = logs.slice(-7).reverse();
    $('#nut-list').innerHTML = nl.length ? nl.map(r => {
      const v = r.value, dt = UI.shortDate(r.key);
      const bits = [];
      if (v.cal != null) bits.push(`<b>${v.cal}</b> kkal`);
      if (v.protein != null) bits.push(`<b>${v.protein}</b> g P`);
      return `<div class="rowitem"><div class="d">${dt.dow}<br>${dt.dm}</div><div class="m">${bits.join(' · ') || '—'}</div>
        <div class="tags"><span class="tag${v.vit_am ? ' on' : ''}">AM</span><span class="tag${v.vit_pm ? ' on' : ''}">PM</span></div></div>`;
    }).join('') : `<p class="empty-note">Belum ada catatan makan.</p>`;

    /* body progress */
    const w = logs.filter(l => l.value.weight != null);
    const first = w.length ? w[0].value.weight : null, lastW = w.length ? w[w.length - 1].value.weight : null;
    const dW = (first != null && lastW != null) ? lastW - first : null;
    $('#prog-stats').innerHTML =
      statTile('Berat', lastW == null ? 'belum' : lastW.toFixed(1), lastW == null ? '' : ' kg', lastW == null) +
      statTile('Perubahan', dW == null ? '—' : (dW > 0 ? '+' : '') + dW.toFixed(1), dW == null ? '' : ' kg', dW == null) +
      statTile('Target BF', goals.bf_target_pct, ' %');
    UI.lineChart($('#chart-weight'), series('weight', 60), { dp: 1 });
    UI.lineChart($('#chart-bf'), series('bf', 60), { dp: 1, target: goals.bf_target_pct });
    renderPhotoGrid();
  }

  function renderPhotoGrid() {
    const el = $('#photo-grid');
    if (!photos.length) { el.innerHTML = `<p class="empty-note">Belum ada foto. Tambahkan lewat Catat → Foto.</p>`; return; }
    const dates = [...new Set(photos.map(p => p.key.slice(0, 10)))].sort().reverse().slice(0, 8);
    el.innerHTML = dates.map(d => `<div class="photo-row"><div class="lab">${UI.fmt(d)}</div>
      <div class="photo-grid">${ANGLES.map(([a]) => {
        const p = photos.find(x => x.key === d + '-' + a);
        return p ? `<img src="${p.value.image}" alt="${a}">`
                 : `<div style="aspect-ratio:3/4;border-radius:8px;background:var(--sunk)"></div>`;
      }).join('')}</div></div>`).join('');
  }

  /* ================= PERFORMA ================= */
  function renderPerf() {
    /* lari */
    const rs = $('#run-stats'), rl = $('#run-list');
    if (!activities || !activities.ok) {
      rs.innerHTML = ''; rl.innerHTML = connectBlock(activities && activities.reason);
    } else {
      const runs = activities.data.filter(a => RUNTYPE(a.type)).sort((a, b) => a.start < b.start ? 1 : -1);
      const km28 = runs.filter(a => UI.parse(a.date) >= new Date(Date.now() - 28 * 86400000))
                       .reduce((s, a) => s + (a.km || 0), 0);
      const paces = runs.slice(0, 10).map(a => a.pace_s_per_km).filter(Boolean);
      rs.innerHTML =
        statTile('Jarak 28 hari', km28.toFixed(1), ' km') +
        statTile('Sesi', String(runs.length), '') +
        statTile('Pace rata2', paces.length ? UI.pace(paces.reduce((a, b) => a + b, 0) / paces.length) : '—', '');
      rl.innerHTML = runs.length ? runs.slice(0, 15).map(actCard).join('')
                                 : `<p class="empty-note">Belum ada aktivitas lari.</p>`;
    }

    /* kekuatan — dari catatan sendiri, bukan intervals.icu */
    const st14 = logs.slice(-14).filter(l => l.value.st).length;
    const st7  = logs.slice(-7).filter(l => l.value.st).length;
    const dts  = logs.slice(-7).filter(l => { const d = l.value.daily || {}; return d.abs && d.calf && d.hip; }).length;
    $('#st-stats').innerHTML =
      statTile('ST 7 hari', String(st7), ' sesi') +
      statTile('ST 14 hari', String(st14), ' sesi') +
      statTile('Daily lengkap', String(dts), '/7');

    const start = new Date(); start.setDate(start.getDate() - start.getDay());
    $('#st-week').innerHTML = `<div class="loglist">` + [1, 2, 3, 4, 5, 6, 0].map(dw => {
      const d = new Date(start); d.setDate(start.getDate() + (dw === 0 ? 7 : dw));
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const w = PLAN.week[dw], v = logOf(key), dd = v.daily || {};
      const done = ['abs', 'calf', 'hip'].filter(k => dd[k]).length;
      const isToday = key === today;
      return `<div class="rowitem"${isToday ? ' style="background:var(--accent-soft);border-radius:9px;padding-left:8px;padding-right:8px"' : ''}>
        <div class="d">${UI.DAYS[dw].slice(0, 3)}<br>${d.getDate()}</div>
        <div class="m"><b>${w.title}</b></div>
        <div class="tags">${w.st ? `<span class="tag${v.st ? ' on' : ''}">ST</span>` : `<span class="tag${v.run ? ' on' : ''}">LARI</span>`}<span class="tag${done === 3 ? ' on' : ''}">${done}/3</span></div></div>`;
    }).join('') + `</div>`;

    /* Sesi gym yang tercatat di Hevy/Strava ikut sampai ke intervals.icu sebagai
       WeightTraining. Ditampilkan di sini supaya durasi & load-nya tidak hilang. */
    const gymEl = $('#st-gym');
    if (gymEl) {
      if (!activities || !activities.ok) gymEl.innerHTML = connectBlock(activities && activities.reason, true);
      else {
        const gyms = activities.data.filter(x => GYMTYPE(x.type)).sort((x, y) => x.start < y.start ? 1 : -1);
        gymEl.innerHTML = gyms.length ? `<div class="loglist">` + gyms.slice(0, 10).map(x => {
          const dt = UI.shortDate(x.date);
          const bits = [];
          if (x.moving_s) bits.push(`<b>${UI.dur(x.moving_s)}</b>`);
          if (x.load != null) bits.push(`load <b>${x.load}</b>`);
          if (x.avg_hr) bits.push(`${Math.round(x.avg_hr)} bpm`);
          return `<div class="rowitem"><div class="d">${dt.dow}<br>${dt.dm}</div>
            <div class="m">${bits.join(' · ') || x.name || '—'}</div><div></div></div>`;
        }).join('') + `</div>`
          : `<p class="empty-note">Belum ada sesi WeightTraining di intervals.icu. Kalau kamu log di Hevy dan Hevy tersambung ke Strava, sesinya akan muncul di sini.</p>`;
      }
    }

    const p = PLAN.today(UI.dow(today), today);
    $('#st-program').innerHTML = p.session
      ? `<p class="note-sm" style="margin:0 0 10px">${p.day.title} — ${p.session.length} latihan.</p>` +
        `<button class="btn ghost sm" id="open-today-prog" type="button">Buka sesi hari ini</button>`
      : `<p class="note-sm" style="margin:0">Hari ini tidak ada sesi gym. Sesi lari dari coach dibuat di TrainingPeaks — app ini hanya menampilkan hasilnya setelah selesai.</p>`;
    const b = $('#open-today-prog'); if (b) b.onclick = () => openProgram('today');

    /* olahraga lain */
    const ol = $('#other-list');
    if (!activities || !activities.ok) { ol.innerHTML = connectBlock(activities && activities.reason); }
    else {
      const others = activities.data.filter(a => !RUNTYPE(a.type) && !GYMTYPE(a.type)).sort((a, b) => a.start < b.start ? 1 : -1);
      ol.innerHTML = others.length ? others.slice(0, 15).map(actCard).join('')
        : `<p class="empty-note">Belum ada olahraga lain (di luar lari dan angkat beban) dalam 6 minggu terakhir.</p>`;
    }
  }

  /* ================= PROFIL ================= */
  function renderProfile() {
    $('#p-name').value = profile.name || '';
    $('#g-race').value  = goals.race_date;
    $('#g-prot').value  = goals.protein_target_g;
    $('#g-cal').value   = goals.cal_target;
    $('#g-sleep').value = goals.sleep_target_h;
    $('#g-bf').value    = goals.bf_target_pct;
    $('#g-tdee').value  = goals.tdee_low;

    const st = (r, ok) => `<div class="rowitem"><div class="d">${r}</div><div class="m">${ok}</div><div></div></div>`;
    const w = wellness && wellness.ok, a = activities && activities.ok;
    $('#conn-body').innerHTML = `<div class="loglist">
      ${st('Lokal', '<b>Aktif</b> — ' + logs.length + ' catatan, ' + photos.length + ' foto')}
      ${st('intervals.icu', w || a ? '<b>Tersambung</b>' + (wellness && wellness.cached ? ' (tersimpan)' : '') : '<b>Belum</b> — ' + (wellness && wellness.reason === 'no_backend' ? 'butuh hosting Vercel' : 'cek API key di Vercel'))}
      ${st('Zepp', 'Manual — tidak ada API resmi')}
    </div>`;
  }

  function renderHeader() {
    const h = new Date().getHours();
    $('#greet').textContent = 'Selamat ' + (h < 11 ? 'pagi' : h < 15 ? 'siang' : h < 18 ? 'sore' : 'malam') + (profile.name ? ', ' + profile.name : '');
    $('#date').textContent = UI.fmt(today, true);
    const d = UI.daysUntil(goals.race_date);
    $('#countdown').hidden = !(d >= 0 && d <= 120);
    $('#cd-n').textContent = d;
    if (profile.photo) { $('#avatar-img').src = profile.photo; $('#avatar-img').hidden = false; $('#avatar-fallback').hidden = true; }
    else { $('#avatar-img').hidden = true; $('#avatar-fallback').hidden = false; $('#avatar-fallback').textContent = (profile.name || 'R')[0].toUpperCase(); }
  }

  function renderAll() {
    renderHeader(); renderReadiness(); renderFit(); renderPlan();
    renderLastRun(); renderInsight(); renderBody(); renderPerf(); renderProfile();
  }

  /* ================= SHEET CATAT ================= */
  const F = { weight: 'f-weight', bf: 'f-bf', sleep: 'f-sleep', hrv: 'f-hrv', rhr: 'f-rhr',
              cal: 'f-cal', protein: 'f-protein', dist: 'f-dist', notes: 'f-notes' };

  function fillSheet() {
    const v = logOf(today);
    for (const k in F) {
      const el = document.getElementById(F[k]);
      el.value = (v[k] == null) ? '' : v[k];
    }
    const set = (id, on) => $(id).setAttribute('aria-pressed', String(!!on));
    set('#t-st', v.st); set('#t-run', v.run); set('#t-vam', v.vit_am); set('#t-vpm', v.vit_pm);
    const d = v.daily || {};
    set('#t-abs', d.abs); set('#t-calf', d.calf); set('#t-hip', d.hip);
    $('#f-dist-wrap').hidden = !v.run;
    $('#sheet-date').textContent = 'Catat — ' + UI.fmt(today);
    renderSlots();
  }

  function readSheet() {
    const v = Object.assign({}, logOf(today));
    for (const k in F) {
      const el = document.getElementById(F[k]);
      v[k] = (k === 'notes') ? (el.value.trim() || null) : num(el.value);
    }
    const on = id => $(id).getAttribute('aria-pressed') === 'true';
    v.st = on('#t-st'); v.run = on('#t-run'); v.vit_am = on('#t-vam'); v.vit_pm = on('#t-vpm');
    v.daily = { abs: on('#t-abs'), calf: on('#t-calf'), hip: on('#t-hip') };
    v.updated_at = new Date().toISOString();
    return v;
  }

  async function saveLog(v, msgEl) {
    await Store.put('logs', today, v);
    logs = logs.filter(l => l.key !== today).concat([{ key: today, value: v }]).sort((a, b) => a.key < b.key ? -1 : 1);
    renderAll();
    if (msgEl) {
      msgEl.textContent = 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      clearTimeout(saveLog._t); saveLog._t = setTimeout(() => { msgEl.textContent = ''; }, 2600);
    }
  }

  function renderSlots() {
    $('#photo-slots').innerHTML = ANGLES.map(([a, label]) => {
      const p = photos.find(x => x.key === today + '-' + a);
      return `<label class="pslot${p ? ' has' : ''}" for="ph-${a}">
        ${p ? `<img src="${p.value.image}" alt="">` : ''}<span>${label}</span>
        <input id="ph-${a}" type="file" accept="image/*" capture="environment" data-angle="${a}"></label>`;
    }).join('');
    $$('#photo-slots input').forEach(inp => inp.addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      const msg = $('#saved'); msg.textContent = 'Mengompres foto…'; msg.classList.remove('bad');
      try {
        const url = await Store.compress(file);
        const key = today + '-' + e.target.dataset.angle;
        await Store.put('photos', key, { image: url, at: new Date().toISOString() });
        photos = await Store.all('photos');
        renderSlots(); renderPhotoGrid(); renderInsight();
        msg.textContent = 'Foto tersimpan.';
      } catch (err) {
        msg.textContent = 'Gagal: ' + err.message; msg.classList.add('bad');
      }
    }));
  }

  /* ================= WIRING ================= */
  function wire() {
    $$('.nav button[data-go]').forEach(b => b.onclick = () => UI.nav(b.dataset.go));
    $('#log-btn').onclick = () => { fillSheet(); UI.openSheet('log-sheet'); };
    $('#avatar').onclick = () => UI.nav('profile');
    $('#plan-detail').onclick = () => openProgram('today');
    $('#open-program').onclick = () => openProgram('all');

    $$('.view .subtabs button').forEach(b => {
      b.onclick = () => UI.subnav(b.closest('.view').dataset.view, b.dataset.sub);
    });
    $$('.sheet-tabs button').forEach(b => b.onclick = () => showLogPanel(b.dataset.log));
    $$('[data-open-log]').forEach(b => b.onclick = () => {
      fillSheet(); showLogPanel(b.dataset.openLog); UI.openSheet('log-sheet');
    });
    $$('[data-close-sheet]').forEach(b => b.onclick = () => UI.closeSheet(b.dataset.closeSheet));

    $$('.tg').forEach(b => b.onclick = () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      if (b.id === 't-run') $('#f-dist-wrap').hidden = !on;
    });

    /* daily-track dicentang langsung dari Beranda — ini interaksi paling sering */
    document.addEventListener('click', async e => {
      const t = e.target.closest('.trk'); if (!t) return;
      const v = Object.assign({}, logOf(today));
      v.daily = Object.assign({ abs: false, calf: false, hip: false }, v.daily);
      v.daily[t.dataset.track] = !v.daily[t.dataset.track];
      v.updated_at = new Date().toISOString();
      await saveLog(v);
    });

    $('#save').onclick = async () => { await saveLog(readSheet(), $('#saved')); };

    $('#p-save').onclick = async () => {
      profile.name = $('#p-name').value.trim() || 'Rausyan';
      await Store.put('meta', 'profile', profile);
      renderHeader(); flash('#p-msg', 'Profil disimpan.');
    };
    $('#p-photo').onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        profile.photo = await Store.compress(f, 90 * 1024);
        await Store.put('meta', 'profile', profile);
        renderHeader(); flash('#p-msg', 'Foto profil diganti.');
      } catch (err) { flash('#p-msg', 'Gagal: ' + err.message, true); }
    };

    $('#g-save').onclick = async () => {
      goals.race_date = $('#g-race').value || goals.race_date;
      goals.protein_target_g = num($('#g-prot').value) ?? goals.protein_target_g;
      goals.cal_target = num($('#g-cal').value) ?? goals.cal_target;
      goals.sleep_target_h = num($('#g-sleep').value) ?? goals.sleep_target_h;
      goals.bf_target_pct = num($('#g-bf').value) ?? goals.bf_target_pct;
      goals.tdee_low = num($('#g-tdee').value) ?? goals.tdee_low;
      await Store.put('meta', 'goals', goals);
      renderAll(); flash('#g-msg', 'Target disimpan.');
    };

    $('#conn-refresh').onclick = async () => {
      flash('#conn-body', ''); await Api.clearCache(); await pull(); renderAll();
    };

    $('#export').onclick = async () => {
      const blob = new Blob([JSON.stringify(await Store.export(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'arete-backup-' + today + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    };
    $('#import').onchange = e => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        try { const n = await Store.import(JSON.parse(r.result)); await load(); flash('#io-msg', n + ' catatan dipulihkan.'); }
        catch (err) { flash('#io-msg', 'Gagal: ' + err.message, true); }
      };
      r.readAsText(f);
    };

    $('#wipe-today').onclick = async () => {
      await Store.del('logs', today);
      logs = logs.filter(l => l.key !== today);
      renderAll(); flash('#wipe-msg', 'Catatan hari ini dihapus.');
    };
    let armed = false, armT = null;
    $('#wipe-all').onclick = async () => {
      const b = $('#wipe-all');
      if (!armed) {
        armed = true; b.classList.add('armed'); b.textContent = 'Ketuk lagi untuk hapus';
        flash('#wipe-msg', 'Yakin? Semua catatan dan foto hilang permanen.', true);
        clearTimeout(armT);
        armT = setTimeout(() => { armed = false; b.classList.remove('armed'); b.textContent = 'Hapus semua data'; }, 6000);
        return;
      }
      clearTimeout(armT); armed = false; b.classList.remove('armed'); b.textContent = 'Hapus semua data';
      await Store.clear('logs'); await Store.clear('photos');
      logs = []; photos = []; renderAll();
      flash('#wipe-msg', 'Semua catatan dan foto dihapus.');
    };

    const names = { auto: 'Tema: otomatis', day: 'Tema: siang', night: 'Tema: malam' };
    $('#theme-cycle').textContent = names[Theme.pref];
    $('#theme-cycle').onclick = () => {
      const o = ['auto', 'day', 'night'];
      const nx = o[(o.indexOf(Theme.pref) + 1) % 3];
      Theme.set(nx); $('#theme-cycle').textContent = names[nx];
    };

    UI.armScroll();
  }

  function showLogPanel(key) {
    $$('.log-panel').forEach(p => p.classList.toggle('on', p.dataset.logPanel === key));
    $$('.sheet-tabs button').forEach(b => {
      if (b.dataset.log === key) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
  }

  function flash(sel, txt, bad) {
    const el = $(sel); if (!el) return;
    el.textContent = txt; el.classList.toggle('bad', !!bad);
    clearTimeout(flash['_' + sel]);
    flash['_' + sel] = setTimeout(() => { el.textContent = ''; el.classList.remove('bad'); }, 3000);
  }

  /* ================= BOOT ================= */
  async function load() {
    const g = await Store.get('meta', 'goals');
    goals = Object.assign({}, window.DEFAULT_GOALS, g || {});
    if (!g) await Store.put('meta', 'goals', goals);
    const pr = await Store.get('meta', 'profile');
    if (pr) profile = Object.assign(profile, pr);
    logs = (await Store.all('logs')).sort((a, b) => a.key < b.key ? -1 : 1);
    photos = await Store.all('photos');
    renderAll();
  }

  async function pull() {
    [wellness, activities] = await Promise.all([Api.wellness(60), Api.activities(42)]);
  }

  (async function boot() {
    wire();
    let view = 'home';
    try { view = localStorage.getItem('arete_view') || 'home'; } catch (e) {}
    UI.nav(view);
    ['body', 'perf'].forEach(v => {
      let s = null; try { s = localStorage.getItem('arete_sub_' + v); } catch (e) {}
      if (s) UI.subnav(v, s);
    });
    showLogPanel('makan');
    await load();
    Splash.start();
    pull().then(renderAll);           // data intervals.icu menyusul, UI tidak menunggu
    setInterval(() => {
      const k = UI.todayKey();
      if (k !== today) { today = k; renderAll(); }   // lewat tengah malam
    }, 60000);
  })();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
