# Areté — Master Context & Handoff Brief (v1.2, 4 Sep 2026)

Paste seluruh dokumen ini sebagai pesan pertama ke AI baru, lalu tambahkan satu kalimat tugas.

## 1. KONTEKS
Rausyan — konsultan manajemen di Indonesia. Menikah, punya bayi laki-laki yang baru lahir.
Proyek induk "Project R.V.2.1": perbaikan diri 1% per hari — pengelolaan waktu antara gym, lari, kerja, sosial, quality time dengan istri, dan mengasuh newborn.
Aplikasi yang dibangun: "Areté", dari bahasa Yunani aretē (ἀρετή) = keunggulan / memenuhi potensi diri.

Empat pilar (semua jalan bareng, versi ringan dulu, iteratif):
1. Tracker seamless untuk progress muscle-building + performa lari
2. Tampilan weekly strength training miliknya sendiri (EXCLUDE sesi offline dengan coach)
3. Review progress badan: foto mingguan (perut depan, samping, punggung, bicep/tricep/delt) + progressive overload — fokus endurance & toned look, bukan power
4. Tracking recovery setara Whoop / Fitbit Sense, sumber data dari Zepp

Konteks olahraga:
- Punya coach lari. Sesi ST offline mingguan dengan coach = FIXED, tidak boleh diubah. Sesi lain = wilayah yang dioptimalkan.
- Target: lomba 10K pertama, 20 September 2026.
- Tools: intervals.icu, Strava, TrainingPeaks, Coros (jam), Zepp (wearable), Hevy (log angkat beban).
- Body goals: six-pack terlihat, badan atas toned (bukan bulky), kaki lebih besar. Mantan powerlifter, sengaja bergeser ke endurance + estetika.
- Kelemahan yang dia tandai sendiri: glutes, calf (soleus & gastrocnemius), hip flexor. Sensitif di ankle/Achilles.

Preferensi kerja:
- Bahasa Indonesia (istilah teknis boleh Inggris)
- App personal/private, bukan untuk publik
- MOBILE-FIRST. Web/laptop view iterasi berikutnya, bukan sekarang.
- Iteratif, tidak harus sempurna di awal

## 2. ARSITEKTUR (diputuskan 4 Sep 2026)
GitHub repo + PWA. BUKAN Claude artifact.
- Fase 0 (SEKARANG): PWA statis di GitHub Pages. Nol akun baru. Data lokal di IndexedDB, ekspor/impor JSON.
- Fase 1: Supabase (gratis) untuk sync + foto.
- Fase 2: Vercel serverless untuk sync otomatis intervals.icu & Strava. API key HANYA di env var server.
- Fase 3: analisis mingguan otomatis Senin pagi WIB.

## 3. BRAND SYSTEM (final — angka hasil pengukuran, jangan diubah)
Warna siang (06.00–17.59): background #FFFFFF, foreground #A13838,
  muted rgba(161,56,56,.55), hairline rgba(161,56,56,.16)
Warna malam (18.00–05.59): background #000000, foreground #FFFFFF,
  muted rgba(255,255,255,.52), hairline rgba(255,255,255,.16)
Tema berganti otomatis berdasarkan jam device.

Tipografi: Poppins SemiBold (600), Google Fonts, lisensi OFL.
Wordmark letter-spacing -0.02em. Ejaan "aretē" huruf kecil, MACRON U+0113 — bukan é acute.
(Dipilih lewat uji pixel-IoU per-huruf terhadap 34 kandidat: Poppins 600 = 91,4%; juara 3 Urbanist 700 = 81,0%.)

Geometri logo, viewBox 0 0 520 300:
  Pill: rect x=40 y=40 width=440 height=220 rx=110 ry=110, fill none
        centreline rasio persis 2:1, cap setengah lingkaran r=110
        pusat cap kiri (150,150), cap kanan (370,150)
  Stroke width 9.2   = 4,16% tinggi centreline (artwork 48,5/1166,5 px)
  Diameter titik 46  = 5,0x stroke (artwork 242/48,5)
  Titik 36,14 derajat masuk ke lengkungan cap dari titik singgung:
        titik A (84.9, 60.9)   -> 6,134% panjang path
        titik B (435.1, 239.1) -> 56,134% panjang path
        PENTING: titik TIDAK di titik singgung.
  Wordmark font-size 134.97px, letter-spacing -0.02em, Poppins 600,
        center dalam stage 520x300 lalu translate(-0.6px, -5.13px)
        ink box: kiri 87.7, kanan 433.3, baseline 191.8
  Path orbit (counter-clockwise, persis ini):
  M 150 40 A 110 110 0 0 0 150 260 L 370 260 A 110 110 0 0 0 370 40 L 150 40 Z
        panjang total 1131,15 (arc = pi*110 = 345,575 ; garis lurus = 220)

Overlay implementasi vs artwork asli: IoU 90,6%.

## 4. ANIMASI SPLASH (selesai & disetujui)
Cold start (buka pertama per sesi), total 3,4 detik:
  120–680 ms      pill scale .72->1 + opacity 0->1, cubic-bezier(.34,1.42,.58,1)
  620 / 710 ms    dua titik pop scale 0->1 320 ms, stagger 90 ms
  940–1940 ms     orbit satu putaran penuh CCW, cubic-bezier(.5,.02,.35,1)
  1980 + i*46 ms  wordmark per huruf, 440 ms, fade + translateY(14px) + scale(.9)
  2980–3580 ms    splash out fade + scale(1.05); isi app muncul di 3120 ms
Warm start (buka berikutnya), 0,6 detik: logo utuh tanpa orbit, fade in 260 ms,
  splash out 620 ms. Deteksi: sessionStorage.getItem('arete_opened').

LIMA JEBAKAN TEKNIS — sudah diperbaiki, jangan diulang:
1. Keyframe orbit yang dipecah beberapa segmen -> CSS menerapkan easing PER-SEGMEN.
   Jarak dua titik melar sampai 67% (harusnya tetap 50%).
   Solusi: satu pasang keyframe from/to, biarkan offset-distance melewati 100%
   (Chromium wrap otomatis pada closed path):
     @keyframes orbitA{from{offset-distance:6.134%}  to{offset-distance:106.134%}}
     @keyframes orbitB{from{offset-distance:56.134%} to{offset-distance:156.134%}}
2. Menganimasikan scale pada elemen yang sama dengan offset-path menggeser titik pusatnya.
   Solusi: .dot memegang offset-path, anak <i> di dalamnya yang di-scale.
3. offset-path: path() pada elemen HTML memakai koordinat containing block.
   Stage harus 520x300 px tetap lalu transform:scale() — bukan diubah ukurannya.
4. Kalau layar < 520 px, layout box stage overflow dan justify-content:center
   berhenti bekerja (di HP nyata logo bergeser 80 px ke kanan, cap kanan terpotong).
   Solusi: wrapper selebar ukuran SETELAH diskalakan, scale dari sudut kiri-atas:
     .stage-wrap{position:relative;width:calc(520px * var(--s));height:calc(300px * var(--s))}
     .stage{position:absolute;top:0;left:0;width:520px;height:300px;
            transform:scale(var(--s));transform-origin:top left}
   Diuji pada 320/384/393/430/768 px — meleset 0,0 px.
5. Wordmark berkedip ganti font. Tahan splash sampai
   document.fonts.load('600 136px Poppins','aretē') selesai, timeout fallback 1200 ms.

## 5. INTEGRASI DATA
intervals.icu   TERBAIK  — API key personal, dokumentasi terbuka, kemungkinan sudah
                           mengagregasi Coros/Strava/TrainingPeaks. MULAI DARI SINI.
Strava          ADA      — API resmi lewat OAuth.
Hevy            DITUNDA  — API key hanya tier Pro. Rausyan pakai Basic, diputuskan
                           tidak upgrade dulu; belum wajib untuk MVP.
TrainingPeaks   TIDAK    — hanya Partner API yang di-gate.
Coros           REDUNDAN — harus apply, lagipula auto-sync ke Strava.
Zepp            TIDAK    — tidak ada API personal resmi. Input manual dulu.

KEAMANAN (WAJIB): API key tidak boleh ditulis di kode front-end. Kode yang dikirim
ke browser selalu terbaca. Key hanya hidup di environment variable serverless function.

## 6. DATA MODEL
logs/<YYYY-MM-DD>      { weight, bf, bf_device, sleep, cal, protein, st, run, dist,
                         vit_am, vit_pm, notes }
goals/config           { race_date, bf_estimate_current, bf_target_pct,
                         protein_target_g, tdee_low, tdee_high, weight_baseline_kg, notes }
analysis/<timestamp>    { text, created_at }
photos/<date>-<angle>   { image, ... }   angle = abs | side | back | arms

Baseline: race_date 2026-09-20 | bf_estimate_current 19% | bf_target 14%
          protein_target 126 g | TDEE 2500–2800 kcal | weight_baseline 70 kg

## 7. BACKLOG
B1 Scaffold repo PWA — struktur file, manifest, service worker, ikon, splash  [BERIKUTNYA]
B2 Layout mobile: bottom nav, kartu dashboard, form quick-log satu tangan     [antre]
B3 Tampilan weekly strength training — grid 7 hari, sesi coach read-only      [antre]
B4 Tampilan progressive overload — fokus volume & endurance, bukan 1RM        [antre]
B5 Skema data recovery, asumsi input manual dari Zepp                         [antre]
C1 Migrasi ke Supabase                                                        [Fase 1]
C2 Pipeline sync intervals.icu — butuh API key                                [Fase 2]
C3 Sync Strava lewat OAuth                                                    [Fase 2]
C4 Analisis mingguan otomatis Senin pagi WIB                                  [Fase 3]

Ditunggu dari Rausyan: API key intervals.icu; nama repo GitHub (default "arete").

## 8. LOG KEPUTUSAN
2 Sep  Sesi ST offline dengan coach fixed. Daily micro-track dipisah dari sesi gym.
2 Sep  Empat pilar jalan bareng, versi ringan, iteratif. App personal/private.
4 Sep  Brand final. Wordmark macron ē, bukan acute é.
4 Sep  Typeface Poppins SemiBold 600, letter-spacing -0,02em.
4 Sep  Background siang putih (bukan cream), malam hitam.
4 Sep  Animasi penuh hanya cold start; buka berikutnya fade cepat.
4 Sep  Mobile-first, web/laptop ditunda.
4 Sep  Splash disetujui setelah bug centering diperbaiki.
4 Sep  Hevy Pro tidak diambil.
4 Sep  Pindah dari Claude artifact ke GitHub repo + PWA. Fase 0 di GitHub Pages.
