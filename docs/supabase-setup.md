# Areté — langkah setup Supabase

Urutannya penting. Langkah 2 yang bikin email mengirim **kode**, bukan tautan.

## 1. Buat tabelnya

Supabase → **SQL Editor** → New query → tempel seluruh isi `docs/supabase.sql` → **Run**.
Aman dijalankan berkali-kali.

## 2. Ubah template email jadi kode, bukan tautan

Ini langkah yang paling mudah terlewat, dan kalau terlewat kamu akan menerima
tautan padahal aplikasi meminta kode.

Supabase → **Authentication** → **Emails** (atau Email Templates) → pilih
**Magic Link** → ganti isinya dengan:

**Subject**

```
Kode masuk Areté
```

**Body**

```html
<h2>Kode masuk Areté</h2>
<p>Ketik enam angka ini di aplikasi Areté:</p>
<p style="font-size:34px;font-weight:700;letter-spacing:10px;margin:18px 0">{{ .Token }}</p>
<p style="color:#666;font-size:13px">Berlaku 60 menit. Kalau bukan kamu yang meminta, abaikan email ini.</p>
```

Kuncinya `{{ .Token }}`. Template bawaan Supabase memakai `{{ .ConfirmationURL }}`,
dan itu yang menghasilkan tautan. Supabase sebenarnya selalu membuat kodenya
juga, cuma tidak ditampilkan sampai templatenya diubah.

Kalau kamu tetap ingin tautannya ada sebagai cadangan, boleh ditaruh di bawah
kodenya. Aplikasi sudah bisa menerima dua duanya.

## 3. Aktifkan email sebagai cara masuk

Supabase → **Authentication** → **Providers** → **Email**: aktif.
Kalau ada pilihan **Confirm email**, matikan, supaya tidak diminta konfirmasi
dua kali untuk akun yang sama.

## 4. Isi alamat situs

Supabase → **Authentication** → **URL Configuration**

- Site URL: `https://arete-wine.vercel.app`
- Redirect URLs: `https://arete-wine.vercel.app`

Alur kode tidak memakai ini, tapi Supabase tetap memintanya diisi, dan ini yang
dipakai kalau suatu saat kamu mengklik tautannya.

## 5. Masuk di dua alat

Deploy, buka **Profil → Akun dan sinkronisasi**, masuk di HP, lalu masuk dengan
email yang sama di komputer.

**Sebelum masuk di alat kedua**, ekspor JSON dulu dari alat yang datanya lebih
lengkap. Alat yang masuk duluan mendorong seluruh isinya, lalu yang kedua
menarik, dan aturan yang berlaku adalah baris terbaru per hari yang menang.

## Kalau ada yang salah

| Yang terlihat | Artinya |
|---|---|
| Email berisi tautan, bukan kode | Langkah 2 belum dikerjakan |
| "Tabel sessions belum ada di Supabase" | Langkah 1 belum dikerjakan |
| "Tidak bisa menghubungi server" | Sinyal, atau alamat di `config.js` salah |
| "Kodenya salah atau sudah kedaluwarsa" | Kode lewat 60 menit, minta kode baru |
| "Terlalu sering meminta kode" | Batas Supabase, tunggu satu menit |
