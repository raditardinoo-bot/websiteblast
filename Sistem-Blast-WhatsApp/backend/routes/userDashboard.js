const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Data User
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        waSessions: true
      }
    });

    if (!user) return res.status(404).json({ error: "Pengguna tidak ditemukan" });

    // Pengaturan global
    const settings = await prisma.appSetting.findFirst();
    const rewardPerMessage = settings ? settings.rewardPerMessage : 50;

    // Statistik WaSession (Device)
    const totalWa = user.waSessions.filter(s => s.sessionName !== 'Menunggu Tautan').length;
    const activeWa = user.waSessions.filter(wa => wa.status === 'CONNECTED').length;
    const offlineWa = totalWa - activeWa;

    const income = user.balance;

    res.json({
      user: {
        name: user.name,
        username: user.username,
        tier: user.tier,
        balance: user.balance,
        bankType: user.bankType,
        bankName: user.bankName,
        bankAccount: user.bankAccount,
        bankOwner: user.bankOwner,
        joinedAt: user.createdAt
      },
      stats: {
        totalWa,
        activeWa,
        offlineWa,
        income,
        messagesSent: Math.floor(income / rewardPerMessage) // Asumsi
      },
      settings: {
        rewardPerMessage,
        minWithdrawalBank: settings ? settings.minWithdrawalBank : 50000,
        minWithdrawalEwallet: settings ? settings.minWithdrawalEwallet : 10000,
        maxWithdrawalBank: settings ? settings.maxWithdrawalBank : 5000000,
        maxWithdrawalEwallet: settings ? settings.maxWithdrawalEwallet : 500000,
        adminFeeBank: settings ? settings.adminFeeBank : 2500,
        adminFeeEwallet: settings ? settings.adminFeeEwallet : 300,
        ruleProfileName: settings ? settings.ruleProfileName : "",
        ruleProfilePhotoUrl: settings ? settings.ruleProfilePhotoUrl : "",
        popupEnabledDashboard: settings ? settings.popupEnabledDashboard : true,
        popupType: settings ? settings.popupType : "IMAGE",
        popupMediaUrls: settings ? settings.popupMediaUrls : "",
        popupText: settings ? settings.popupText : ""
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memuat dashboard pengguna" });
  }
});

router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { bankType, bankName, bankAccount, bankOwner, name, password } = req.body;
    
    let updateData = { bankType, bankName, bankAccount, bankOwner };
    if (name) updateData.name = name;
    if (password) {
      const bcrypt = require('bcryptjs');
      updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id: req.user.userId },
      data: updateData
    });
    
    res.json({ message: "Profil berhasil disimpan" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menyimpan profil" });
  }
});

module.exports = router;
