/* Areté — program strength training.
   Sumber: program "Chicken Legs No More" yang disusun 2 Sep 2026.
   Sesi lari dari coach TIDAK ada di sini — targetnya (pace/power/durasi) dibuat
   di TrainingPeaks dan berubah tiap minggu, jadi app hanya menampilkan hasil
   lari SETELAH aktivitas, bukan rencananya. */
window.PLAN = (function () {

  /* Kerangka minggu. dow: 0 = Minggu. */
  const week = {
    1: { kind: 'st',   title: 'Sesi B — Upper Toning',   sub: 'Punggung, bahu, lengan + hip flexor & glute', st: 'B',    dose: 'full' },
    2: { kind: 'run',  title: 'Lari kualitas',           sub: 'Sesuai coach. Kaki dijaga fresh.',            st: null,   dose: 'light' },
    3: { kind: 'st',   title: 'Sesi A — Lower Power',    sub: 'Kaki & posterior chain',                      st: 'A',    dose: 'full' },
    4: { kind: 'run',  title: 'Lari kualitas',           sub: 'Sesuai coach. Kaki dijaga fresh.',            st: null,   dose: 'light' },
    5: { kind: 'flex', title: 'Slot fleksibel',          sub: 'Sesi offline coach kalau ada. Kalau kosong: daily-track dosis penuh.', st: 'flex', dose: 'full' },
    6: { kind: 'run',  title: 'Lari easy',               sub: 'Selalu easy.',                                st: null,   dose: 'moderate' },
    0: { kind: 'run',  title: 'Long run',                sub: 'Daily-track malam setelah lari.',             st: null,   dose: 'moderate' }
  };

  /* A. Abs — rotasi harian. Kunci: dow. */
  const abs = {
    1: [['Ab wheel rollout', '3×8-10'], ['Hanging / lying leg raise', '3×12'], ['Side plank + reach', '3×30s per sisi']],
    2: [['Hollow body hold', '3×20-30s'], ['Dead bug', '3×10 per sisi']],
    3: [['Crunch', '3×20'], ['Bicycle crunch', '3×20'], ['Plank', '2×45s']],
    4: [['Hollow body hold', '3×20-30s'], ['Dead bug', '3×10 per sisi']],
    5: [['Sit up', '3×15-20'], ['Side crunch', '3×20 per sisi'], ['Ab wheel rollout', '3×8-10']],
    6: [['Lying leg raise', '3×15'], ['Plank', '2×45-60s']],
    0: [['Wall sit', '2×45s'], ['Side plank', '2×30s per sisi']]
  };

  /* B. Calf · Ankle · Soleus — titik lemah utama, penggerak Shock Absorption di Stryd. */
  const calf = {
    baseline: [['Ankle circles', '10 per arah'], ['Calf isometric hold (posisi atas)', '3×20-30s']],
    stDay:    [['Standing calf raise tempo 3-1-3', '3×15'], ['Seated / bent-knee calf raise', '3×15'], ['Single-leg calf raise', '3×8-10 per sisi']],
    phase2:   [['Pogo hops', '2×15-20'], ['Single hop-and-stick', '2×6-8 per sisi']]
  };

  /* C. Hip flexor & glute — "sangat ga ada" menurut Rausyan sendiri. */
  const hip = {
    baseline: [['Glute bridge', '2×15'], ['Hip flexor march', '2×10 per sisi']],
    stDay:    [['Single-leg glute bridge', '3×10 per sisi'], ['Weighted / banded hip flexor march', '3×10 per sisi'], ['Clamshell atau lateral band walk', '3×15 per sisi']]
  };

  const sesiA = [
    ['Warm-up: 5\' easy cardio + banded lateral walk', '2×15', 'Nyalakan glute medius dulu'],
    ['Goblet squat (DB)', '4×10', 'dari coach'],
    ['Single-leg RDL (DB)', '3×8-10 per sisi', 'glute/hamstring + landing control'],
    ['Hip thrust / glute bridge (DB loaded)', '3×12', 'target langsung glute lemah'],
    ['Leg extension + leg curl (superset)', '3×12 masing-masing', 'aman untuk tendon'],
    ['Abductor / adductor', '3×15 masing-masing', 'dari coach'],
    ['Standing + seated calf raise', '4×15 masing-masing', 'blok soleus/gastroc'],
    ['Core: plank, wall sit, ab wheel', '2×45s / 2×45s / 3×8', '—']
  ];

  const sesiB = [
    ['Warm-up: row/bike 5\' + band pull-apart + hip flexor march', '2×15 / 2×10 per sisi', '—'],
    ['Pull up + dead hang', '4×max (assisted ok) / 2×20-30s', 'back width'],
    ['Face pull', '3×15', 'shoulder health / delt belakang'],
    ['Bent over row (DB/bar)', '4×10', 'back thickness'],
    ['Overhead DB press', '3×10', 'delt'],
    ['Incline/flat DB press atau push-up', '3×12', 'chest, tampilan toned'],
    ['Bicep curl + overhead triceps ext (superset)', '3×12 masing-masing', 'lengan'],
    ['Single-leg split squat', '3×8 per sisi', 'dari coach'],
    ['Copenhagen plank', '3×20-30s per sisi', 'adductor / hip stability'],
    ['Standing weighted knee raise', '3×10 per sisi', 'hip flexor, titik lemah'],
    ['Lateral band walk / clamshell', '3×15 per sisi', 'glute medius'],
    ['Pogo hops + skater hops', '2×15 / 2×6 per sisi', 'FASE 2 — mulai 21 Sept']
  ];

  const RACE = '2026-09-20';

  function phase2(dateKey) { return dateKey > RACE; }

  /* Semua yang harus dikerjakan hari ini, sudah digabung. */
  function today(dow, dateKey) {
    const w = week[dow];
    const isStDay = w.st !== null;
    const p2 = phase2(dateKey || '');

    const track = {
      abs:  abs[dow].slice(),
      calf: calf.baseline.concat(isStDay ? calf.stDay : []).concat(isStDay && p2 && (dow === 1 || dow === 3) ? calf.phase2 : []),
      hip:  hip.baseline.concat(isStDay ? hip.stDay : [])
    };
    return { day: w, track, session: w.st === 'A' ? sesiA : w.st === 'B' ? sesiB : null, phase2: p2 };
  }

  return { week, abs, calf, hip, sesiA, sesiB, today, RACE };
})();
