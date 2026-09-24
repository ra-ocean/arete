# Areté — setup Supabase

Ada dua cara masuk. **Pakai kata sandi.** Cara kode email cuma dipakai kalau
kamu benar benar mau, dan itu butuh SMTP sendiri.

---

## Jalur utama: kata sandi (tanpa SMTP, sekitar tiga menit)

### 1. Buat tabelnya

Supabase → **SQL Editor** → New query → tempel seluruh isi `docs/supabase.sql`
→ **Run**. Aman dijalankan berkali-kali.

### 2. Atur cara masuk

Supabase → **Authentication** → **Sign In / Providers** → **Email**

| Pengaturan | Nilai | Kenapa |
|---|---|---|
| Enable Email provider | **nyala** | ini cara masukmu |
| Confirm email | **mati** | kalau nyala, Supabase kirim email konfirmasi dan itu butuh SMTP |
| Allow new users to sign up | **nyala** | dimatikan lagi setelah dua alatmu masuk |

Itu saja. Tidak ada template email yang perlu diubah, tidak ada SMTP.

### 3. Masuk di dua alat

Deploy, buka **Profil → Akun dan sinkronisasi**.

Di alat pertama tekan **Daftar akun baru**. Di alat kedua pakai email dan kata
sandi yang sama, tekan **Masuk**. Kata sandinya disimpan browser, jadi cuma
diketik sekali per alat.

**Sebelum masuk di alat kedua**, ekspor JSON dulu dari alat yang datanya lebih
lengkap. Alat yang masuk duluan mendorong seluruh isinya, lalu yang kedua
menarik, dan yang berlaku adalah baris terbaru per hari yang menang.

### 4. Tutup pintunya

Setelah dua alatmu masuk, kembali ke **Authentication → Sign In / Providers →
Email** dan **matikan Allow new users to sign up**. Ini yang mencegah orang lain
membuat akun di project-mu. Datamu sendiri tetap terkunci RLS apa pun
keadaannya, tapi tidak ada gunanya membiarkan pintu daftar terbuka.

---

## Jalur kedua: kode email (butuh SMTP sendiri)

Supabase mengunci penyuntingan template email di balik SMTP sendiri. Tanpa itu,
template bawaannya memakai `{{ .ConfirmationURL }}` dan yang terkirim selalu
tautan, bukan kode.

Kalau kamu tetap mau kode, urutannya begini.

### A. Ambil kredensial SMTP

Pilih salah satu. Semuanya gratis di volume yang kamu butuhkan.

**Gmail** — paling cepat karena kamu sudah punya akunnya. Batas sekitar 500
email per hari, jauh di atas kebutuhan satu orang.

1. Google Account → Security → **2-Step Verification** harus menyala dulu.
2. Security → **App passwords** → buat satu, namai `Supabase Areté`.
3. Salin 16 karakter yang muncul. Itu yang dipakai, bukan kata sandi Google-mu.

| Kolom di Supabase | Isi |
|---|---|
| Host | `smtp.gmail.com` |
| Port | `587` |
| Username | alamat Gmail-mu |
| Password | app password 16 karakter tadi |
| Sender email | alamat Gmail yang sama |
| Sender name | `Areté` |

**Brevo** — kalau kamu tidak mau memakai Gmail pribadi. Gratis 300 email per hari.

1. Daftar di brevo.com, lalu **SMTP & API** → tab **SMTP**.
2. Di sana ada Login (bentuknya seperti `8a1b2c@smtp-brevo.com`) dan tombol
   membuat SMTP key.
3. Verifikasi alamat pengirim di **Senders**.

| Kolom di Supabase | Isi |
|---|---|
| Host | `smtp-relay.brevo.com` |
| Port | `587` |
| Username | login SMTP dari dashboard Brevo |
| Password | SMTP key |
| Sender email | alamat yang sudah diverifikasi di Brevo |

**Resend** — rapi, tapi untuk mengirim ke alamat selain akunmu sendiri butuh
domain yang diverifikasi.

| Kolom di Supabase | Isi |
|---|---|
| Host | `smtp.resend.com` |
| Port | `587` |
| Username | `resend` |
| Password | API key dari dashboard Resend |
| Sender email | `onboarding@resend.dev` untuk uji, atau alamat di domainmu sendiri |

### B. Pasang di Supabase

**Authentication** → **Emails** → tab **SMTP Settings** → **Enable Custom SMTP**,
isi kolom di atas, **Save**.

Sesudah tersimpan, tab **Templates** baru bisa disunting.

### C. Ubah template Magic Link

**Authentication** → **Emails** → **Templates** → **Magic Link**

Subject:

```
Kode masuk Areté
```

Body:

```html
<h2>Kode masuk Areté</h2>
<p>Ketik enam angka ini di aplikasi Areté:</p>
<p style="font-size:34px;font-weight:700;letter-spacing:10px;margin:18px 0">{{ .Token }}</p>
<p style="color:#666;font-size:13px">Berlaku 60 menit. Kalau bukan kamu yang meminta, abaikan email ini.</p>
```

Kuncinya `{{ .Token }}`. Supabase sebenarnya selalu membuat kodenya, cuma tidak
ditampilkan sampai templatenya diubah.

### D. Isi alamat situs

**Authentication** → **URL Configuration**

- Site URL: `https://arete-wine.vercel.app`
- Redirect URLs: `https://arete-wine.vercel.app`

Alur kode tidak memakai ini, tapi Supabase tetap memintanya diisi, dan ini yang
dipakai kalau tautannya yang diklik.

Di aplikasi, jalur ini ada di balik tautan kecil **Masuk pakai kode email** di
bawah tombol kata sandi.

---

## Kalau ada yang salah

| Yang terlihat | Artinya |
|---|---|
| "Email atau kata sandinya salah" | Belum daftar di email itu, atau sandinya keliru |
| "Email ini sudah punya akun" | Pakai Masuk, bukan Daftar |
| "Supabase masih meminta konfirmasi email" | Confirm email masih nyala, matikan di Providers |
| "Pendaftaran sedang dimatikan" | Allow new users to sign up sedang mati |
| "Tabel sessions belum ada di Supabase" | `docs/supabase.sql` belum dijalankan |
| "Tidak bisa menghubungi server" | Sinyal, atau alamat di `config.js` salah |
| Email berisi tautan, bukan kode | SMTP belum dipasang, atau template belum diubah |
| "Terlalu sering meminta kode" | Batas Supabase, tunggu satu menit |
