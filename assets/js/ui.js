/* Areté — helper tampilan kecil: format, grafik garis, navigasi. */
window.UI = (function () {
  const pad = n => String(n).padStart(2, '0');
  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
  const D = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  function shortDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return { dow: D[dt.getDay()], dm: d + ' ' + M[m - 1] };
  }
  function daysUntil(iso) {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return Math.round((new Date(iso + 'T00:00:00') - t) / 86400000);
  }

  /* Grafik garis satu sumbu. Titik terakhir ditebalkan karena itu yang dibaca duluan. */
  function lineChart(el, points, opts) {
    opts = opts || {};
    el.innerHTML = '';
    if (!points || points.length < 2) {
      el.innerHTML = '<p class="empty-note">Butuh minimal 2 catatan untuk menggambar tren.</p>';
      return;
    }
    const W = 320, H = 150, L = 34, R = 8, T = 12, B = 22;
    const vals = points.map(p => p.v);
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (hi === lo) { hi = lo + 1; lo = lo - 1; }
    const padv = (hi - lo) * 0.15; lo -= padv; hi += padv;
    const x = i => L + (i / (points.length - 1)) * (W - L - R);
    const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('class', 'chart');
    svg.setAttribute('preserveAspectRatio', 'none');
    let s = '';

    [0, 0.5, 1].forEach(f => {
      const v = lo + (hi - lo) * (1 - f), yy = y(v);
      s += '<line class="grid" x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '"/>';
      s += '<text x="2" y="' + (yy + 3.5) + '">' + v.toFixed(opts.dp == null ? 1 : opts.dp) + '</text>';
    });

    const d = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.v).toFixed(1)).join(' ');
    s += '<path class="area" d="' + d + ' L' + x(points.length - 1).toFixed(1) + ' ' + (H - B) + ' L' + L + ' ' + (H - B) + ' Z"/>';
    s += '<path class="line" d="' + d + '"/>';
    points.forEach((p, i) => {
      const last = i === points.length - 1;
      s += '<circle class="pt" cx="' + x(i).toFixed(1) + '" cy="' + y(p.v).toFixed(1) + '" r="' + (last ? 4 : 2.2) + '"><title>' + p.label + ': ' + p.v + '</title></circle>';
    });
    s += '<text x="' + L + '" y="' + (H - 5) + '">' + points[0].label + '</text>';
    s += '<text x="' + (W - R) + '" y="' + (H - 5) + '" text-anchor="end">' + points[points.length - 1].label + '</text>';

    svg.innerHTML = s;
    el.appendChild(svg);
  }

  function nav(name) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('on', v.dataset.view === name));
    document.querySelectorAll('.nav button').forEach(b => {
      const on = b.dataset.go === name;
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    try { localStorage.setItem('arete_view', name); } catch (e) {}
  }

  return { todayKey, shortDate, daysUntil, lineChart, nav };
})();
