/* Areté — program strength training.
   Sumber: program "Chicken Legs No More", 2 Sep 2026.

   Sesi lari dari coach TIDAK ada di sini — targetnya dibuat di TrainingPeaks dan
   berubah tiap minggu. App hanya menampilkan hasil lari setelah aktivitas.

   Tiap latihan: [kelompok otot, gerakan, set, reps, patokan beban, versi rumah]
   Versi rumah dipakai kalau tidak ke gym. Alat di rumah: satu dumbbell adjustable
   sampai 22 kg, matras, L-sit bar, ab wheel, resistance band. */
window.PLAN = (function () {

  const RACE = '2026-09-20';

  /* Kerangka minggu. dow: 0 = Minggu. */
  const week = {
    1: { kind: 'st',   title: 'Sesi B — Upper Toning',  sub: 'Punggung, bahu, lengan + hip flexor & glute', st: 'B',    dose: 'full' },
    2: { kind: 'run',  title: 'Lari kualitas',          sub: 'Sesuai coach. Kaki dijaga fresh.',            st: null,   dose: 'light' },
    3: { kind: 'st',   title: 'Sesi A — Lower Power',   sub: 'Kaki & posterior chain',                      st: 'A',    dose: 'full' },
    4: { kind: 'run',  title: 'Lari kualitas',          sub: 'Sesuai coach. Kaki dijaga fresh.',            st: null,   dose: 'light' },
    5: { kind: 'flex', title: 'Slot fleksibel',         sub: 'Sesi coach kalau ada. Kalau tidak: pilih gym atau rumah.', st: 'flex', dose: 'full' },
    6: { kind: 'run',  title: 'Lari easy',              sub: 'Selalu easy.',                                st: null,   dose: 'moderate' },
    0: { kind: 'run',  title: 'Long run',               sub: 'Daily-track malam setelah lari.',             st: null,   dose: 'moderate' }
  };

  /* ---------- daily-track ---------- */
  const abs = {
    1: [['Core', 'Ab wheel rollout', 3, '8-10', 'bodyweight'], ['Core', 'Hanging / lying leg raise', 3, '12', 'bodyweight'], ['Core', 'Side plank + reach', 3, '30s/sisi', 'bodyweight']],
    2: [['Core', 'Hollow body hold', 3, '20-30s', 'bodyweight'], ['Core', 'Dead bug', 3, '10/sisi', 'bodyweight']],
    3: [['Core', 'Crunch', 3, '20', 'bodyweight'], ['Core', 'Bicycle crunch', 3, '20', 'bodyweight'], ['Core', 'Plank', 2, '45s', 'bodyweight']],
    4: [['Core', 'Hollow body hold', 3, '20-30s', 'bodyweight'], ['Core', 'Dead bug', 3, '10/sisi', 'bodyweight']],
    5: [['Core', 'Sit up', 3, '15-20', 'bodyweight'], ['Core', 'Side crunch', 3, '20/sisi', 'bodyweight'], ['Core', 'Ab wheel rollout', 3, '8-10', 'bodyweight']],
    6: [['Core', 'Lying leg raise', 3, '15', 'bodyweight'], ['Core', 'Plank', 2, '45-60s', 'bodyweight']],
    0: [['Quad', 'Wall sit', 2, '45s', 'bodyweight'], ['Core', 'Side plank', 2, '30s/sisi', 'bodyweight']]
  };

  const calf = {
    baseline: [['Ankle', 'Ankle circles', 1, '10/arah', 'bodyweight'], ['Soleus', 'Calf isometric hold (posisi atas)', 3, '20-30s', 'bodyweight']],
    stDay: [['Gastroc', 'Standing calf raise tempo 3-1-3', 3, '15', 'DB 10-16 kg'],
            ['Soleus', 'Seated / bent-knee calf raise', 3, '15', 'DB di lutut'],
            ['Calf', 'Single-leg calf raise', 3, '8-10/sisi', 'bodyweight']],
    phase2: [['Calf', 'Pogo hops', 2, '15-20', 'bodyweight'], ['Calf', 'Single hop-and-stick', 2, '6-8/sisi', 'bodyweight']]
  };

  const hip = {
    baseline: [['Glute', 'Glute bridge', 2, '15', 'bodyweight'], ['Hip flexor', 'Hip flexor march', 2, '10/sisi', 'bodyweight']],
    stDay: [['Glute', 'Single-leg glute bridge', 3, '10/sisi', 'bodyweight'],
            ['Hip flexor', 'Banded hip flexor march', 3, '10/sisi', 'band'],
            ['Glute medius', 'Clamshell / lateral band walk', 3, '15/sisi', 'band']]
  };

  /* ---------- Sesi A — Lower Power & Posterior Chain ---------- */
  const sesiA = [
    ['Full body', 'Warm-up: 5\' easy cardio + banded lateral walk', 2, '15', 'band', 'Warm-up: skipping/jog di tempat 5\' + banded lateral walk'],
    ['Quad', 'Goblet squat (DB)', 4, '10', 'DB 16-22 kg', null],
    ['Hamstring', 'Single-leg RDL (DB)', 3, '8-10/sisi', 'DB 10-16 kg', null],
    ['Glute', 'Hip thrust (DB)', 3, '12', 'DB 16-22 kg', 'Floor glute bridge, DB di pinggul'],
    ['Quad', 'Leg extension', 3, '12', 'mesin', 'Bulgarian split squat (kursi), DB 10-16 kg'],
    ['Hamstring', 'Leg curl', 3, '12', 'mesin', 'Banded hamstring curl atau Nordic assisted'],
    ['Glute medius', 'Abductor / adductor', 3, '15', 'mesin', 'Banded clamshell + Copenhagen plank 3×20s/sisi'],
    ['Gastroc', 'Standing calf raise', 4, '15', 'DB 16-22 kg', null],
    ['Soleus', 'Seated calf raise', 4, '15', 'DB di lutut', null],
    ['Core', 'Plank · wall sit · ab wheel', 2, '45s / 45s / 3×8', 'bodyweight', null]
  ];

  /* ---------- Sesi B — Upper Toning + Hip Flexor/Glute ---------- */
  const sesiB = [
    ['Full body', 'Warm-up: row/bike 5\' + band pull-apart + hip flexor march', 2, '15', 'band', 'Warm-up: skipping 5\' + band pull-apart + hip flexor march'],
    ['Punggung', 'Pull up + dead hang', 4, 'max / 20-30s', 'assisted ok', 'One-arm DB row 4×10/sisi + banded lat pulldown'],
    ['Delt belakang', 'Face pull', 3, '15', 'cable', 'Banded face pull'],
    ['Punggung', 'Bent over row (DB)', 4, '10', 'DB 16-22 kg', null],
    ['Bahu', 'Overhead DB press', 3, '10', 'DB 12-18 kg', null],
    ['Dada', 'Incline / flat DB press', 3, '12', 'DB 14-20 kg', 'DB floor press atau push-up 3×15'],
    ['Bicep', 'Bicep curl', 3, '12', 'DB 8-14 kg', null],
    ['Tricep', 'Overhead triceps extension', 3, '12', 'DB 8-14 kg', null],
    ['Quad', 'Single-leg split squat', 3, '8/sisi', 'DB 10-16 kg', null],
    ['Adductor', 'Copenhagen plank', 3, '20-30s/sisi', 'bodyweight', null],
    ['Hip flexor', 'Standing weighted knee raise', 3, '10/sisi', 'band / DB ringan', null],
    ['Glute medius', 'Lateral band walk / clamshell', 3, '15/sisi', 'band', null]
  ];

  function phase2(dateKey) { return dateKey > RACE; }

  /* Terjemahkan daftar latihan ke versi gym atau rumah. */
  function forMode(list, mode) {
    return list.map(x => {
      const [mg, name, sets, reps, load, homeAlt] = x;
      if (mode === 'home' && homeAlt) {
        const m = homeAlt.match(/^(.*?)\s+(\d+)×([^\s]+)(?:\s+(.*))?$/);
        return { mg, name: homeAlt, sets, reps, load: 'di rumah', swapped: true, from: name };
      }
      return { mg, name, sets, reps, load, swapped: false };
    });
  }

  /* Semua yang harus dikerjakan hari ini. mode: 'gym' | 'home' | 'coach' | null */
  function today(dow, dateKey, mode) {
    const w = week[dow];
    const isStDay = w.st !== null;
    const p2 = phase2(dateKey || '');
    const track = {
      abs: abs[dow].slice(),
      calf: calf.baseline.concat(isStDay ? calf.stDay : []).concat(isStDay && p2 && (dow === 1 || dow === 3) ? calf.phase2 : []),
      hip: hip.baseline.concat(isStDay ? hip.stDay : [])
    };
    let session = null;
    if (mode !== 'coach') {
      const base = w.st === 'A' ? sesiA : w.st === 'B' ? sesiB : null;
      if (base) session = forMode(base, mode || 'gym');
      else if (w.st === 'flex' && mode) session = forMode(dow % 2 ? sesiB : sesiA, mode);
    }
    return { day: w, track, session, phase2: p2, mode: mode || null };
  }

  return { week, abs, calf, hip, sesiA, sesiB, today, forMode, RACE };
})();
