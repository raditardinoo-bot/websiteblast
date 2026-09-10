const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    // 1. Nomor Ready di Database
    const readyNumbers = await prisma.targetNumber.count({
      where: { status: 'READY' }
    });

    // 2. WA Terdaftar (jangan hitung 'Menunggu Tautan')
    const totalWa = await prisma.waSession.count({
      where: { NOT: { sessionName: 'Menunggu Tautan' } }
    });

    // 3. WA Aktif (CONNECTED)
    const activeWa = await prisma.waSession.count({
      where: { status: 'CONNECTED' }
    });

    // 4. Kampanye Saat Ini (ACTIVE)
    const activeCampaign = await prisma.campaign.findFirst({
      where: { status: 'ACTIVE' }
    });

    // 5. Total Pengguna (Hanya Pekerja, bukan ADMIN)
    const totalUsers = await prisma.user.count({
      where: { role: 'USER' }
    });

    res.json({
      readyNumbers,
      totalWa,
      activeWa,
      activeCampaign,
      totalUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memuat dashboard data" });
  }
});

module.exports = router;
