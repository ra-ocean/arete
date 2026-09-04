# Areté — Brand Spec

Semua angka di sini **diukur langsung dari file artwork master**, bukan ditebak.
Hasil overlay implementasi vs artwork asli: **IoU 90,6%**.
Jangan mengubah, membulatkan, atau menurunkan presisinya.

## Nama

Dari bahasa Yunani *aretē* (ἀρετή) — keunggulan, memenuhi potensi diri.
Wordmark ditulis **huruf kecil semua** dengan **macron**: `aretē` — Unicode `U+0113`, HTML `&#x113;`.
**Bukan** `é` acute.

## Warna

| Token | Siang · 06.00–17.59 | Malam · 18.00–05.59 |
|---|---|---|
| Background | `#FFFFFF` | `#000000` |
| Foreground | `#A13838` | `#FFFFFF` |
| Muted | `rgba(161,56,56,.55)` | `rgba(255,255,255,.52)` |
| Hairline | `rgba(161,56,56,.16)` | `rgba(255,255,255,.16)` |

Tema berganti otomatis berdasarkan jam device.

## Tipografi

**Poppins SemiBold (600)**, Google Fonts, lisensi OFL — gratis termasuk untuk komersial.
Wordmark: `letter-spacing: -0.02em`.

Dipilih lewat uji pixel-IoU per-huruf terhadap 34 kandidat geometric sans:

| Font | Kecocokan |
|---|---|
| Poppins 600 | 91,4% |
| Poppins 500 | 89,6% |
| Urbanist 700 | 81,0% |
| Lexend 500 | 80,7% |

## Geometri logo — viewBox `0 0 520 300`

```
Pill:    <rect x=40 y=40 width=440 height=220 rx=110 ry=110 fill=none/>
         centreline rasio persis 2:1, cap = setengah lingkaran r=110
         pusat cap kiri (150,150), cap kanan (370,150)

Stroke:  9.2   = 4,16% tinggi centreline   (artwork: 48,5 / 1166,5 px)
Titik:   d 46  = 5,0 x stroke              (artwork: 242 / 48,5)
Posisi:  36,14 derajat masuk ke lengkungan cap dari titik singgung
         titik A = (84.9, 60.9)    -> 6,134% panjang path
         titik B = (435.1, 239.1)  -> 56,134% panjang path
```

**Penting: titik TIDAK berada di titik singgung.** Ini kesalahan yang mudah terjadi
kalau geometri ditebak dari melihat logonya saja.

Wordmark di dalam stage 520×300: `font-size: 134.97px`, Poppins 600,
`letter-spacing: -0.02em`, di-center lalu `translate(-0.6px, -5.13px)`.
Ink box hasilnya: kiri 87.7, kanan 433.3, baseline 191.8.

## Path orbit — counter-clockwise

```
M 150 40 A 110 110 0 0 0 150 260 L 370 260 A 110 110 0 0 0 370 40 L 150 40 Z
```

Panjang total 1131,15 unit — arc = π×110 = 345,575 ; garis lurus = 220.
Urutan: singgung kiri-atas → cap kiri turun → garis bawah ke kanan → cap kanan naik → garis atas ke kiri → kembali.

## Animasi splash

### Cold start — buka pertama per sesi, ±3,4 detik

| Waktu | Elemen | Detail |
|---|---|---|
| 120–680 ms | Pill | `scale(.72)→1`, opacity 0→1, `cubic-bezier(.34,1.42,.58,1)` |
| 620 / 710 ms | Dua titik | pop `scale(0)→1` 320 ms, stagger 90 ms |
| 940–1940 ms | Orbit | satu putaran penuh CCW, `cubic-bezier(.5,.02,.35,1)` |
| 1980 + i×46 ms | Wordmark | per huruf, 440 ms, fade + `translateY(14px)` + `scale(.9)` |
| 2980–3580 ms | Splash out | fade + `scale(1.05)`; isi app muncul di 3120 ms |

### Warm start — buka berikutnya, ±0,6 detik

Logo tampil utuh tanpa orbit, fade in 260 ms, splash out di 620 ms.
Deteksi lewat `sessionStorage.getItem('arete_opened')`.

## Lima jebakan teknis

Semuanya sudah diperbaiki di kode. Dicatat supaya tidak terulang saat kode ditulis ulang.

1. **Keyframe orbit bersegmen membuat easing jalan per-segmen**, bukan global — jarak dua titik melar sampai 67% (harusnya tetap 50%). Solusi: satu pasang keyframe `from/to`, biarkan `offset-distance` melewati 100% (Chromium wrap otomatis pada closed path).
2. **Menganimasikan `scale` pada elemen yang sama dengan `offset-path` menggeser titik pusatnya.** Solusi: `.dot` memegang `offset-path`, anak `<i>` di dalamnya yang di-scale.
3. **`offset-path: path()` pada elemen HTML memakai koordinat containing block.** Stage harus 520×300 px tetap lalu `transform: scale()` — bukan diubah ukurannya.
4. **Kalau layar < 520 px, layout box stage overflow dan `justify-content:center` berhenti bekerja** — di HP nyata logo bergeser 80 px ke kanan dan cap kanannya terpotong. Solusi: wrapper selebar ukuran *setelah* diskalakan, scale dari sudut kiri-atas. Diuji pada 320/384/393/430/768 px — meleset 0,0 px.
5. **Wordmark berkedip ganti font.** Tahan splash sampai `document.fonts.load('600 136px Poppins','aretē')` selesai, timeout fallback 1200 ms.
