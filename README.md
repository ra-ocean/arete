# Areté

Personal tracker untuk Project R.V.2.1 — muscle building, performa lari, dan recovery.
PWA statis: HTML/CSS/JS biasa, tanpa build step, tanpa dependency.

**Fase 0** — data tersimpan lokal di HP (IndexedDB), bisa diekspor/impor JSON.
Roadmap dan konteks lengkap ada di [`docs/HANDOFF.md`](docs/HANDOFF.md).

---

## Cara menerbitkan ke GitHub Pages

Sekali setup, ±3 menit. Tidak perlu akun selain GitHub.

1. Buat repo baru di GitHub bernama **`arete`**. Boleh private.
2. Upload semua isi folder ini ke repo (drag-and-drop di halaman repo juga bisa).
   Pastikan `index.html` ada di **root repo**, bukan di dalam subfolder.
3. Buka **Settings → Pages**.
4. Di *Source* pilih **Deploy from a branch**, branch **`main`**, folder **`/ (root)`**. Save.
5. Tunggu 1–2 menit. Alamatnya jadi `https://<username>.github.io/arete/`.
6. Buka alamat itu di HP → menu browser → **Add to Home Screen**.

Setelah terpasang, app jalan offline dan punya ikon sendiri.

> Kalau repo private, GitHub Pages butuh akun berbayar. Untuk repo public,
> Pages gratis. Tidak ada data pribadi di dalam kode — semua catatan tersimpan
> di HP, bukan di repo — jadi repo public aman.

## Pindah ke Vercel (Fase 2) — supaya intervals.icu bisa masuk

GitHub Pages hanya melayani file statis, jadi tidak bisa menyimpan API key.
Vercel melayani file statis DAN menjalankan `api/intervals.js` di server, dari satu
domain yang sama — tidak ada masalah CORS, dan key-nya tidak pernah sampai ke browser.

1. Buka **vercel.com** → **Sign up** → **Continue with GitHub**.
2. **Add New… → Project** → pilih repo `arete` → **Import**.
3. Framework Preset biarkan **Other**. Build & Output Settings tidak usah diisi.
   Repo ini tidak punya build step — Vercel menyajikan file apa adanya.
4. Sebelum menekan Deploy, buka **Environment Variables** dan isi dua ini:

   | Name | Value |
   |---|---|
   | `INTERVALS_API_KEY` | API key dari intervals.icu → Settings → Developer |
   | `INTERVALS_ATHLETE_ID` | ID atlet, bentuknya `i123456` |

5. **Deploy.** Alamatnya jadi `https://arete-xxxx.vercel.app`.
6. Setelah deploy pertama, tambahkan satu variable lagi lalu redeploy:

   | Name | Value |
   |---|---|
   | `ALLOWED_ORIGIN` | alamat Vercel kamu, mis. `https://arete-xxxx.vercel.app` |

Mulai sekarang setiap kali kamu upload file baru ke GitHub, Vercel deploy sendiri.
Tidak perlu klik apa-apa lagi.

### Yang perlu diketahui sebelum pindah

- **Data lama tidak ikut.** IndexedDB terikat ke alamat situs. Data di
  `ra-ocean.github.io` tidak muncul di `arete-xxxx.vercel.app`. Kalau sudah ada
  catatan yang sayang hilang: Profil → Ekspor JSON di situs lama, lalu Pulihkan di
  situs baru.
- **GitHub Pages boleh dibiarkan hidup** sebagai cadangan, tapi pakai satu saja
  sehari-hari — datanya tidak nyambung antar dua alamat.
- **Batas keamanan endpoint.** `ALLOWED_ORIGIN` menahan pemanggilan dari situs lain
  lewat browser, tapi tidak menahan curl yang memalsukan header. API key aman di
  server; yang bisa terbaca orang yang menebak URL hanyalah angka latihan.

## Menjalankan di komputer

`file://` tidak bisa dipakai karena service worker butuh HTTP. Jalankan server statis apa saja:

```bash
python3 -m http.server 8000
# lalu buka http://localhost:8000
```

## Struktur

```
index.html                 satu halaman, empat layar
manifest.webmanifest       supaya bisa dipasang di home screen
sw.js                      service worker — offline. Naikkan CACHE kalau file shell berubah.
assets/css/app.css         design token + semua style
assets/js/store.js         IndexedDB + ekspor/impor
assets/js/theme.js         tema otomatis ikut jam
assets/js/splash.js        animasi pembuka
assets/js/ui.js            format tanggal, grafik garis, navigasi
assets/js/app.js           logika layar
assets/icons/              ikon PWA
docs/BRAND.md              spesifikasi brand — angka hasil pengukuran
docs/HANDOFF.md            konteks penuh untuk AI mana pun
```

## Aturan yang tidak boleh dilanggar

- **Jangan pernah menulis API key di kode front-end.** Semua yang dikirim ke browser bisa dibaca siapa pun. Key hidup di environment variable serverless function (Fase 2).
- **Angka di `docs/BRAND.md` hasil pengukuran dari artwork master.** Jangan dibulatkan, jangan ditebak ulang.
- **Mobile-first.** Tampilan desktop bukan prioritas sekarang.

## Bekerja dengan AI lain

Paste isi `docs/HANDOFF.md` sebagai pesan pertama, lalu sebut item backlog yang mau dikerjakan.
