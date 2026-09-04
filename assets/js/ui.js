/* Areté — helper tampilan: format, grafik, navigasi, sheet. */
window.UI = (function () {
  const p2 = n => String(n).padStart(2, '0');
  const D = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const Ds = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const dow = k => parse(k).getDay();

  function fmt(k, long) {
    const d = parse(k);
    return (long ? D : Ds)[d.getDay()] + ', ' + d.getDate() + ' ' + M[d.getMonth()];
  }
  const shortDate = k => ({ dow: Ds[parse(k).getDay()], dm: parse(k).getDate() + ' ' + M[parse(k).getMonth()] });
  const daysUntil = iso => Math.round((parse(iso) - parse(todayKey())) / 86400000);
  const pace = s => s == null ? '—' : Math.floor(s / 60) + ':' + p2(Math.round(s % 60));
  const dur = s => s == null ? '—' : (s >= 3600 ? Math.floor(s / 3600) + 'j ' : '') + p2(Math.floor((s % 3600) / 60)) + 'm';

  /* Grafik garis satu sumbu. Titik terakhir ditebalkan — itu yang dibaca duluan.
     Garis target digambar kalau ada, supaya angkanya punya acuan. */
  function lineChart(el, points, opts) {
    opts = opts || {};
    el.innerHTML = '';
    if (!points || points.length < 2) {
      el.innerHTML = '<p class="empty-note">' + (opts.empty || 'Butuh minimal 2 catatan untuk menggambar tren.') + '</p>';
      return;
    }
    const W = 320, H = opts.h || 140, L = 36, R = 10, T = 12, B = 20;
    const vals = points.map(p => p.v).concat(opts.target != null ? [opts.target] : []);
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi = lo + 1; lo -= 1; }
    const pad = (hi - lo) * 0.15; lo -= pad; hi += pad;
    const x = i => L + (i / (points.length - 1)) * (W - L - R);
    const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const dp = opts.dp == null ? 1 : opts.dp;
    let s = '';

    [0, 0.5, 1].forEach(f => {
      const v = lo + (hi - lo) * (1 - f), yy = y(v);
      s += `<line class="grid" x1="${L}" y1="${yy.toFixed(1)}" x2="${W - R}" y2="${yy.toFixed(1)}"/>`;
      s += `<text x="2" y="${(yy + 3.5).toFixed(1)}">${v.toFixed(dp)}</text>`;
    });
    if (opts.target != null) {
      const ty = y(opts.target);
      s += `<line class="target" x1="${L}" y1="${ty.toFixed(1)}" x2="${W - R}" y2="${ty.toFixed(1)}"/>`;
      s += `<text class="tlabel" x="${W - R}" y="${(ty - 5).toFixed(1)}" text-anchor="end">target ${opts.target}</text>`;
    }
    const d = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    s += `<path class="area" d="${d} L${x(points.length - 1).toFixed(1)} ${H - B} L${L} ${H - B} Z"/>`;
    s += `<path class="line" d="${d}"/>`;
    points.forEach((p, i) => {
      const last = i === points.length - 1;
      s += `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${last ? 4 : 2}"><title>${p.label}: ${p.v}</title></circle>`;
    });
    s += `<text x="${L}" y="${H - 4}">${points[0].label}</text>`;
    s += `<text x="${W - R}" y="${H - 4}" text-anchor="end">${points[points.length - 1].label}</text>`;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('class', 'chart');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.innerHTML = s;
    el.appendChild(svg);
  }

  /* ---- navigasi ---- */
  function nav(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.dataset.view === name));
    document.querySelectorAll('.nav button[data-go]').forEach(b => {
      if (b.dataset.go === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    showNav();
    try { localStorage.setItem('arete_view', name); } catch (e) {}
    document.dispatchEvent(new CustomEvent('viewchange', { detail: { view: name } }));
  }

  function subnav(view, key) {
    const root = document.querySelector(`.view[data-view="${view}"]`);
    if (!root) return;
    root.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.dataset.panel === key));
    root.querySelectorAll('.subtabs button').forEach(b => {
      if (b.dataset.sub === key) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    });
    try { localStorage.setItem('arete_sub_' + view, key); } catch (e) {}
    document.dispatchEvent(new CustomEvent('subchange', { detail: { view, panel: key } }));
  }

  /* Nav sembunyi saat scroll ke bawah, muncul saat scroll ke atas.
     Ini mengganti ide "nav mengecil setelah diam": ruang layarnya sama-sama
     dapat, tapi tidak ada yang harus dipelajari dan tidak ada ketukan ekstra. */
  let lastY = 0, navHidden = false;
  function showNav() { if (navHidden) { document.body.classList.remove('nav-away'); navHidden = false; } }
  function armScroll() {
    window.addEventListener('scroll', () => {
      const y = Math.max(0, window.scrollY);
      if (Math.abs(y - lastY) < 8) return;
      const down = y > lastY;
      if (down && y > 90 && !navHidden) { document.body.classList.add('nav-away'); navHidden = true; }
      else if (!down && navHidden) { document.body.classList.remove('nav-away'); navHidden = false; }
      lastY = y;
    }, { passive: true });
  }

  /* ---- sheet ---- */
  function openSheet(id) {
    const s = document.getElementById(id);
    if (!s) return;
    s.hidden = false;
    requestAnimationFrame(() => s.classList.add('open'));
    document.body.style.overflow = 'hidden';
  }
  function closeSheet(id) {
    const s = document.getElementById(id);
    if (!s) return;
    s.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => { s.hidden = true; }, 260);
  }

  return { todayKey, parse, dow, fmt, shortDate, daysUntil, pace, dur, lineChart, nav, subnav, armScroll, showNav, openSheet, closeSheet, DAYS: D };
})();
