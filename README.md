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
