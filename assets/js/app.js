/* Areté — logika aplikasi.
   Beranda · Tubuh · Catat · Performa · Profil
   Data lokal (IndexedDB) + intervals.icu lewat serverless function sendiri. */
(function () {
  const $  = s => document.querySelector(s);
  const $$ = s => [].slice.call(document.querySelectorAll(s));
  const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
  const ANGLES = [['abs','Perut'],['side','Samping'],['back','Punggung'],['arms','Lengan']];
  const p2 = n => String(n).padStart(2,'0');
  const keyOf = d => d.getFullYear()+'-'+p2(d.getMonth()+1)+'-'+p2(d.getDate());

  let goals   = Object.assign({}, window.DEFAULT_GOALS);
  let profile = { name:'Rausyan', photo:null };
  let targets = null;
  let logs = [], photos = [], wellness = null, activities = null;
  let today = UI.todayKey();
  let sel   = today;                       // hari yang sedang dilihat

  const logOf = k => (logs.find(l => l.key === k) || {}).value || {};
  const median = a => { if(!a.length) return null; const s=a.slice().sort((x,y)=>x-y); return s[Math.floor(s.length/2)]; };
  const avg = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : null;
  const clamp = (v,lo,hi) => Math.max(lo, Math.min(hi, v));

  function launchDate() {
    if (goals.launch_date) return goals.launch_date;
    if (logs.length) return logs[0].key;
    return today;
  }

  /* Recovery bisa datang dari dua arah: diketik manual, atau lewat intervals.icu.
     Manual selalu menang — itu yang paling sengaja dimasukkan. */
  function wellnessMap() {
    const m = {};
    if (wellness && wellness.ok) wellness.data.forEach(d => { m[d.date] = d; });
    return m;
  }
  function mergedRecovery() {
    const wm = wellnessMap();
    const keys = [...new Set(logs.map(l=>l.key).concat(Object.keys(wm)))].sort();
    return keys.map(k => {
      const l = logOf(k), w = wm[k] || {};
      return { key:k,
        sleep: l.sleep!=null ? l.sleep : (w.sleep_h ?? null),
        hrv:   l.hrv  !=null ? l.hrv   : (w.hrv ?? null),
        rhr:   l.rhr  !=null ? l.rhr   : (w.rhr ?? null) };
    });
  }

  /* ================= KESIAPAN ================= */
  function readiness(dayKey) {
    const day = dayKey || sel;
    const rec = mergedRecovery().filter(r => r.key <= day);
    const hist = rec.slice(-30);
    const pick = f => {
      const t = rec.find(r => r.key === day);
      if (t && t[f] != null) return t[f];
      const back = rec.filter(r => r[f]!=null).slice(-1)[0];
      return back ? back[f] : null;
    };
    const sleep = pick('sleep'), hrv = pick('hrv'), rhr = pick('rhr');
    const hrvHist = hist.map(r=>r.hrv).filter(v=>v!=null);
    const rhrHist = hist.map(r=>r.rhr).filter(v=>v!=null);
    /* Di bawah 5 catatan, baseline-nya adalah angka itu sendiri — perbandingan
       jadi selalu "normal" dan skornya bohong. Komponen itu dilewati dulu. */
    const MIN = 5;
    const bHrv = hrvHist.length >= MIN ? median(hrvHist) : null;
    const bRhr = rhrHist.length >= MIN ? median(rhrHist) : null;
    const target = goals.sleep_target_h || 7;
    const parts = [];
    if (sleep != null) parts.push([0.40, clamp(100 - Math.max(0,target-sleep)*30, 0, 100)]);
    if (hrv != null && bHrv) parts.push([0.35, clamp(100 + (hrv/bHrv-1)*200, 40, 112)]);
    if (rhr != null && bRhr) parts.push([0.25, clamp(100 + (1-rhr/bRhr)*300, 40, 112)]);
    if (!parts.length) return { score:null, sleep, hrv, rhr, need:[] };
    const wsum = parts.reduce((s,p)=>s+p[0],0);
    const score = Math.round(clamp(parts.reduce((s,p)=>s+p[0]*p[1],0)/wsum, 0, 100));
    const need = [];
    if (sleep == null) need.push('tidur');
    if (!bHrv) need.push(hrv==null ? 'HRV' : 'HRV ('+hrvHist.length+'/'+MIN+' hari)');
    if (!bRhr) need.push(rhr==null ? 'resting HR' : 'resting HR ('+rhrHist.length+'/'+MIN+' hari)');
    return { score, sleep, hrv, rhr, need };
  }
  const scoreColor = s => s==null ? 'var(--fg-3)' : s>=75 ? 'var(--good)' : s>=55 ? 'var(--mid)' : 'var(--low)';

  /* ================= NAVIGASI HARI ================= */
  function renderDayNav() {
    const isToday = sel === today;
    $('#day-label').textContent = isToday ? 'HARI INI' : UI.fmt(sel, true).split(',')[0].toUpperCase();
    const d = UI.parse(sel);
    $('#day-num').textContent = d.getDate() + ' ' + ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][d.getMonth()];
    $('#day-prev').disabled = sel <= launchDate();
    $('#day-next').disabled = isToday;
  }
  function stepDay(n) {
    const d = UI.parse(sel); d.setDate(d.getDate() + n);
    const k = keyOf(d);
    if (k < launchDate() || k > today) return;
    sel = k; renderAll();
  }

  /* ================= VONIS HARI ================= */
  function verdict() {
    const v = logOf(sel), r = readiness(sel);
    const nama = profile.name ? ', ' + profile.name : '';
    const dd = v.daily || {};
    const dailyDone = ['abs','calf','hip'].filter(k=>dd[k]).length;
    const trained = !!(v.st || v.run);
    const empty = !Object.keys(v).length;
    const isToday = sel === today;

    if (empty && !r.score) return {
      t: isToday ? 'Belum ada catatan hari ini' + nama : 'Hari ini kosong',
      s: isToday ? 'Ketuk Catat untuk mulai. Satu angka pun sudah cukup.'
                 : 'Tidak ada yang tercatat di tanggal ini.' };

    if (r.score != null && r.score < 50) return {
      t: 'Performa hari belum optimal' + nama,
      s: `Kesiapan ${r.score}${r.sleep!=null?` · tidur ${r.sleep} jam`:''}. Turunkan intensitas, jangan volume.` };

    if (trained && dailyDone === 3) return {
      t: 'Hari yang lengkap' + nama,
      s: `Latihan jalan dan daily-track penuh. Kesiapan ${r.score ?? '—'}.` };

    if (trained) return {
      t: 'Latihan sudah jalan' + nama,
      s: dailyDone ? `Daily-track ${dailyDone}/3 — tinggal sedikit lagi.` : 'Daily-track belum dicentang.' };

    if (r.score != null && r.score >= 75) return {
      t: 'Badan siap dipakai' + nama,
      s: `Kesiapan ${r.score}. Sesi hari ini aman dijalankan penuh.` };

    return { t: 'Belum ada latihan hari ini' + nama,
             s: r.score!=null ? `Kesiapan ${r.score}. Rencana ada di bawah.` : 'Rencana hari ini ada di bawah.' };
  }

  /* ================= TARGET ================= */
  function renderTargets() {
    const list = TARGETS.active(targets, sel);
    const box = $('#targets');
    if (!list.length) { box.hidden = true; return; }
    box.hidden = false;
    $('#tstrip').innerHTML = list.map(t => `<div class="trow">
        <span class="n">${t.days}</span>
        <span class="t"><b>${t.days === 0 ? 'Hari ini — ' : 'hari ke '}${t.name}</b>
        <span>${UI.fmt(t.date, true)}</span></span>
        <span class="k">${t.kind === 'race' ? 'Lomba' : 'Target'}</span>
      </div>`).join('');
    const dots = list.length > 1
      ? `<div class="tdots">${list.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div>` : '';
    box.querySelector('.tdots')?.remove();
    if (dots) box.insertAdjacentHTML('beforeend', dots);
    const strip = $('#tstrip');
    strip.onscroll = () => {
      const i = Math.round(strip.scrollTop / 56);
      box.querySelectorAll('.tdots i').forEach((el,j)=>el.classList.toggle('on', j===i));
    };
  }

  /* ================= HERO KESIAPAN ================= */
  function renderHero() {
    const r = readiness(sel);
    const C = 2*Math.PI*38;
    $('#ring').innerHTML = r.score == null
      ? `<svg viewBox="0 0 88 88"><circle class="bg" cx="44" cy="44" r="38"/></svg><b style="font-size:15px;color:var(--fg-3)">—</b>`
      : `<svg viewBox="0 0 88 88"><circle class="bg" cx="44" cy="44" r="38"/>
         <circle class="fg" cx="44" cy="44" r="38" stroke="${scoreColor(r.score)}"
           stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-r.score/100)).toFixed(1)}"/></svg>
         <b>${r.score}</b><small>siap</small>`;

    const lab = r.score==null ? 'Kesiapan belum terbaca'
      : r.score>=80 ? 'Siap' : r.score>=65 ? 'Cukup siap' : r.score>=50 ? 'Hati-hati' : 'Pulihkan dulu';
    const say = r.score==null
      ? 'Isi tidur, HRV, dan resting HR — atau sambungkan jam ke intervals.icu supaya terisi sendiri.'
      : r.score>=80 ? 'Badan pulih. Sesi berat aman dijalankan penuh.'
      : r.score>=65 ? 'Kondisi wajar. Jalankan rencana, jangan menambah dosis.'
      : r.score>=50 ? 'Pemulihan belum penuh. Turunkan intensitas satu tingkat, volume boleh tetap.'
      : 'Sinyal pemulihan rendah. Ganti dengan easy atau mobility.';
    $('#ready-lab').textContent = lab;
    $('#ready-say').textContent = say;

    /* bar tidur 7 hari terakhir sampai hari yang dilihat */
    const rec = mergedRecovery().filter(x=>x.key<=sel).slice(-7);
    const bars = $('#sleepbars');
    const tgt = goals.sleep_target_h || 7;
    if (rec.filter(x=>x.sleep!=null).length < 2) bars.className = 'sleepbars empty';
    else {
      bars.className = 'sleepbars';
      const mx = Math.max(tgt, ...rec.map(x=>x.sleep||0));
      bars.innerHTML = rec.map(x => {
        const h = x.sleep ? Math.max(6, (x.sleep/mx)*44) : 3;
        const cls = x.key===sel ? 'today' : (x.sleep>=tgt-0.5 ? 'ok' : '');
        return `<div class="${cls}" style="height:${h.toFixed(0)}px" data-d="${UI.shortDate(x.key).dow[0]}" title="${x.key}: ${x.sleep ?? '—'} j"></div>`;
      }).join('');
    }

    const mini = (k,v,u) => `<div><div class="k">${k}</div><div class="v${v==null?' none':''}">${v==null?'belum':v}${v!=null&&u?`<i>${u}</i>`:''}</div></div>`;
    $('#ready-mini').innerHTML = mini('Tidur', r.sleep, 'j') + mini('HRV', r.hrv, 'ms') + mini('Resting HR', r.rhr, 'bpm');
  }

  /* ================= BODY FIT ================= */
  function connectBlock(reason, short) {
    const msg = {
      no_backend:['Belum tersambung','Halaman ini belum dilayani server yang bisa menjalankan kode. Deploy ke Vercel supaya intervals.icu bisa ditarik dengan aman.'],
      not_configured:['Perlu API key','Isi INTERVALS_API_KEY dan INTERVALS_ATHLETE_ID di Environment Variables Vercel, lalu redeploy.'],
      offline:['Sedang offline','Angka terakhir muncul lagi begitu ada internet.'],
      error:['Gagal menarik data','intervals.icu menolak permintaan. Cek API key di Vercel.']
    }[reason] || ['Belum ada data','Belum ada yang bisa ditampilkan.'];
    if (short) return `<div class="connect"><p>${msg[0]} — lihat kartu Body fit.</p></div>`;
    return `<div class="connect"><div class="st">${msg[0]}</div><p>${msg[1]}</p></div>`;
  }

  function fitRows() {
    if (!wellness || !wellness.ok) return null;
    return wellness.data.filter(d => d.ctl != null && d.date <= sel);
  }
  function renderFit() {
    const el = $('#fit-body'), rows = fitRows();
    if (!rows) { el.innerHTML = connectBlock(wellness && wellness.reason); $('#c-fit').disabled = true; return; }
    if (!rows.length) { el.innerHTML = `<p class="empty-note">Belum ada data fitness di intervals.icu.</p>`; $('#c-fit').disabled = true; return; }
    $('#c-fit').disabled = false;
    const w = rows[rows.length-1], form = w.form;
    const state = form==null ? '' : form>5 ? 'Segar' : form>-10 ? 'Seimbang' : form>-20 ? 'Terbebani' : 'Kelelahan';
    const last = rows.slice(-30);
    el.innerHTML = `<div class="fit3">
        <div><div class="k">Fitness</div><div class="v">${Math.round(w.ctl)}</div><div class="s">CTL</div></div>
        <div><div class="k">Fatigue</div><div class="v">${Math.round(w.atl)}</div><div class="s">ATL</div></div>
        <div><div class="k">Form</div><div class="v" style="color:${form>-10?'var(--good)':form>-20?'var(--mid)':'var(--low)'}">${form>0?'+':''}${form}</div><div class="s">${state}</div></div>
      </div>` + sparkline(last)
      + `<div class="legend"><span><i></i>Fitness</span><span class="b"><i></i>Fatigue</span></div>`;
  }
  function sparkline(rows) {
    if (rows.length < 2) return '';
    const W=320,H=74,P=4;
    const all = rows.map(r=>r.ctl).concat(rows.map(r=>r.atl));
    let lo=Math.min(...all), hi=Math.max(...all); if(hi===lo){hi=lo+1;lo-=1;}
    const x=i=>P+(i/(rows.length-1))*(W-2*P), y=v=>P+(1-(v-lo)/(hi-lo))*(H-2*P);
    const path=(f)=>rows.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(r[f]).toFixed(1)).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <path class="fill" d="${path('ctl')} L${x(rows.length-1).toFixed(1)} ${H-P} L${P} ${H-P} Z"/>
      <path class="atl" d="${path('atl')}"/><path class="ctl" d="${path('ctl')}"/></svg>`;
  }

  /* ================= GRAFIK PENUH (gaya Coros) ================= */
  let fullMetric = 'ctl', fullData = [], fullIdx = -1;
  const FULLTABS = [['ctl','Fitness'],['atl','Fatigue'],['form','Form'],['sleep_h','Tidur'],['rhr','Resting HR']];

  function openFull() {
    const rows = fitRows(); if (!rows) return;
    fullData = rows.slice(-60);
    $('#full-chart').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#full-tabs').innerHTML = FULLTABS.map(([k,l]) =>
      `<button data-m="${k}"${k===fullMetric?' aria-current="true"':''} type="button">${l}</button>`).join('');
    $$('#full-tabs button').forEach(b => b.onclick = () => { fullMetric=b.dataset.m; fullIdx=-1; drawFull(); });
    fullIdx = -1; drawFull();
  }
  function closeFull(){ $('#full-chart').hidden = true; document.body.style.overflow=''; }

  function drawFull() {
    $$('#full-tabs button').forEach(b => b.dataset.m===fullMetric ? b.setAttribute('aria-current','true') : b.removeAttribute('aria-current'));
    const stage = $('#full-stage'), rot = $('#full-rot');
    const portrait = window.innerHeight > window.innerWidth;
    rot.style.setProperty('--rw', stage.clientWidth+'px');
    rot.style.setProperty('--rh', stage.clientHeight+'px');
    const W = portrait ? stage.clientHeight : stage.clientWidth;
    const H = portrait ? stage.clientWidth  : stage.clientHeight;

    const pts = fullData.map(d => ({ k:d.date, v:d[fullMetric] })).filter(p=>p.v!=null);
    if (pts.length < 2) { rot.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--fg-3);font-size:13px">Belum cukup data untuk metrik ini.</div>`; $('#full-read').textContent=''; return; }
    const L=46,R=16,T=18,B=34;
    let lo=Math.min(...pts.map(p=>p.v)), hi=Math.max(...pts.map(p=>p.v));
    if(hi===lo){hi=lo+1;lo-=1;} const pad=(hi-lo)*.12; lo-=pad; hi+=pad;
    const x=i=>L+(i/(pts.length-1))*(W-L-R), y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
    const d = pts.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.v).toFixed(1)).join(' ');
    let s='';
    for (let g=0; g<=4; g++){ const v=lo+(hi-lo)*(1-g/4), yy=y(v);
      s+=`<line class="grid" x1="${L}" y1="${yy.toFixed(1)}" x2="${W-R}" y2="${yy.toFixed(1)}"/>`;
      s+=`<text x="6" y="${(yy+4).toFixed(1)}">${v.toFixed(fullMetric==='sleep_h'?1:0)}</text>`; }
    s+=`<path class="fill" d="${d} L${x(pts.length-1).toFixed(1)} ${H-B} L${L} ${H-B} Z"/><path class="line" d="${d}"/>`;
    const i = fullIdx<0 ? pts.length-1 : Math.min(fullIdx, pts.length-1);
    s+=`<line class="cursor" x1="${x(i).toFixed(1)}" y1="${T}" x2="${x(i).toFixed(1)}" y2="${H-B}"/>`;
    s+=`<circle class="knob" cx="${x(i).toFixed(1)}" cy="${y(pts[i].v).toFixed(1)}" r="5.5"/>`;
    s+=`<text x="${L}" y="${H-10}">${UI.fmt(pts[0].k)}</text>`;
    s+=`<text x="${W-R}" y="${H-10}" text-anchor="end">${UI.fmt(pts[pts.length-1].k)}</text>`;
    rot.innerHTML = `<svg class="fchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${s}</svg>`;

    const lbl = (FULLTABS.find(t=>t[0]===fullMetric)||[])[1] || '';
    const unit = fullMetric==='sleep_h' ? ' jam' : fullMetric==='rhr' ? ' bpm' : '';
    $('#full-read').innerHTML = `<b>${(+pts[i].v).toFixed(fullMetric==='sleep_h'?1:0)}${unit}</b> ${lbl} · ${UI.fmt(pts[i].k, true)}`;

    stage.onpointerdown = stage.onpointermove = e => {
      if (e.buttons === 0 && e.type === 'pointermove') return;
      const r0 = stage.getBoundingClientRect();
      /* Saat potret, grafik diputar 90°: sumbu waktu jadi vertikal di layar. */
      const p = portrait ? (e.clientY - r0.top)/r0.height : (e.clientX - r0.left)/r0.width;
      fullIdx = Math.round(clamp(p,0,1) * (pts.length-1));
      drawFull();
    };
  }

  /* ================= RENCANA LATIHAN ================= */
  function renderPlan() {
    const v = logOf(sel);
    const mode = v.st_mode || null;
    const dow = UI.dow(sel);
    const w = PLAN.week[dow];
    const body = $('#plan-body');
    $('#plan-reset').hidden = !mode;

    /* Hari lari murni: tidak ada pertanyaan, hanya daily-track. */
    if (w.st === null) { body.innerHTML = header(w, null) + trackBlock(); return; }

    if (!mode) {
      body.innerHTML = header(w, null) + ask1();
      wireAsk();
      return;
    }
    const p = PLAN.today(dow, sel, mode);
    body.innerHTML = header(w, mode) + (p.session ? table(p.session) : coachNote()) + trackBlock();
    wireLoads();
  }

  function header(w, mode) {
    const tag = mode === 'coach' ? '<span class="modetag coach">Sesi coach</span>'
              : mode === 'gym'  ? '<span class="modetag">Di gym</span>'
              : mode === 'home' ? '<span class="modetag">Di rumah</span>' : '';
    return `<div class="modebar">${tag}<span class="pc-hint">${w.title}</span></div>`;
  }
  function ask1() {
    return `<p class="ask">Hari ini ada sesi ST offline dengan coach?</p>
      <div class="askrow"><button class="askbtn yes" data-ask="coach" type="button">Ya, dengan coach</button>
      <button class="askbtn" data-ask="q2" type="button">Tidak</button></div>`;
  }
  function ask2() {
    return `<p class="ask">Bisa ke gym hari ini?</p>
      <div class="askrow"><button class="askbtn yes" data-ask="gym" type="button">Ya, ke gym</button>
      <button class="askbtn" data-ask="home" type="button">Tidak, di rumah</button></div>`;
  }
  function coachNote() {
    return `<p class="note-sm">Isi sesi ditentukan coach. Daily-track di bawah tetap dikerjakan — bagian itu yang menggerakkan Shock Absorption dan Landing Control di Stryd.</p>`;
  }
  function table(list) {
    const v = logOf(sel), loads = v.loads || {};
    return `<div class="exwrap"><table class="extable">
      <thead><tr><th>Gerakan</th><th class="num">Beban</th><th class="num">Reps</th><th class="num">Set</th></tr></thead>
      <tbody>${list.map((x,i)=>`<tr>
        <td><div class="mg">${x.mg}</div><div class="nm">${x.name}</div>${x.swapped?`<div class="sw">pengganti ${x.from}</div>`:''}</td>
        <td class="num"><input type="text" inputmode="decimal" placeholder="${x.load}" value="${loads[i]??''}" data-load="${i}"></td>
        <td class="num">${x.reps}</td><td class="num">${x.sets}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function trackBlock() {
    const p = PLAN.today(UI.dow(sel), sel, logOf(sel).st_mode);
    const d = logOf(sel).daily || {};
    const dose = { full:'dosis penuh', light:'dosis ringan', moderate:'dosis sedang' }[p.day.dose];
    const trk = (key,label,list) => `<button class="trk" data-track="${key}" type="button" aria-pressed="${!!d[key]}">
        <span class="box"></span><span class="t"><span class="n">${label}</span>
        <span class="d">${list.map(x=>x[1]).join(' · ')}</span></span></button>`;
    return `<div class="pc-head" style="margin:18px 0 9px"><h2>Daily-track — ${dose}</h2></div>
      <div class="track">${trk('abs','Abs',p.track.abs)}${trk('calf','Calf · ankle',p.track.calf)}${trk('hip','Hip flexor · glute',p.track.hip)}</div>`;
  }
  function wireAsk() {
    $$('#plan-body [data-ask]').forEach(b => b.onclick = async () => {
      const a = b.dataset.ask;
      if (a === 'q2') { $('#plan-body').innerHTML = header(PLAN.week[UI.dow(sel)], null) + ask2(); wireAsk(); return; }
      const v = Object.assign({}, logOf(sel));
      v.st_mode = a; v.updated_at = new Date().toISOString();
      await saveLog(v);
    });
  }
  function wireLoads() {
    $$('#plan-body [data-load]').forEach(inp => inp.onchange = async () => {
      const v = Object.assign({}, logOf(sel));
      v.loads = Object.assign({}, v.loads);
      if (inp.value.trim()) v.loads[inp.dataset.load] = inp.value.trim(); else delete v.loads[inp.dataset.load];
      v.updated_at = new Date().toISOString();
      await saveLog(v);
    });
  }

  /* ================= LARI TERAKHIR ================= */
  const RUNTYPE = t => /run/i.test(t||'');
  const GYMTYPE = t => /weight|strength/i.test(t||'');
  function renderLastRun() {
    const el = $('#lastrun-body');
    if (!activities || !activities.ok) { el.innerHTML = connectBlock(activities && activities.reason, true); return; }
    const runs = activities.data.filter(a=>RUNTYPE(a.type) && a.date<=sel).sort((a,b)=>a.start<b.start?1:-1);
    el.innerHTML = runs.length ? actCard(runs[0]) : `<p class="empty-note">Belum ada aktivitas lari.</p>`;
  }
  function actCard(a) {
    return `<div class="act"><div class="top"><span class="nm">${a.name||'Lari'}</span><span class="dt">${UI.fmt(a.date)}</span></div>
      <div class="grid4">
        <div><div class="k">Jarak</div><div class="v">${a.km!=null?a.km:'—'}<span class="u"> km</span></div></div>
        <div><div class="k">Pace</div><div class="v">${UI.pace(a.pace_s_per_km)}</div></div>
        <div><div class="k">Waktu</div><div class="v">${UI.dur(a.moving_s)}</div></div>
        <div><div class="k">${a.avg_power?'Power':'HR'}</div><div class="v">${a.avg_power?Math.round(a.avg_power)+'w':(a.avg_hr?Math.round(a.avg_hr):'—')}</div></div>
      </div></div>`;
  }

  /* ================= INSIGHT ================= */
  function renderInsight() {
    const p = PLAN.today(UI.dow(sel), sel, logOf(sel).st_mode);
    let lastPhotoDays = null;
    if (photos.length) {
      const last = photos.map(x=>x.key.slice(0,10)).sort().pop();
      lastPhotoDays = Math.round((UI.parse(sel)-UI.parse(last))/86400000);
    }
    const list = Insight.build({ logs, goals, plan:p, dateKey:sel, lastPhotoDays,
      wellness: fitRows() });
    $('#c-insight').hidden = !list.length;
    $('#insight-body').innerHTML = list.slice(0,4)
      .map(i=>`<div class="ins ${i.level}"><i></i><p>${i.text}</p></div>`).join('');
  }

  /* ================= TUBUH ================= */
  const statTile = (k,v,u,empty) =>
    `<div class="stat${empty?' empty':''}"><div class="k">${k}</div><div class="v">${v}${u?`<span class="u">${u}</span>`:''}</div></div>`;
  const series = (f,n) => logs.slice(-(n||30)).filter(l=>l.value[f]!=null)
                              .map(l=>({v:l.value[f], label:UI.shortDate(l.key).dm}));

  function renderBody() {
    const wm = wellnessMap();
    const autoCount = Object.values(wm).filter(d=>d.rhr!=null||d.sleep_h!=null||d.hrv!=null).length;
    const rn = $('#rec-note');
    if (rn) rn.textContent = autoCount
      ? `${autoCount} hari data recovery masuk otomatis dari intervals.icu. Angka yang kamu ketik manual selalu menimpa yang otomatis.`
      : 'Sambungkan jam ke intervals.icu, atau ketik tidur, HRV, dan resting HR manual tiap pagi.';

    const rec = mergedRecovery();
    const rser = f => rec.slice(-30).filter(r=>r[f]!=null).map(r=>({v:r[f], label:UI.shortDate(r.key).dm}));
    const r7 = f => rec.slice(-7).map(r=>r[f]).filter(v=>v!=null);
    const s7 = avg(r7('sleep')), rd = readiness(today);
    $('#rec-stats').innerHTML =
      statTile('Tidur 7 hari', s7==null?'belum':s7.toFixed(1), s7==null?'':' j', s7==null) +
      statTile('HRV', rd.hrv==null?'belum':rd.hrv, rd.hrv==null?'':' ms', rd.hrv==null) +
      statTile('Resting HR', rd.rhr==null?'belum':rd.rhr, rd.rhr==null?'':' bpm', rd.rhr==null);
    UI.lineChart($('#chart-sleep'), rser('sleep'), { dp:1, target:goals.sleep_target_h });
    UI.lineChart($('#chart-hrv'), rser('hrv'), { dp:0, empty:'Belum ada HRV. Cek di intervals.icu apakah jam-mu benar-benar mengirim HRV.' });
    UI.lineChart($('#chart-rhr'), rser('rhr'), { dp:0 });

    const last7 = f => logs.slice(-7).map(l=>l.value[f]).filter(v=>v!=null);
    const c7 = avg(last7('cal')), p7 = avg(last7('protein'));
    $('#nut-stats').innerHTML =
      statTile('Kalori 7 hari', c7==null?'belum':Math.round(c7), c7==null?'':' kkal', c7==null) +
      statTile('Protein 7 hari', p7==null?'belum':Math.round(p7), p7==null?'':' g', p7==null) +
      statTile('Target protein', goals.protein_target_g, ' g');
    UI.lineChart($('#chart-cal'), series('cal'), { dp:0, target:goals.cal_target });
    UI.lineChart($('#chart-prot'), series('protein'), { dp:0, target:goals.protein_target_g });
    const nl = logs.slice(-7).reverse();
    $('#nut-list').innerHTML = nl.length ? nl.map(r=>{
      const v=r.value, dt=UI.shortDate(r.key), bits=[];
      if(v.cal!=null) bits.push(`<b>${v.cal}</b> kkal`);
      if(v.protein!=null) bits.push(`<b>${v.protein}</b> g P`);
      return `<div class="rowitem"><div class="d">${dt.dow}<br>${dt.dm}</div><div class="m">${bits.join(' · ')||'—'}</div>
        <div class="tags"><span class="tag${v.vit_am?' on':''}">AM</span><span class="tag${v.vit_pm?' on':''}">PM</span></div></div>`;
    }).join('') : `<p class="empty-note">Belum ada catatan makan.</p>`;

    const w = logs.filter(l=>l.value.weight!=null);
    const first = w.length?w[0].value.weight:null, lastW = w.length?w[w.length-1].value.weight:null;
    const dW = (first!=null&&lastW!=null) ? lastW-first : null;
    $('#prog-stats').innerHTML =
      statTile('Berat', lastW==null?'belum':lastW.toFixed(1), lastW==null?'':' kg', lastW==null) +
      statTile('Perubahan', dW==null?'—':(dW>0?'+':'')+dW.toFixed(1), dW==null?'':' kg', dW==null) +
      statTile('Target BF', goals.bf_target_pct, ' %');
    UI.lineChart($('#chart-weight'), series('weight',60), { dp:1 });
    UI.lineChart($('#chart-bf'), series('bf',60), { dp:1, target:goals.bf_target_pct });
    renderPhotoGrid();
  }
  function renderPhotoGrid() {
    const el = $('#photo-grid');
    if (!photos.length) { el.innerHTML = `<p class="empty-note">Belum ada foto. Tambahkan lewat Catat → Foto.</p>`; return; }
    const dates = [...new Set(photos.map(p=>p.key.slice(0,10)))].sort().reverse().slice(0,8);
    el.innerHTML = dates.map(d=>`<div class="photo-row"><div class="lab">${UI.fmt(d)}</div>
      <div class="photo-grid">${ANGLES.map(([a])=>{
        const p=photos.find(x=>x.key===d+'-'+a);
        return p?`<img src="${p.value.image}" alt="${a}">`:`<div style="aspect-ratio:3/4;border-radius:8px;background:var(--sunk)"></div>`;
      }).join('')}</div></div>`).join('');
  }

  /* ================= PERFORMA ================= */
  function renderPerf() {
    const rs=$('#run-stats'), rl=$('#run-list');
    if (!activities || !activities.ok) { rs.innerHTML=''; rl.innerHTML=connectBlock(activities&&activities.reason); }
    else {
      const runs = activities.data.filter(a=>RUNTYPE(a.type)).sort((a,b)=>a.start<b.start?1:-1);
      const km28 = runs.filter(a=>UI.parse(a.date)>=new Date(Date.now()-28*86400000)).reduce((s,a)=>s+(a.km||0),0);
      const paces = runs.slice(0,10).map(a=>a.pace_s_per_km).filter(Boolean);
      rs.innerHTML = statTile('Jarak 28 hari', km28.toFixed(1), ' km') + statTile('Sesi', String(runs.length),'') +
        statTile('Pace rata2', paces.length?UI.pace(avg(paces)):'—','');
      rl.innerHTML = runs.length ? runs.slice(0,15).map(actCard).join('') : `<p class="empty-note">Belum ada aktivitas lari.</p>`;
    }

    const st14 = logs.slice(-14).filter(l=>l.value.st).length, st7 = logs.slice(-7).filter(l=>l.value.st).length;
    const dts = logs.slice(-7).filter(l=>{const d=l.value.daily||{};return d.abs&&d.calf&&d.hip;}).length;
    $('#st-stats').innerHTML = statTile('ST 7 hari',String(st7),' sesi')+statTile('ST 14 hari',String(st14),' sesi')+statTile('Daily lengkap',String(dts),'/7');

    const start = new Date(); start.setDate(start.getDate()-start.getDay());
    $('#st-week').innerHTML = `<div class="loglist">` + [1,2,3,4,5,6,0].map(dw=>{
      const d=new Date(start); d.setDate(start.getDate()+(dw===0?7:dw));
      const key=keyOf(d), w=PLAN.week[dw], v=logOf(key), dd=v.daily||{};
      const done=['abs','calf','hip'].filter(k=>dd[k]).length;
      return `<div class="rowitem"${key===today?' style="background:var(--accent-soft);border-radius:9px;padding-left:8px;padding-right:8px"':''}>
        <div class="d">${UI.DAYS[dw].slice(0,3)}<br>${d.getDate()}</div>
        <div class="m"><b>${w.title}</b></div>
        <div class="tags">${w.st?`<span class="tag${v.st?' on':''}">ST</span>`:`<span class="tag${v.run?' on':''}">LARI</span>`}<span class="tag${done===3?' on':''}">${done}/3</span></div></div>`;
    }).join('') + `</div>`;

    const gymEl = $('#st-gym');
    if (gymEl) {
      if (!activities || !activities.ok) gymEl.innerHTML = connectBlock(activities&&activities.reason, true);
      else {
        const gyms = activities.data.filter(x=>GYMTYPE(x.type)).sort((x,y)=>x.start<y.start?1:-1);
        gymEl.innerHTML = gyms.length ? `<div class="loglist">`+gyms.slice(0,10).map(x=>{
          const dt=UI.shortDate(x.date), bits=[];
          if(x.moving_s) bits.push(`<b>${UI.dur(x.moving_s)}</b>`);
          if(x.load!=null) bits.push(`load <b>${x.load}</b>`);
          if(x.avg_hr) bits.push(`${Math.round(x.avg_hr)} bpm`);
          return `<div class="rowitem"><div class="d">${dt.dow}<br>${dt.dm}</div><div class="m">${bits.join(' · ')||x.name||'—'}</div><div></div></div>`;
        }).join('')+`</div>` : `<p class="empty-note">Belum ada sesi WeightTraining di intervals.icu.</p>`;
      }
    }
    const p = PLAN.today(UI.dow(today), today, 'gym');
    $('#st-program').innerHTML = p.session
      ? `<p class="note-sm" style="margin:0 0 10px">${p.day.title} — ${p.session.length} latihan.</p>`
      : `<p class="note-sm" style="margin:0">Hari ini tidak ada sesi gym terjadwal.</p>`;
    const ob = $('#open-program'); if (ob) ob.onclick = () => UI.nav('home');
  }

  /* ================= PROFIL ================= */
  function renderProfile() {
    $('#p-name').value = profile.name || '';
    $('#g-race').value = goals.race_date; $('#g-prot').value = goals.protein_target_g;
    $('#g-cal').value = goals.cal_target; $('#g-sleep').value = goals.sleep_target_h;
    $('#g-bf').value = goals.bf_target_pct; $('#g-tdee').value = goals.tdee_low;
    const st=(r,o)=>`<div class="rowitem"><div class="d">${r}</div><div class="m">${o}</div><div></div></div>`;
    const w = wellness&&wellness.ok, a = activities&&activities.ok;
    $('#conn-body').innerHTML = `<div class="loglist">
      ${st('Lokal','<b>Aktif</b> — '+logs.length+' catatan, '+photos.length+' foto')}
      ${st('intervals.icu', (w||a)?'<b>Tersambung</b>':'<b>Belum</b>')}
      ${st('Hari pertama', '<b>'+UI.fmt(launchDate(), true)+'</b>')}
    </div>`;
  }

  function renderAll() {
    renderDayNav();
    const vd = verdict();
    $('#verdict').textContent = vd.t; $('#verdict-sub').textContent = vd.s;
    renderTargets(); renderHero(); renderFit(); renderPlan();
    renderLastRun(); renderInsight(); renderBody(); renderPerf(); renderProfile();
    if (profile.photo) { $('#avatar-img').src=profile.photo; $('#avatar-img').hidden=false; $('#avatar-fallback').hidden=true; }
    else { $('#avatar-img').hidden=true; $('#avatar-fallback').hidden=false; $('#avatar-fallback').textContent=(profile.name||'R')[0].toUpperCase(); }
  }

  /* ================= KALENDER ================= */
  let calMonth = null;
  function openCal() {
    calMonth = UI.parse(sel); calMonth.setDate(1);
    renderCal(); UI.openSheet('cal-sheet');
  }
  function renderCal() {
    const M=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    $('#cal-month').textContent = M[calMonth.getMonth()]+' '+calMonth.getFullYear();
    const lo = launchDate();
    const first = new Date(calMonth), pad = first.getDay();
    const dim = new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 0).getDate();
    let html = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d=>`<div class="dh">${d}</div>`).join('');
    for (let i=0;i<pad;i++) html += `<div class="pad"></div>`;
    for (let d=1; d<=dim; d++) {
      const k = keyOf(new Date(calMonth.getFullYear(), calMonth.getMonth(), d));
      const off = k < lo || k > today;
      const has = logs.some(l=>l.key===k);
      html += `<button type="button" data-k="${k}"${off?' disabled':''} class="${has?'has ':''}${k===sel?'sel':''}">${d}</button>`;
    }
    $('#cal-grid').innerHTML = html;
    $$('#cal-grid button:not(:disabled)').forEach(b => b.onclick = () => {
      sel = b.dataset.k; UI.closeSheet('cal-sheet'); renderAll();
    });
    $('#cal-note').textContent = `Hari pertama Areté: ${UI.fmt(lo, true)}. Tanggal sebelum itu dan yang belum berlalu tidak bisa dipilih.`;
  }

  /* ================= SHEET CATAT ================= */
  const F = { weight:'f-weight', bf:'f-bf', sleep:'f-sleep', hrv:'f-hrv', rhr:'f-rhr',
              cal:'f-cal', protein:'f-protein', dist:'f-dist', notes:'f-notes' };
  function fillSheet() {
    const v = logOf(sel);
    for (const k in F) { const el=document.getElementById(F[k]); el.value = (v[k]==null)?'':v[k]; }
    const set=(id,on)=>$(id).setAttribute('aria-pressed',String(!!on));
    set('#t-st',v.st); set('#t-run',v.run); set('#t-vam',v.vit_am); set('#t-vpm',v.vit_pm);
    const d=v.daily||{}; set('#t-abs',d.abs); set('#t-calf',d.calf); set('#t-hip',d.hip);
    $('#f-dist-wrap').hidden = !v.run;
    $('#sheet-date').textContent = 'Catat — ' + UI.fmt(sel);
    renderSlots();
  }
  function readSheet() {
    const v = Object.assign({}, logOf(sel));
    for (const k in F) { const el=document.getElementById(F[k]); v[k] = (k==='notes')?(el.value.trim()||null):num(el.value); }
    const on=id=>$(id).getAttribute('aria-pressed')==='true';
    v.st=on('#t-st'); v.run=on('#t-run'); v.vit_am=on('#t-vam'); v.vit_pm=on('#t-vpm');
    v.daily={abs:on('#t-abs'),calf:on('#t-calf'),hip:on('#t-hip')};
    v.updated_at=new Date().toISOString();
    return v;
  }
  async function saveLog(v, msgEl) {
    await Store.put('logs', sel, v);
    logs = logs.filter(l=>l.key!==sel).concat([{key:sel,value:v}]).sort((a,b)=>a.key<b.key?-1:1);
    renderAll();
    if (msgEl) { msgEl.textContent='Tersimpan '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      clearTimeout(saveLog._t); saveLog._t=setTimeout(()=>{msgEl.textContent='';},2600); }
  }
  function renderSlots() {
    $('#photo-slots').innerHTML = ANGLES.map(([a,label])=>{
      const p = photos.find(x=>x.key===sel+'-'+a);
      return `<label class="pslot${p?' has':''}" for="ph-${a}">${p?`<img src="${p.value.image}" alt="">`:''}
        <span>${label}</span><input id="ph-${a}" type="file" accept="image/*" capture="environment" data-angle="${a}"></label>`;
    }).join('');
    $$('#photo-slots input').forEach(inp => inp.onchange = async e => {
      const file=e.target.files[0]; if(!file) return;
      const msg=$('#saved'); msg.textContent='Mengompres foto…'; msg.classList.remove('bad');
      try {
        const url = await Store.compress(file);
        await Store.put('photos', sel+'-'+e.target.dataset.angle, { image:url, at:new Date().toISOString() });
        photos = await Store.all('photos');
        renderSlots(); renderPhotoGrid(); renderInsight();
        msg.textContent='Foto tersimpan.';
      } catch(err){ msg.textContent='Gagal: '+err.message; msg.classList.add('bad'); }
    });
  }

  /* ================= NAV YANG MENGECIL ================= */
  let navT = null;
  function armNavIdle() {
    clearTimeout(navT);
    navT = setTimeout(() => document.body.classList.add('nav-mini'), 4000);
  }
  function expandNav() { document.body.classList.remove('nav-mini'); armNavIdle(); }

  /* ================= WIRING ================= */
  function wire() {
    $$('.nav button[data-go]').forEach(b => b.onclick = e => {
      if (document.body.classList.contains('nav-mini')) { e.preventDefault(); expandNav(); return; }
      UI.nav(b.dataset.go); armNavIdle();
    });
    $('#log-btn').onclick = e => {
      if (document.body.classList.contains('nav-mini')) { e.preventDefault(); expandNav(); return; }
      fillSheet(); UI.openSheet('log-sheet'); armNavIdle();
    };
    ['scroll','touchstart','pointerdown'].forEach(ev =>
      window.addEventListener(ev, () => { if(!document.body.classList.contains('nav-mini')) armNavIdle(); }, {passive:true}));

    $('#avatar').onclick = () => UI.nav('profile');
    $('#day-prev').onclick = () => stepDay(-1);
    $('#day-next').onclick = () => stepDay(1);
    $('#day-open').onclick = openCal;
    $('#cal-prev').onclick = () => { calMonth.setMonth(calMonth.getMonth()-1); renderCal(); };
    $('#cal-next').onclick = () => { calMonth.setMonth(calMonth.getMonth()+1); renderCal(); };
    $('#c-fit').onclick = openFull;
    $('#full-close').onclick = closeFull;
    window.addEventListener('resize', () => { if(!$('#full-chart').hidden) drawFull(); });
    $('#plan-reset').onclick = async () => {
      const v = Object.assign({}, logOf(sel)); delete v.st_mode; delete v.loads;
      await saveLog(v);
    };

    /* geser kiri = mundur satu hari, geser kanan = maju satu hari */
    let sx=0, sy=0, tracking=false;
    const head = $('#dayhead');
    head.addEventListener('touchstart', e => { sx=e.touches[0].clientX; sy=e.touches[0].clientY; tracking=true; }, {passive:true});
    head.addEventListener('touchend', e => {
      if(!tracking) return; tracking=false;
      const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
      if (Math.abs(dx)<45 || Math.abs(dx)<Math.abs(dy)*1.6) return;
      stepDay(dx<0 ? -1 : 1);
    }, {passive:true});

    $$('.view .subtabs button').forEach(b => b.onclick = () => UI.subnav(b.closest('.view').dataset.view, b.dataset.sub));
    $$('.sheet-tabs button').forEach(b => b.onclick = () => showLogPanel(b.dataset.log));
    $$('[data-open-log]').forEach(b => b.onclick = () => { fillSheet(); showLogPanel(b.dataset.openLog); UI.openSheet('log-sheet'); });
    $$('[data-close-sheet]').forEach(b => b.onclick = () => UI.closeSheet(b.dataset.closeSheet));
    $$('.tg').forEach(b => b.onclick = () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      if (b.id === 't-run') $('#f-dist-wrap').hidden = !on;
    });

    document.addEventListener('click', async e => {
      const t = e.target.closest('.trk'); if(!t) return;
      const v = Object.assign({}, logOf(sel));
      v.daily = Object.assign({abs:false,calf:false,hip:false}, v.daily);
      v.daily[t.dataset.track] = !v.daily[t.dataset.track];
      v.updated_at = new Date().toISOString();
      await saveLog(v);
    });

    $('#save').onclick = async () => { await saveLog(readSheet(), $('#saved')); };
    $('#p-save').onclick = async () => {
      profile.name = $('#p-name').value.trim() || 'Rausyan';
      await Store.put('meta','profile',profile); renderAll(); flash('#p-msg','Profil disimpan.');
    };
    $('#p-photo').onchange = async e => {
      const f=e.target.files[0]; if(!f) return;
      try { profile.photo = await Store.compress(f, 90*1024); await Store.put('meta','profile',profile);
        renderAll(); flash('#p-msg','Foto profil diganti.'); }
      catch(err){ flash('#p-msg','Gagal: '+err.message, true); }
    };
    $('#g-save').onclick = async () => {
      goals.race_date = $('#g-race').value || goals.race_date;
      goals.protein_target_g = num($('#g-prot').value) ?? goals.protein_target_g;
      goals.cal_target = num($('#g-cal').value) ?? goals.cal_target;
      goals.sleep_target_h = num($('#g-sleep').value) ?? goals.sleep_target_h;
      goals.bf_target_pct = num($('#g-bf').value) ?? goals.bf_target_pct;
      goals.tdee_low = num($('#g-tdee').value) ?? goals.tdee_low;
      await Store.put('meta','goals',goals); renderAll(); flash('#g-msg','Target disimpan.');
    };
    $('#conn-refresh').onclick = async () => { await Api.clearCache(); await pull(); renderAll(); };
    $('#export').onclick = async () => {
      const blob = new Blob([JSON.stringify(await Store.export(),null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='arete-backup-'+today+'.json';
      document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},1000);
    };
    $('#import').onchange = e => {
      const f=e.target.files[0]; if(!f) return; const r=new FileReader();
      r.onload = async () => { try { const n=await Store.import(JSON.parse(r.result)); await load(); flash('#io-msg',n+' catatan dipulihkan.'); }
        catch(err){ flash('#io-msg','Gagal: '+err.message,true); } };
      r.readAsText(f);
    };
    $('#wipe-today').onclick = async () => {
      await Store.del('logs', sel); logs = logs.filter(l=>l.key!==sel); renderAll();
      flash('#wipe-msg','Catatan '+UI.fmt(sel)+' dihapus.');
    };
    let armed=false, armT=null;
    $('#wipe-all').onclick = async () => {
      const b=$('#wipe-all');
      if(!armed){ armed=true; b.classList.add('armed'); b.textContent='Ketuk lagi untuk hapus';
        flash('#wipe-msg','Yakin? Semua catatan dan foto hilang permanen.',true);
        clearTimeout(armT); armT=setTimeout(()=>{armed=false;b.classList.remove('armed');b.textContent='Hapus semua data';},6000); return; }
      clearTimeout(armT); armed=false; b.classList.remove('armed'); b.textContent='Hapus semua data';
      await Store.clear('logs'); await Store.clear('photos'); logs=[]; photos=[]; renderAll();
      flash('#wipe-msg','Semua catatan dan foto dihapus.');
    };
    const names={auto:'Tema: otomatis',day:'Tema: siang',night:'Tema: malam'};
    $('#theme-cycle').textContent = names[Theme.pref];
    $('#theme-cycle').onclick = () => {
      const o=['auto','day','night'], nx=o[(o.indexOf(Theme.pref)+1)%3];
      Theme.set(nx); $('#theme-cycle').textContent=names[nx];
    };
  }
  function showLogPanel(key) {
    $$('.log-panel').forEach(p=>p.classList.toggle('on', p.dataset.logPanel===key));
    $$('.sheet-tabs button').forEach(b=> b.dataset.log===key ? b.setAttribute('aria-current','true') : b.removeAttribute('aria-current'));
  }
  function flash(sel_, txt, bad) {
    const el=$(sel_); if(!el) return;
    el.textContent=txt; el.classList.toggle('bad',!!bad);
    clearTimeout(flash['_'+sel_]); flash['_'+sel_]=setTimeout(()=>{el.textContent='';el.classList.remove('bad');},3000);
  }

  /* ================= BOOT ================= */
  async function load() {
    const g = await Store.get('meta','goals');
    goals = Object.assign({}, window.DEFAULT_GOALS, g||{});
    if (!g) await Store.put('meta','goals',goals);
    const pr = await Store.get('meta','profile'); if (pr) profile = Object.assign(profile, pr);
    targets = await Store.get('meta','targets');
    if (!targets) { targets = TARGETS.DEFAULTS.slice(); await Store.put('meta','targets',targets); }
    logs = (await Store.all('logs')).sort((a,b)=>a.key<b.key?-1:1);
    photos = await Store.all('photos');
    if (sel > today) sel = today;
    renderAll();
  }
  async function pull() { [wellness, activities] = await Promise.all([Api.wellness(90), Api.activities(42)]); }

  (async function boot() {
    wire();
    let view='home'; try{ view=localStorage.getItem('arete_view')||'home'; }catch(e){}
    UI.nav(view);
    ['body','perf'].forEach(v=>{ let s=null; try{s=localStorage.getItem('arete_sub_'+v);}catch(e){} if(s) UI.subnav(v,s); });
    showLogPanel('makan');
    await load();
    Splash.start();
    armNavIdle();
    pull().then(renderAll);
    setInterval(()=>{ const k=UI.todayKey(); if(k!==today){ if(sel===today) sel=k; today=k; renderAll(); } }, 60000);
  })();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
  }
})();
