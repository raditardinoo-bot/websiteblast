# Panduan Lengkap Deploy WA Blast System ke VPS

Dokumen ini berisi panduan *step-by-step* untuk mendeploy aplikasi WA Blast System (Frontend Next.js & Backend Express + Baileys) ke dalam Virtual Private Server (VPS) berbasis Ubuntu, mulai dari penyiapan database hingga konfigurasi domain.

---

## 1. Persiapan VPS & Instalasi Dasar
Setelah berhasil *login* ke VPS via SSH, langkah pertama adalah memperbarui sistem dan menginstal perangkat lunak yang dibutuhkan.

```bash
# 1. Update sistem operasi
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js (Versi 18 LTS atau 20 direkomendasikan)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PM2 (Manajer proses agar aplikasi tetap hidup 24/7)
sudo npm install -g pm2

# 4. Install Git (untuk meng-clone repository Anda)
sudo apt install git -y
```

---

## 2. Persiapan Database (MySQL / PostgreSQL)
Jika Anda belum menginstal database di VPS, Anda bisa menggunakan MySQL:

```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
```
*Buat database baru di MySQL:*
```bash
sudo mysql -u root -p
CREATE DATABASE wa_blast_db;
# (Opsional) Buat user khusus
CREATE USER 'blastuser'@'localhost' IDENTIFIED BY 'PasswordKuat123!';
GRANT ALL PRIVILEGES ON wa_blast_db.* TO 'blastuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Clone Repository & Setup Backend

Pindahkan file proyek Anda ke VPS (bisa via `git clone` atau FTP/SFTP). Misalkan Anda menaruhnya di `/var/www/wa-blast-system`.

```bash
cd /var/www/wa-blast-system/backend

# 1. Install dependencies backend
npm install

# 2. Setup Environment Variables (.env)
nano .env
```
Isi `.env` backend Anda:
```env
# Sesuaikan dengan kredensial database VPS Anda
DATABASE_URL="mysql://blastuser:PasswordKuat123!@localhost:3306/wa_blast_db"
JWT_SECRET="ganti_dengan_rahasia_yang_sangat_kuat_dan_panjang"
PORT=5000
```
*(Tekan `CTRL+X`, tekan `Y`, lalu `Enter` untuk menyimpan).*

```bash
# 3. Push skema database & migrasi (Prisma)
npx prisma generate
npx prisma db push

# 4. Jalankan backend menggunakan PM2
pm2 start npm --name "wa-backend" -- start
```
> **Tip:** Cek apakah backend berjalan normal menggunakan perintah `pm2 logs wa-backend`.

---

## 4. Setup Environment & Build Frontend (Next.js)

Sekarang saatnya mengatur bagian Frontend. Pastikan Anda sudah menentukan domain/subdomain yang akan digunakan untuk API Backend.

```bash
cd /var/www/wa-blast-system/frontend

# 1. Install dependencies frontend
npm install

# 2. Buat file .env khusus frontend
nano .env
```
Isi `.env` frontend Anda:
```env
# Jika backend akan diakses lewat domain:
NEXT_PUBLIC_API_URL=https://api.domainanda.com
```

```bash
# 3. Build aplikasi Next.js (Wajib dilakukan di VPS)
npm run build

# 4. Jalankan frontend menggunakan PM2
pm2 start npm --name "wa-frontend" -- start
```

---

## 5. Konfigurasi Domain dengan NGINX (Reverse Proxy)

Agar aplikasi dapat diakses lewat internet tanpa harus mengetik port (misal tanpa `:3000` atau `:5000`), kita perlu NGINX untuk menjembatani domain ke *port local*.

```bash
# 1. Install Nginx
sudo apt install nginx -y

# 2. Buat konfigurasi block server
sudo nano /etc/nginx/sites-available/wablast
```

Isikan konfigurasi berikut (Silakan sesuaikan nama domainnya):
```nginx
# --- BLOK FRONTEND ---
server {
    listen 80;
    server_name blast.domainanda.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# --- BLOK BACKEND (API) ---
server {
    listen 80;
    server_name api.domainanda.com;

    # Endpoint khusus untuk file statis / gambar slider / rule photo
    location /uploads/ {
        proxy_pass http://localhost:5000/uploads/;
        # Tambahkan header kontrol cache jika perlu
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }

    # Endpoint utama backend
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*(Tekan `CTRL+X`, tekan `Y`, lalu `Enter` untuk menyimpan).*

```bash
# 3. Aktifkan konfigurasi Nginx
sudo ln -s /etc/nginx/sites-available/wablast /etc/nginx/sites-enabled/

# Cek apakah ada yang typo
sudo nginx -t

# 4. Restart Nginx
sudo systemctl restart nginx
```

---

## 6. Mengamankan dengan SSL (HTTPS) Gratis

Keamanan HTTPS wajib untuk aplikasi WA Blast agar token dan data aman.

```bash
# Install Certbot (Let's Encrypt)
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL otomatis untuk kedua domain
sudo certbot --nginx -d blast.domainanda.com -d api.domainanda.com
```
*Ikuti instruksi di layar (masukkan email, setujui ToS).* Certbot akan secara otomatis mengedit konfigurasi Nginx Anda untuk mendukung HTTPS dan me-*redirect* koneksi HTTP ke HTTPS.

---

## 7. Amankan PM2 (Auto-Start)
Agar sistem WA Blast Anda otomatis hidup kembali ketika VPS mengalami mati listrik atau *restart*, kunci pengaturan PM2:

```bash
pm2 save
pm2 startup
```
*Salin dan jalankan perintah yang dimunculkan oleh `pm2 startup` jika diminta.*

---

## Kesimpulan
Sistem WA Blast Anda kini telah beroperasi dalam lingkungan **Production Ready**. 
- Pengguna dapat mengakses antarmuka di `https://blast.domainanda.com`
- Aplikasi Next.js akan mengambil dan melempar instruksi API ke `https://api.domainanda.com`
- Foto aturan & gambar pop-up slider akan termuat secara aman dari VPS.
- Layanan Baileys akan dijaga kesehatannya oleh PM2.
