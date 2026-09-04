/* Areté — logika aplikasi (Fase 0).
   Tiga layar: Hari Ini (quick log), Progres (tren + riwayat), Latihan (stub B3).
   Semua data lokal di IndexedDB. Lihat docs/HANDOFF.md untuk backlog. */
(function () {
  const $ = s => document.querySelector(s);
  const F = {
    weight: 'f-weight', bf: 'f-bf', sleep: 'f-sleep',
    cal: 'f-cal', protein: 'f-protein', dist: 'f-dist', notes: 'f-notes'
  };
  let goals = Object.assign({}, window.DEFAULT_GOALS);
  let logs = [];

  const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;

  /* ---------- baca form ---------- */
  function readForm() {
    const o = {};
    for (const k in F) {
      const el = document.getElementById(F[k]);
      o[k] = (k === 'notes') ? (el.value.trim() || null) : num(el.value);
    }
    o.st = $('#t-st').getAttribute('aria-pressed') === 'true';
    o.run = $('#t-run').getAttribute('aria-pressed') === 'true';
    o.vit_am = $('#t-vam').getAttribute('aria-pressed') === 'true';
    o.vit_pm = $('#t-vpm').getAttribute('aria-pressed') === 'true';
    o.updated_at = new Date().toISOString();
    return o;
  }
  function fillForm(o) {
    o = o || {};
    for (const k in F) {
      const el = document.getElementById(F[k]);
      el.value = (o[k] == null) ? '' : o[k];
    }
    setTg('#t-st', !!o.st); setTg('#t-run', !!o.run);
    setTg('#t-vam', !!o.vit_am); setTg('#t-vpm', !!o.vit_pm);
    $('#f-dist').closest('.field').hidden = !o.run;
  }
  function setTg(sel, on) { $(sel).setAttribute('aria-pressed', String(!!on)); }

  /* ---------- dashboard ---------- */
  function renderStats() {
    const d = UI.daysUntil(goals.race_date);
    const withW = logs.filter(l => l.value.weight != null);
    const last = withW.length ? withW[withW.length - 1].value.weight : null;
    const prot = logs.length ? logs[logs.length - 1].value.protein : null;

    $('#s-race').textContent = d >= 0 ? d : '—';
    $('#s-race-u').textContent = d >= 0 ? (d === 1 ? 'hari' : 'hari') : '';
    $('#s-race').closest('.stat').classList.toggle('empty', d < 0);

    $('#s-weight').textContent = last != null ? last.toFixed(1) : 'belum';
    $('#s-weight-u').textContent = last != null ? 'kg' : '';
    $('#s-weight').closest('.stat').classList.toggle('empty', last == null);

    $('#s-prot').textContent = prot != null ? prot : 'belum';
    $('#s-prot-u').textContent = prot != null ? ('/' + goals.protein_target_g + ' g') : '';
    $('#s-prot').closest('.stat').classList.toggle('empty', prot == null);

    const streak = countStreak();
    $('#s-streak').textContent = streak;
    $('#s-streak-u').textContent = streak === 1 ? 'hari' : 'hari';
    $('#s-logged').textContent = logs.length;
    const wk = logs.slice(-7).filter(l => l.value.st).length;
    $('#s-st').textContent = wk;
  }

  function countStreak() {
    const keys = new Set(logs.map(l => l.key));
    let n = 0, d = new Date();
    for (;;) {
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (!keys.has(k)) { if (n === 0 && k === UI.todayKey()) { d.setDate(d.getDate() - 1); continue; } break; }
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  }

  function renderTrends() {
    const w = logs.filter(l => l.value.weight != null).slice(-30)
      .map(l => ({ v: l.value.weight, label: UI.shortDate(l.key).dm }));
    UI.lineChart($('#chart-weight'), w, { dp: 1 });
    const c = logs.filter(l => l.value.cal != null).slice(-30)
      .map(l => ({ v: l.value.cal, label: UI.shortDate(l.key).dm }));
    UI.lineChart($('#chart-cal'), c, { dp: 0 });
  }

  function renderHistory() {
    const el = $('#history');
    const rows = logs.slice(-21).reverse();
    if (!rows.length) { el.innerHTML = '<p class="empty-note">Belum ada catatan. Mulai dari layar Hari Ini.</p>'; return; }
    el.innerHTML = rows.map(r => {
      const v = r.value, dt = UI.shortDate(r.key);
      const bits = [];
      if (v.weight != null) bits.push(v.weight.toFixed(1) + ' kg');
      if (v.cal != null) bits.push(v.cal + ' kcal');
      if (v.protein != null) bits.push(v.protein + ' g P');
      if (v.sleep != null) bits.push(v.sleep + ' j tidur');
      return '<div class="logrow">' +
        '<div class="d">' + dt.dow + '<br>' + dt.dm + '</div>' +
        '<div class="m">' + (bits.join(' · ') || '—') + '</div>' +
        '<div class="tags">' +
          '<span class="tag' + (v.st ? ' on' : '') + '">ST</span>' +
          '<span class="tag' + (v.run ? ' on' : '') + '">RUN</span>' +
        '</div></div>';
    }).join('');
  }

  function renderAll() { renderStats(); renderTrends(); renderHistory(); }

  /* ---------- muat ---------- */
  async function load() {
    const g = await Store.get('meta', 'goals');
    if (g) goals = Object.assign({}, window.DEFAULT_GOALS, g);
    else await Store.put('meta', 'goals', goals);

    logs = (await Store.all('logs')).sort((a, b) => a.key < b.key ? -1 : 1);
    fillForm(await Store.get('logs', UI.todayKey()));
    renderAll();

    const t = UI.shortDate(UI.todayKey());
    $('#today-label').textContent = t.dow + ', ' + t.dm;
  }

  /* ---------- simpan ---------- */
  async function save() {
    const key = UI.todayKey();
    const val = readForm();
    await Store.put('logs', key, val);
    logs = logs.filter(l => l.key !== key).concat([{ key: key, value: val }]).sort((a, b) => a.key < b.key ? -1 : 1);
    renderAll();
    const s = $('#saved');
    s.textContent = 'Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    clearTimeout(save._t); save._t = setTimeout(() => { s.textContent = ''; }, 3000);
  }

  /* ---------- cadangan ---------- */
  async function doExport() {
    const data = await Store.export();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'arete-backup-' + UI.todayKey() + '.json';
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function doImport(file) {
    const r = new FileReader();
    r.onload = async () => {
      try {
        const n = await Store.import(JSON.parse(r.result));
        await load();
        $('#io-msg').textContent = n + ' catatan berhasil dipulihkan.';
      } catch (e) {
        $('#io-msg').textContent = 'Gagal: ' + e.message;
      }
    };
    r.readAsText(file);
  }

  /* ---------- pasang ---------- */
  function wire() {
    document.querySelectorAll('.nav button').forEach(b => {
      b.addEventListener('click', () => UI.nav(b.dataset.go));
    });
    document.querySelectorAll('.tg').forEach(b => {
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on));
        if (b.id === 't-run') $('#f-dist').closest('.field').hidden = !on;
      });
    });
    $('#save').addEventListener('click', save);
    $('#export').addEventListener('click', doExport);
    $('#import').addEventListener('change', e => { if (e.target.files[0]) doImport(e.target.files[0]); });

    $('#theme-cycle').addEventListener('click', () => {
      const order = ['auto', 'day', 'night'];
      const next = order[(order.indexOf(Theme.pref) + 1) % 3];
      Theme.set(next);
      $('#theme-cycle').textContent = { auto: 'Tema: otomatis', day: 'Tema: siang', night: 'Tema: malam' }[next];
    });
    $('#theme-cycle').textContent = { auto: 'Tema: otomatis', day: 'Tema: siang', night: 'Tema: malam' }[Theme.pref];

    function clock() {
      $('#clock').textContent = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    clock(); setInterval(clock, 30000);
  }

  /* ---------- mulai ---------- */
  wire();
  let view = 'today';
  try { view = localStorage.getItem('arete_view') || 'today'; } catch (e) {}
  UI.nav(view);
  load();
  Splash.start();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }
})();
