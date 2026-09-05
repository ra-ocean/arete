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
        <span class="k">${(t.tag || (t.kind === 'race' ? 'Lomba' : 'Target')).slice(0,14)}</span>
      </div>`).join('');
    $('#target-count').textContent = list.length > 1 ? `· ${list.length}` : '';
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
  /* Narasi kesiapan. Angka telanjang tidak menolong siapa pun — yang berguna
     adalah: dari mana angkanya, apa yang belum ikut dihitung, dan hari ini
     harus bagaimana. Semua kalimat di bawah lahir dari data, bukan template. */
  function readinessNarrative(r) {
    const tgt = goals.sleep_target_h || 7;
    const P = [];

    if (r.score == null) {
      P.push(`Belum ada satu pun angka pemulihan untuk hari ini, jadi skornya tidak bisa dihitung. Yang dibutuhkan cuma tiga: <b>jam tidur</b>, <b>HRV</b>, dan <b>resting HR</b>.`);
      P.push(`Bisa diketik manual lewat Catat → Badan, atau dibiarkan masuk sendiri kalau jam-mu sudah tersambung ke intervals.icu.`);
      return P;
    }

    /* dari mana angkanya */
    const bits = [];
    if (r.sleep != null) {
      const kurang = Math.max(0, tgt - r.sleep);
      bits.push(kurang > 0
        ? `tidur <b>${r.sleep} jam</b>, kurang ${kurang.toFixed(1)} jam dari target ${tgt}`
        : `tidur <b>${r.sleep} jam</b>, sudah memenuhi target ${tgt}`);
    }
    const rec = mergedRecovery().filter(x=>x.key<=sel).slice(-30);
    const bH = median(rec.map(x=>x.hrv).filter(v=>v!=null));
    const bR = median(rec.map(x=>x.rhr).filter(v=>v!=null));
    const usedHrv = r.hrv!=null && !r.need.some(n=>n.startsWith('HRV'));
    const usedRhr = r.rhr!=null && !r.need.some(n=>n.startsWith('resting'));
    if (usedHrv) bits.push(`HRV <b>${r.hrv} ms</b> ${r.hrv>=bH?'di atas':'di bawah'} kebiasaanmu (${Math.round(bH)})`);
    if (usedRhr) bits.push(`resting HR <b>${r.rhr} bpm</b> ${r.rhr<=bR?'di bawah':'di atas'} kebiasaanmu (${Math.round(bR)})`);

    P.push(`Skor <b>${r.score}</b> dihitung dari ${bits.join(', ')}.`);
    if (r.need.length) {
      P.push(`Belum ikut dihitung: ${r.need.join(' dan ')}. HRV dan resting HR baru dipakai setelah ada 5 hari tercatat — sebelum itu tidak ada pembanding, dan skornya cuma akan terlihat bagus tanpa alasan.`);
    }

    /* hari ini harus bagaimana — dikaitkan ke rencana hari itu */
    const w = PLAN.week[UI.dow(sel)];
    const jenis = w.kind === 'run' ? 'lari' : w.kind === 'st' ? 'strength' : 'fleksibel';
    if (r.score >= 80) {
      P.push(`Badan pulih penuh. Sesi <b>${jenis}</b> hari ini boleh dijalankan sesuai rencana, termasuk bagian yang berat.`);
    } else if (r.score >= 65) {
      P.push(`Kondisi wajar. Jalankan sesi <b>${jenis}</b> seperti rencana, tapi jangan menambah dosis di luar yang sudah ditulis.`);
    } else if (r.score >= 50) {
      P.push(`Pemulihan belum penuh. Saran saya: <b>volume tetap, intensitas turun satu tingkat</b>. Kalau hari ini interval, ganti easy. Kalau ST, kurangi beban 10–15% dan jangan cari rekor. Daily-track tetap jalan — bebannya ringan dan justru membantu sirkulasi.`);
    } else {
      P.push(`Sinyal pemulihan rendah. Hari ini <b>jangan dipaksa</b>: ganti dengan easy run, jalan kaki, atau mobility saja. Memaksa sesi keras dengan kondisi begini menambah kelelahan tanpa menambah kebugaran — dan itu justru yang menjauhkan dari target lomba.`);
    }
    if (r.sleep != null && r.sleep < 5.5) {
      P.push(`Tidur di bawah 5,5 jam. Kalau ini berlanjut beberapa hari, efeknya menumpuk dan tidak bisa ditutup oleh latihan sebaik apa pun.`);
    }
    return P;
  }

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
    $('#ready-lab').textContent = lab;
    $('#ready-onel').textContent = r.score==null ? 'Butuh tidur, HRV, dan resting HR.'
      : `Dihitung dari ${3 - r.need.length} dari 3 sinyal pemulihan.`;
    $('#ready-say').querySelector('.cb-txt').innerHTML =
      readinessNarrative(r).map(p=>`<p>${p}</p>`).join('');

    const rec = mergedRecovery().filter(x=>x.key<=sel).slice(-7);
    const bars = $('#sleepbars'), tgt = goals.sleep_target_h || 7;
    if (rec.filter(x=>x.sleep!=null).length < 2) bars.className = 'sleepbars empty';
    else {
      bars.className = 'sleepbars';
      const mx = Math.max(tgt, ...rec.map(x=>x.sleep||0));
      bars.innerHTML = rec.map(x => {
        const h = x.sleep ? Math.max(6,(x.sleep/mx)*44) : 3;
        const cls = x.key===sel ? 'today' : (x.sleep>=tgt-0.5 ? 'ok' : '');
        return `<div class="${cls}" style="height:${h.toFixed(0)}px" data-d="${UI.shortDate(x.key).dow[0]}" title="${x.key}: ${x.sleep ?? '—'} j"></div>`;
      }).join('');
    }
    const mini=(k,v,u)=>`<div><div class="k">${k}</div><div class="v${v==null?' none':''}">${v==null?'belum':v}${v!=null&&u?`<i>${u}</i>`:''}</div></div>`;
    $('#ready-mini').innerHTML = mini('Tidur',r.sleep,'j')+mini('HRV',r.hrv,'ms')+mini('Resting HR',r.rhr,'bpm');
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
    const el = $('#fit-body'), coach = $('#fit-coach'), rows = fitRows();
    if (!rows || rows.length < 1) {
      el.innerHTML = rows ? `<p class="empty-note">Belum ada data fitness di intervals.icu.</p>` : connectBlock(wellness && wellness.reason);
      coach.hidden = true; $('#c-fit').hidden = true; return;
    }
    coach.hidden = false; $('#c-fit').hidden = false;
    const w = rows[rows.length-1], prev = rows[rows.length-2] || null;

    /* Arah panah selalu menunjukkan perubahan; warnanya menunjukkan BAIK atau
       TIDAK. Untuk Fitness naik itu baik, tapi untuk Fatigue naik justru beban
       bertambah — mewarnainya hijau akan menyesatkan. */
    const box = (k, key, val, goodUp, dp) => {
      const rp = v => v==null ? null : +v.toFixed(dp);
      const p = prev ? rp(prev[key]) : null, cur = rp(val);
      const d = (p!=null && cur!=null) ? +(cur-p).toFixed(dp) : null;
      const dir = d==null || d===0 ? 'flat' : (d>0 ? 'up' : 'down');
      const good = dir==='flat' ? 'flat' : ((dir==='up')===goodUp ? 'up' : 'down');
      const ar = dir==='flat' ? '—' : dir==='up' ? '▲' : '▼';
      return `<div class="fb"><div class="k">${k}</div>
        <div class="v">${val==null?'—':(val>0&&key==='form'?'+':'')+val.toFixed(dp)}</div>
        <div class="d ${good}"><span class="ar">${ar}</span>${d==null?'—':d===0?'sama':(d>0?'+':'')+d.toFixed(dp)}</div>
        <div class="p">kemarin ${p==null?'—':p.toFixed(dp)}</div></div>`;
    };
    el.innerHTML = `<div class="fitbox">
      ${box('Fitness','ctl', w.ctl, true, 0)}
      ${box('Fatigue','atl', w.atl, false, 0)}
      ${box('Form','form', w.form, true, 1)}
    </div>`;

    /* penilaian AI coach */
    const P = [];
    const dCtl = prev ? w.ctl-prev.ctl : null, dAtl = prev ? w.atl-prev.atl : null;
    const arahCtl = dCtl==null ? '' : dCtl>0.3 ? 'naik' : dCtl<-0.3 ? 'turun' : 'datar';
    const arahAtl = dAtl==null ? '' : dAtl>0.5 ? 'naik' : dAtl<-0.5 ? 'turun' : 'datar';
    P.push(`Fitness <b>${Math.round(w.ctl)}</b>${arahCtl?` ${arahCtl}`:''}, fatigue <b>${Math.round(w.atl)}</b>${arahAtl?` ${arahAtl}`:''}. Fitness itu rata-rata beban latihanmu 42 hari terakhir — naiknya memang lambat, dan itu normal. Fatigue rata-rata 7 hari terakhir, jadi dia bereaksi cepat.`);
    const f = w.form;
    if (f > 5) P.push(`Form <b>+${f}</b> berarti kamu <b>segar</b> — beban akut sudah di bawah kapasitas. Bagus menjelang lomba, tapi kalau bertahan lama artinya latihannya kurang.`);
    else if (f > -10) P.push(`Form <b>${f}</b> ada di <b>zona seimbang</b>: tidak segar, tidak terbebani. Ini tempat yang paling produktif untuk membangun kebugaran.`);
    else if (f > -20) P.push(`Form <b>${f}</b> berarti kamu <b>sedang terbebani</b>. Masih zona adaptasi, tapi butuh hari mudah dalam waktu dekat.`);
    else P.push(`Form <b>${f}</b> di bawah −20 — beban akut jauh di atas kapasitas. Ini zona rawan cedera, bukan zona adaptasi. Kurangi volume beberapa hari.`);
    const d = UI.daysUntil(goals.race_date);
    if (d>=0 && d<=14) P.push(d<=7
      ? `${d} hari ke lomba. Di minggu taper, fatigue seharusnya turun dan form naik. Kalau form masih di bawah −10 tiga hari lagi, potong volume lebih agresif.`
      : `${d} hari ke lomba. Beban berat masih boleh sampai H-7, setelah itu form yang harus dinaikkan.`);
    coach.querySelector('.cb-txt').innerHTML = P.map(x=>`<p>${x}</p>`).join('');
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

  /* ================= GRAFIK PENUH (gaya intervals.icu) =================
     Fitness dan Fatigue ditumpuk pada satu sumbu supaya trennya bisa dibandingkan.
     Form dan Ramp punya panel sendiri di bawah — keduanya berayun di sekitar nol,
     jadi menumpuknya dengan CTL/ATL cuma akan membuat semuanya gepeng. */
  const RANGES = [[30,'1 bln'],[90,'3 bln'],[180,'6 bln'],[365,'1 thn']];
  const LAYERS = [['ctl','Fitness'],['atl','Fatigue'],['form','Form'],['ramp','Ramp']];
  let fullRange = 90, fullIdx = -1;
  let fullOn = { ctl:true, atl:true, form:true, ramp:false };

  function fullSeries() {
    const rows = fitRows() || [];
    /* Ramp = perubahan fitness dalam 7 hari. Itu ukuran seberapa cepat beban naik. */
    const withRamp = rows.map((r,i) => Object.assign({}, r, {
      ramp: i >= 7 && rows[i-7].ctl != null && r.ctl != null ? +(r.ctl - rows[i-7].ctl).toFixed(1) : null
    }));
    return withRamp.slice(-fullRange);
  }

  function openFull() {
    if (!fitRows()) return;
    $('#full-chart').hidden = false;
    document.body.style.overflow = 'hidden';
    $('#full-range').innerHTML = RANGES.map(([d,l]) =>
      `<button data-r="${d}"${d===fullRange?' aria-current="true"':''} type="button">${l}</button>`).join('');
    $('#full-layers').innerHTML = LAYERS.map(([k,l]) =>
      `<button class="lay" data-l="${k}"${fullOn[k]?' aria-current="true"':''} type="button">${l}</button>`).join('');
    $$('#full-range button').forEach(b => b.onclick = () => { fullRange=+b.dataset.r; fullIdx=-1; openFull(); });
    $$('#full-layers button').forEach(b => b.onclick = () => { fullOn[b.dataset.l] = !fullOn[b.dataset.l]; openFull(); });
    fullIdx = -1; drawFull();
  }
  function closeFull(){ $('#full-chart').hidden = true; document.body.style.overflow=''; }

  function drawFull() {
    const stage = $('#full-stage'), rot = $('#full-rot');
    const portrait = window.innerHeight > window.innerWidth;
    rot.style.setProperty('--rw', stage.clientWidth+'px');
    rot.style.setProperty('--rh', stage.clientHeight+'px');
    const W = portrait ? stage.clientHeight : stage.clientWidth;
    const H = portrait ? stage.clientWidth  : stage.clientHeight;

    const rows = fullSeries();
    if (rows.length < 2) { rot.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--fg-3);font-size:13px">Belum cukup data untuk rentang ini.</div>`; $('#full-read').textContent=''; return; }

    const L=44, R=14, T=14, B=26, GAP=8;
    const subs = ['form','ramp'].filter(k=>fullOn[k]);
    const subH = subs.length ? Math.min(78, (H-T-B-GAP*subs.length) * 0.24) : 0;
    const mainH = H - T - B - subs.length*(subH+GAP);
    const x = i => L + (i/(rows.length-1))*(W-L-R);

    function scale(keys, y0, h) {
      const vals = [];
      keys.forEach(k => rows.forEach(r => { if (r[k]!=null) vals.push(r[k]); }));
      if (!vals.length) return null;
      let lo=Math.min(...vals), hi=Math.max(...vals);
      if (hi===lo){hi=lo+1;lo-=1;} const pad=(hi-lo)*.1; lo-=pad; hi+=pad;
      return { lo, hi, y: v => y0 + (1-(v-lo)/(hi-lo))*h };
    }
    const path = (k, sc) => rows.map((r,i)=> r[k]==null?null:((i?'L':'M')+x(i).toFixed(1)+' '+sc.y(r[k]).toFixed(1)))
                                .filter(Boolean).join(' ').replace(/^L/,'M');

    let s = '';
    const mainKeys = ['ctl','atl'].filter(k=>fullOn[k]);
    const scMain = mainKeys.length ? scale(mainKeys, T, mainH) : null;
    if (scMain) {
      for (let g=0; g<=4; g++){ const v=scMain.lo+(scMain.hi-scMain.lo)*(1-g/4), yy=scMain.y(v);
        s+=`<line class="grid" x1="${L}" y1="${yy.toFixed(1)}" x2="${W-R}" y2="${yy.toFixed(1)}"/>`;
        s+=`<text x="6" y="${(yy+4).toFixed(1)}">${v.toFixed(0)}</text>`; }
      if (fullOn.ctl) s+=`<path class="f-ctl" d="${path('ctl',scMain)} L${x(rows.length-1).toFixed(1)} ${(T+mainH).toFixed(1)} L${L} ${(T+mainH).toFixed(1)} Z"/>`;
      if (fullOn.atl) s+=`<path class="l-atl" d="${path('atl',scMain)}"/>`;
      if (fullOn.ctl) s+=`<path class="l-ctl" d="${path('ctl',scMain)}"/>`;
    }
    const scSub = {};
    let yCur = T + mainH;
    subs.forEach(k => {
      yCur += GAP;
      const sc = scale([k], yCur, subH); scSub[k]=sc;
      s+=`<rect class="panelbg" x="${L}" y="${yCur.toFixed(1)}" width="${(W-L-R).toFixed(1)}" height="${subH.toFixed(1)}" rx="6"/>`;
      if (sc) {
        if (sc.lo < 0 && sc.hi > 0) s+=`<line class="zero" x1="${L}" y1="${sc.y(0).toFixed(1)}" x2="${W-R}" y2="${sc.y(0).toFixed(1)}"/>`;
        s+=`<path class="l-${k}" d="${path(k,sc)}"/>`;
        s+=`<text class="plab" x="${L+7}" y="${(yCur+13).toFixed(1)}">${k==='form'?'FORM':'RAMP'}</text>`;
        s+=`<text x="6" y="${(yCur+11).toFixed(1)}">${sc.hi.toFixed(0)}</text>`;
        s+=`<text x="6" y="${(yCur+subH-2).toFixed(1)}">${sc.lo.toFixed(0)}</text>`;
      }
      yCur += subH;
    });

    const i = fullIdx<0 ? rows.length-1 : Math.min(Math.max(fullIdx,0), rows.length-1);
    const cx = x(i);
    s+=`<line class="cursor" x1="${cx.toFixed(1)}" y1="${T}" x2="${cx.toFixed(1)}" y2="${(H-B).toFixed(1)}"/>`;
    if (scMain && fullOn.ctl && rows[i].ctl!=null) s+=`<circle class="knob" style="fill:var(--c-ctl)" cx="${cx.toFixed(1)}" cy="${scMain.y(rows[i].ctl).toFixed(1)}" r="4.5"/>`;
    if (scMain && fullOn.atl && rows[i].atl!=null) s+=`<circle class="knob" style="fill:var(--c-atl)" cx="${cx.toFixed(1)}" cy="${scMain.y(rows[i].atl).toFixed(1)}" r="4"/>`;
    subs.forEach(k => { if (scSub[k] && rows[i][k]!=null)
      s+=`<circle class="knob" style="fill:var(--c-${k})" cx="${cx.toFixed(1)}" cy="${scSub[k].y(rows[i][k]).toFixed(1)}" r="4"/>`; });

    /* Tooltip menempel di garis yang sedang digeser, bukan dipaku di pojok. */
    const lines = [];
    LAYERS.forEach(([k,l]) => { if (fullOn[k] && rows[i][k]!=null)
      lines.push([l, k==='form'&&rows[i][k]>0?'+'+rows[i][k]:rows[i][k], k]); });
    const bw = 118, bh = 20 + lines.length*15;
    let bx = cx + 12; if (bx + bw > W-R) bx = cx - 12 - bw;
    let by = Math.max(T+2, Math.min(T + mainH*0.15, H-B-bh-2));
    s+=`<g><rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw}" height="${bh}" rx="9"
         fill="var(--bg)" stroke="var(--rule)"/>
         <text x="${(bx+9).toFixed(1)}" y="${(by+15).toFixed(1)}" style="fill:var(--fg);font-size:11px;font-weight:600">${UI.fmt(rows[i].date, true)}</text>`;
    lines.forEach((ln,j) => {
      const yy = by + 30 + j*15;
      s+=`<rect x="${(bx+9).toFixed(1)}" y="${(yy-4).toFixed(1)}" width="10" height="2.5" rx="1.2" fill="var(--c-${ln[2]})"/>`;
      s+=`<text x="${(bx+24).toFixed(1)}" y="${yy.toFixed(1)}" style="fill:var(--fg-2);font-size:10.5px">${ln[0]}</text>`;
      s+=`<text x="${(bx+bw-9).toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="end" style="fill:var(--fg);font-size:11px;font-weight:600">${ln[1]}</text>`;
    });
    s+=`</g>`;

    s+=`<text x="${L}" y="${(H-8).toFixed(1)}">${UI.fmt(rows[0].date)}</text>`;
    s+=`<text x="${W-R}" y="${(H-8).toFixed(1)}" text-anchor="end">${UI.fmt(rows[rows.length-1].date)}</text>`;
    rot.innerHTML = `<svg class="fchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${s}</svg>`;
    $('#full-read').innerHTML = `<b>${UI.fmt(rows[i].date, true)}</b> · ${fullRange===365?'1 tahun':fullRange+' hari'}`;

    stage.onpointerdown = stage.onpointermove = e => {
      if (e.type==='pointermove' && e.buttons===0) return;
      const r0 = stage.getBoundingClientRect();
      const p = portrait ? (e.clientY-r0.top)/r0.height : (e.clientX-r0.left)/r0.width;
      fullIdx = Math.round(clamp(p,0,1)*(rows.length-1));
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

  /* ================= POPUP TARGET ================= */
  let tpEdit = null;                       // id yang sedang diedit, atau 'new'
  function openTargets() {
    tpEdit = null; renderTargetPop(); openPop('target-pop');
  }
  function renderTargetPop() {
    const list = (targets || TARGETS.DEFAULTS).slice()
      .map(t => Object.assign({}, t, { days: TARGETS.daysTo(t.date, today) }))
      .sort((a,b) => a.days - b.days);
    $('#tp-list').innerHTML = list.map(t => `<button class="tgt${t.days<0?' past':''}" data-t="${t.id}" type="button">
        <span class="n">${t.days<0 ? '—' : t.days}</span>
        <span class="b"><strong>${t.name}</strong><span>${UI.fmt(t.date, true)}${t.days<0?' · sudah lewat':''}</span></span>
        <span class="tag">${t.tag || (t.kind==='race'?'Lomba':'Target')}</span>
      </button>`).join('') || `<p class="empty-note">Belum ada target.</p>`;
    $$('#tp-list .tgt').forEach(b => b.onclick = () => { tpEdit = b.dataset.t; fillTargetForm(); });
    $('#tp-form').hidden = !tpEdit;
    $('#tp-add').hidden = !!tpEdit;
    $('#tp-title').textContent = tpEdit ? (tpEdit==='new' ? 'Target baru' : 'Ubah target') : 'Target';
  }
  function fillTargetForm() {
    const t = tpEdit==='new' ? null : (targets||[]).find(x=>x.id===tpEdit);
    $('#tp-name').value = t ? t.name : '';
    $('#tp-date').value = t ? t.date : '';
    $('#tp-tag').value  = t ? (t.tag || (t.kind==='race'?'Lomba':'Target')) : '';
    $('#tp-del').hidden = !t;
    $('#tp-tagn').textContent = $('#tp-tag').value.length + '/14';
    renderTargetPop();
  }
  async function saveTarget() {
    const name = $('#tp-name').value.trim(), date = $('#tp-date').value;
    if (!name || !date) { flash('#tp-title','') ; $('#tp-name').focus(); return; }
    const tag = $('#tp-tag').value.trim().slice(0,14) || 'Target';
    targets = targets || TARGETS.DEFAULTS.slice();
    if (tpEdit === 'new') targets.push({ id:'t'+Date.now(), name, date, tag, kind: /lomba|race|run/i.test(tag)?'race':'goal' });
    else { const t = targets.find(x=>x.id===tpEdit); if (t) Object.assign(t, { name, date, tag }); }
    await Store.put('meta','targets',targets);
    tpEdit = null; renderTargetPop(); renderAll();
  }
  async function delTarget() {
    targets = (targets||[]).filter(x=>x.id!==tpEdit);
    await Store.put('meta','targets',targets);
    tpEdit = null; renderTargetPop(); renderAll();
  }
  function openPop(id){ const p=$('#'+id); p.hidden=false; requestAnimationFrame(()=>p.classList.add('open')); document.body.style.overflow='hidden'; }
  function closePop(id){ const p=$('#'+id); p.classList.remove('open'); document.body.style.overflow=''; setTimeout(()=>{p.hidden=true;},240); }

  /* ================= KALENDER ================= */
  let calMonth = null, calMetric = 'ready';
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
    paintCalendar();
    $$('#cal-grid button:not(:disabled)').forEach(b => b.onclick = () => {
      sel = b.dataset.k; UI.closeSheet('cal-sheet'); renderAll();
    });
    $('#cal-note').textContent = `Hari pertama Areté: ${UI.fmt(lo, true)}. Tanggal sebelum itu dan yang belum berlalu tidak bisa dipilih.`;
  }

  /* Warna tiap tanggal mengikuti metrik yang dipilih — recovery, fitness, atau
     fatigue. Skalanya relatif terhadap rentang yang benar-benar ada di bulan itu,
     supaya perbedaan kecil tetap terbaca. */
  function paintCalendar() {
    const wm = wellnessMap();
    const cells = $$('#cal-grid button[data-k]');
    const vals = [];
    const valueOf = k => {
      if (calMetric === 'ready') { const r = readiness(k); return r.score; }
      const w = wm[k]; return w ? w[calMetric] : null;
    };
    const map = {};
    cells.forEach(b => { const v = valueOf(b.dataset.k); map[b.dataset.k]=v; if (v!=null) vals.push(v); });
    if (!vals.length) { cells.forEach(b=>{ const q=b.querySelector('.q'); if(q) q.remove(); });
      $('#cal-legend').innerHTML = `<span>Belum ada data untuk metrik ini di bulan ini</span>`; return; }
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const goodHigh = calMetric !== 'atl';        /* fatigue: makin tinggi makin berat */
    cells.forEach(b => {
      let q = b.querySelector('.q'); if (!q) { q = document.createElement('span'); q.className='q'; b.appendChild(q); }
      const v = map[b.dataset.k];
      if (v == null) { q.style.background='transparent'; return; }
      const t = hi===lo ? .5 : (v-lo)/(hi-lo);
      const good = goodHigh ? t : 1-t;
      q.style.background = good>=.66 ? 'var(--good)' : good>=.33 ? 'var(--mid)' : 'var(--low)';
    });
    const nm = { ready:'Recovery', ctl:'Fitness', atl:'Fatigue' }[calMetric];
    $('#cal-legend').innerHTML =
      `<span><i style="background:var(--low)"></i>${goodHigh?'rendah':'tinggi'}</span>
       <span><i style="background:var(--mid)"></i>sedang</span>
       <span><i style="background:var(--good)"></i>${goodHigh?'tinggi':'rendah'}</span>
       <span style="margin-left:6px">${nm} ${lo.toFixed(0)}–${hi.toFixed(0)}</span>`;
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
    $('#cal-btn').onclick = openCal;
    $('#target-btn').onclick = openTargets;
    $$('[data-close-pop]').forEach(b => b.onclick = () => closePop(b.dataset.closePop));
    $('#tp-add').onclick = () => { tpEdit='new'; fillTargetForm(); };
    $('#tp-cancel').onclick = () => { tpEdit=null; renderTargetPop(); };
    $('#tp-save').onclick = saveTarget;
    $('#tp-del').onclick = delTarget;
    $('#tp-tag').oninput = () => { $('#tp-tagn').textContent = $('#tp-tag').value.length + '/14'; };
    $$('#cal-metric button').forEach(b => b.onclick = () => {
      calMetric = b.dataset.cm;
      $$('#cal-metric button').forEach(x => x.dataset.cm===calMetric ? x.setAttribute('aria-current','true') : x.removeAttribute('aria-current'));
      paintCalendar();
    });
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
  async function pull() { [wellness, activities] = await Promise.all([Api.wellness(365), Api.activities(42)]); }

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
