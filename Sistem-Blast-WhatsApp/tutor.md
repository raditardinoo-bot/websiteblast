# Tutorial Deploy VPS Ubuntu 22.04 LTS (Hostinger) & Penjelasan Sistem

## 1. Apa itu JWT (JSON Web Token)?

Sebelum mulai *deploy*, mari bahas apa itu **JWT**. 
Singkatnya, **JWT (JSON Web Token)** adalah semacam "Kartu Akses Digital" atau "Karcis Masuk" yang diberikan sistem kepada *User* atau *Admin* setelah mereka sukses melakukan Login dengan *username* dan *password* yang benar.

* **Fungsinya:** Daripada setiap saat aplikasi harus mengecek *username* dan *password* ke *database*, aplikasi cukup melihat apakah *User* memiliki "Karcis Masuk" (Token JWT) yang sah. Jika Token valid dan belum kedaluwarsa, *User* boleh masuk ke Dashboard atau melakukan penarikan saldo.
* **Di mana JWT disimpan?** Di proyek ini, JWT disimpan di `localStorage` pada *browser* pengguna setelah berhasil *login*. 
* **Variabel `JWT_SECRET`:** Ini adalah "Stempel Rahasia" milik server Anda. Jika *hacker* mencoba membuat JWT palsu, *server* akan tahu itu palsu karena stempelnya tidak cocok dengan `JWT_SECRET` yang ada di `.env` backend Anda.

---

## 2. Cara Setup VPS Ubuntu 22.04 LTS di Hostinger

Setelah VPS Hostinger aktif dan Anda sudah bisa masuk lewat SSH (menggunakan PuTTY atau terminal: `ssh root@IP_VPS_ANDA`), lakukan instalasi dasar berikut:

### A. Update Server & Instalasi Dasar
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install curl git nano nginx certbot python3-certbot-nginx -y
```

### B. Install Node.js & PM2
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

---

## 3. Cara "Up" (Setup) Database MySQL

Di Ubuntu 22.04 LTS, MySQL bisa diinstal dengan sangat mudah.

### A. Install MySQL
```bash
sudo apt install mysql-server -y
```

### B. Amankan MySQL & Buat Database
Jalankan perintah ini dan ikuti instruksinya (biasanya cukup ketik `Y` untuk semuanya):
```bash
sudo mysql_secure_installation
```

Masuk ke dalam MySQL Console:
```bash
sudo mysql
```

Di dalam console MySQL (teks akan diawali dengan `mysql>`), ketikkan perintah berikut baris per baris:
```sql
-- Buat database
CREATE DATABASE wa_blast_db;

-- Buat user khusus (Ganti passwordnya!)
CREATE USER 'blastuser'@'localhost' IDENTIFIED BY 'PasswordRahasia123!';

-- Beri akses user ke database tersebut
GRANT ALL PRIVILEGES ON wa_blast_db.* TO 'blastuser'@'localhost';

-- Simpan perubahan dan keluar
FLUSH PRIVILEGES;
EXIT;
```

---

## 4. Setup Kode Web & Environment (.env)

Karena kode Anda sudah ada di GitHub, Anda tinggal melakukan `git clone`.

```bash
cd /var/www
git clone https://github.com/rizkimulyawann/Sistem-Blast-WhatsApp.git wablast
cd wablast
```

### A. Setup Backend
```bash
cd /var/www/wablast/backend
npm install

# Buat file .env
nano .env
```
Isi file `.env` Backend:
```env
# Format: mysql://USER_DB:PASSWORD_DB@localhost:3306/NAMA_DB
DATABASE_URL="mysql://blastuser:PasswordRahasia123!@localhost:3306/wa_blast_db"
JWT_SECRET="bebas_isi_dengan_kalimat_acak_yang_panjang_sekali"
PORT=5000
```
*(Tekan `CTRL+X`, lalu `Y`, lalu `Enter` untuk menyimpan).*

Jalankan Database Push & Server:
```bash
npx prisma generate
npx prisma db push
node seed.js
pm2 start npm --name "wa-backend" -- start
```

### B. Setup Frontend
```bash
cd /var/www/wablast/frontend
npm install

# Buat file .env.local
nano .env.local
```
Karena **Frontend dan Backend akan menggunakan SATU DOMAIN**, Anda cukup mengarahkan API-nya ke domain Anda sendiri (misal domain Anda `websiteku.com`).
Isi `.env.local`:
```env
# Semua data API akan diambil dari websiteku.com pada jalur /api-backend/
NEXT_PUBLIC_API_URL=https://websiteku.com/api-backend
```
*(Tekan `CTRL+X`, lalu `Y`, lalu `Enter` untuk menyimpan).*

Lalu Build & Run Frontend:
```bash
npm run build
pm2 start npm --name "wa-frontend" -- start
```

**Simpan PM2 agar otomatis hidup saat VPS direstart:**
```bash
pm2 save
pm2 startup
```

---

## 5. Menyambungkan Satu Domain untuk Frontend & Backend (NGINX)

Karena Anda ingin menggunakan **satu domain saja** (misal: `websiteku.com`), kita akan membagi jalan (*routing*) menggunakan NGINX:
- Jika user mengakses `websiteku.com`, NGINX akan mengarahkannya ke **Frontend (Port 3000)**.
- Jika ada *request* ke `websiteku.com/api-backend/`, NGINX akan mengarahkannya secara diam-diam ke **Backend (Port 5000)**.

### A. Buat Konfigurasi NGINX
```bash
sudo nano /etc/nginx/sites-available/wablast
```
Isikan kode ini (Ganti `websiteku.com` dengan domain asli Anda yang sudah diarahkan DNS-nya ke IP Hostinger):

```nginx
server {
    listen 80;
    server_name websiteku.com www.websiteku.com;

    # 1. Routing Khusus Akses API ke Backend (Port 5000)
    # Harus di paling atas agar terbaca lebih dulu
    location /api-backend/ {
        # Tanda / di akhir proxy_pass sangat penting agar '/api-backend/' terhapus saat sampai di nodejs
        proxy_pass http://localhost:5000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. Routing Utama ke Frontend Next.js (Port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
*(Tekan `CTRL+X`, lalu `Y`, lalu `Enter` untuk menyimpan).*

### B. Aktifkan NGINX & SSL (HTTPS)
```bash
# Aktifkan konfigurasi
sudo ln -s /etc/nginx/sites-available/wablast /etc/nginx/sites-enabled/

# Cek apakah konfigurasi valid
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Install SSL Gratis dari Let's Encrypt
sudo certbot --nginx -d websiteku.com -d www.websiteku.com
```

Selesai! Web Anda kini bisa diakses publik menggunakan 1 domain yang aman (HTTPS), di mana Frontend dan Backend hidup rukun berdampingan secara mulus.
