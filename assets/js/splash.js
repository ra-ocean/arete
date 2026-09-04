/* Areté — splash pembuka.
   Cold start (buka pertama per sesi) = animasi penuh 3,4 detik.
   Buka berikutnya = logo utuh, fade cepat 0,6 detik.
   Timing lengkap ada di docs/BRAND.md. */
window.Splash = (function () {
  const root = document.documentElement;
  const body = document.body;

  function fit() {
    let w = window.innerWidth, h = window.innerHeight;
    if (window.visualViewport) {
      w = Math.min(w, window.visualViewport.width);
      h = Math.min(h, window.visualViewport.height);
    }
    // Stage berukuran tetap 520x300 lalu diskalakan. Wrapper di CSS memakai
    // ukuran SETELAH skala, supaya logo tetap presisi di tengah pada layar sempit.
    root.style.setProperty('--s', String(Math.max(.28, Math.min((w - 56) / 520, (h * .42) / 300, 1.25))));
  }
  window.addEventListener('resize', fit);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
  fit();

  function play(quick) {
    body.classList.remove('run', 'quick');
    void body.offsetWidth;                       // paksa reflow supaya animasi mulai ulang
    if (quick) body.classList.add('quick');
    body.classList.add('run');
  }

  /* PWA yang dibuka lagi tanpa force-close tidak me-reload halaman, jadi splash
     tidak pernah jalan lagi. Blok ini memutar versi cepatnya saat app kembali ke
     depan setelah lebih dari RESUME_AFTER milidetik.
     Tiga pemicu dipasang karena tiap platform beda: iOS standalone paling sering
     mengirim pageshow, Android mengirim visibilitychange, desktop mengirim focus. */
  var RESUME_AFTER = 20000;
  var awayAt = 0;

  function markAway() { if (!awayAt) awayAt = Date.now(); }
  function maybeResume() {
    if (awayAt && Date.now() - awayAt > RESUME_AFTER) play(true);
    awayAt = 0;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) markAway(); else maybeResume();
  });
  window.addEventListener('blur', markAway);
  window.addEventListener('focus', maybeResume);
  window.addEventListener('pageshow', function (e) { if (e.persisted) { markAway(); awayAt = 1; play(true); } });

  return {
    start(onDone) {
      let warm = false;
      try {
        warm = !!sessionStorage.getItem('arete_opened');
        sessionStorage.setItem('arete_opened', '1');
      } catch (e) {}

      const go = () => {
        play(warm);
        setTimeout(onDone || function () {}, warm ? 1100 : 3800);
      };

      // Tahan sampai Poppins siap, supaya wordmark tidak berkedip ganti font.
      if (document.fonts && document.fonts.load) {
        Promise.race([
          document.fonts.load('600 136px Poppins', 'aretē').then(() => document.fonts.ready),
          new Promise(r => setTimeout(r, 1200))
        ]).then(go, go);
      } else { go(); }
    },
    replay: play
  };
})();
