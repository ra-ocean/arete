/* Areté — tema mengikuti jam device.
   SIANG 06.00-17.59 -> putih.  MALAM 18.00-05.59 -> hitam. */
window.Theme = (function () {
  const root = document.documentElement;
  let pref = 'auto';                       // 'auto' | 'day' | 'night'
  try { pref = localStorage.getItem('arete_theme') || 'auto'; } catch (e) {}

  const byClock = () => { const h = new Date().getHours(); return (h >= 6 && h < 18) ? 'day' : 'night'; };
  const current = () => (pref === 'auto' ? byClock() : pref);

  function apply() {
    const m = current();
    root.setAttribute('data-mode', m);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', m === 'night' ? '#000000' : '#FFFFFF');
    document.dispatchEvent(new CustomEvent('themechange', { detail: { mode: m, pref } }));
  }

  apply();
  setInterval(() => { if (pref === 'auto') apply(); }, 60000);

  return {
    apply, current,
    get pref() { return pref; },
    set(p) {
      pref = p;
      try { localStorage.setItem('arete_theme', p); } catch (e) {}
      apply();
    }
  };
})();
