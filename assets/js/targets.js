/* Areté — target: lomba yang sudah dapat tiket, dan deadline non-lomba.
   Disimpan di meta/targets supaya bisa ditambah/diedit dari Profil. */
window.TARGETS = (function () {
  const DEFAULTS = [
    { id: 't1', name: 'Garmin Run 10K', date: '2026-09-20', kind: 'race' },
    { id: 't2', name: 'Badan sixpack',  date: '2026-12-03', kind: 'goal' }
  ];

  function daysTo(iso, fromKey) {
    const p = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
    return Math.round((p(iso) - p(fromKey)) / 86400000);
  }

  /* Yang sudah lewat dibuang, sisanya diurut dari yang paling dekat. */
  function active(list, fromKey) {
    return (list || DEFAULTS)
      .map(t => Object.assign({}, t, { days: daysTo(t.date, fromKey) }))
      .filter(t => t.days >= 0)
      .sort((a, b) => a.days - b.days);
  }

  return { DEFAULTS, active, daysTo };
})();
