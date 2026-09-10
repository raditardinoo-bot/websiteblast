# WA Blast System (TRYWSBLAST)

WA Blast System adalah aplikasi berbasis web (Fullstack) untuk mengelola perangkat WhatsApp, mengirim pesan massal (*blast*), dan mengelola aktivitas pengguna (sistem referral, saldo, & penarikan/withdrawal). Aplikasi ini dibagi menjadi dua bagian:
1. **Frontend**: Next.js (React) dengan Tailwind CSS
2. **Backend**: Node.js, Express, Baileys (Library WA), dan Prisma ORM (MySQL)

## Fitur Utama
* **Dashboard Admin**: Mengelola daftar pekerja (user), memantau status kampanye *blast*, menyetujui/menolak penarikan dana, dan mengatur konfigurasi web secara dinamis (tema gambar, notifikasi otomatis Telegram, aturan pop-up, tombol CS).
* **Dashboard User**: Menghubungkan perangkat WhatsApp (melalui *Scan* QR), melakukan *blast* pesan ke nomor target, memantau *reward*/saldo dari pesan yang terkirim, melakukan penarikan (*withdraw*), dan melacak tautan *referral*.
* **WhatsApp Multi-Device**: Terintegrasi langsung dengan server menggunakan pustaka Baileys yang andal dan ringan.

## Persyaratan Sistem
Pastikan Anda telah menginstal perangkat lunak berikut sebelum menjalankan aplikasi:
* **Node.js** (Versi 18 LTS atau 20 direkomendasikan)
* **MySQL** (Sebagai Database Server)
* **Git** (Opsional)

---

## Cara Menjalankan Proyek di Komputer Lokal (Localhost)

Ikuti instruksi bertahap di bawah ini untuk menjalankan aplikasi secara lokal:

### 1. Setup Database & Backend
1. Buka terminal/Command Prompt, arahkan ke folder `backend`.
2. Instal semua paket yang dibutuhkan:
   ```bash
   cd backend
   npm install
   ```
3. Buat *database* kosong di MySQL Anda (misalnya dengan nama `wa_blast_db`).
4. Buka file `.env` di folder `backend`, lalu sesuaikan `DATABASE_URL` dengan *database* Anda:
   ```env
   DATABASE_URL="mysql://root:@localhost:3306/wa_blast_db"
   JWT_SECRET="rahasia_anda_disini"
   PORT=5000
   ```
5. Sinkronisasi skema Prisma ke database:
   ```bash
   npx prisma db push
   ```
6. Masukkan data awal (*seed*) agar Anda memiliki akun untuk login:
   ```bash
   node seed.js
   ```
7. Jalankan *server* Backend:
   ```bash
   npm run dev
   ```
   *(Backend akan berjalan di `http://localhost:5000`)*

### 2. Setup Frontend
1. Buka jendela terminal/Command Prompt baru, arahkan ke folder `frontend`.
2. Instal semua paket yang dibutuhkan:
   ```bash
   cd frontend
   npm install
   ```
3. Buka file `.env` di dalam folder `frontend` dan pastikan URL Backend sudah mengarah ke localhost:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   ```
4. Jalankan *server* Frontend:
   ```bash
   npm run dev
   ```
   *(Frontend akan terbuka di `http://localhost:3000`)*

---

## Cara Login (Akses Awal)
Jika Anda telah mengeksekusi `node seed.js` pada langkah setup Backend di atas, Anda bisa mengakses sistem menggunakan kredensial bawaan berikut:

**Akses Panel Admin:**
- **URL**: `http://localhost:3000/admin/login`
- **Username**: `admin`
- **Password**: `password`

**Akses Panel User (Pekerja):**
- **URL**: `http://localhost:3000/login`
- **Username**: `testuser`
- **Password**: `password`

---

## Screenshot / Tampilan Aplikasi

Berikut adalah beberapa cuplikan antarmuka dari WA Blast System:

### Halaman Login
![Login](images/1%20(1).png)

### Dashboard Admin
![Admin Dashboard](images/1%20(13).png)

### Manajemen WhatsApp Device (Sisi User)
![User Device](images/1%20(16).png)

### Pengaturan Admin (Kustomisasi Web)
![Pengaturan System](images/1%20(18).png)

### Fitur Kustomisasi Background (Cropping Image)
![Fitur Cropper](images/1%20(20).png)

> **Catatan:** Untuk melihat koleksi *screenshot* lengkap, silakan jelajahi folder `images/` yang ada di dalam repository ini.
