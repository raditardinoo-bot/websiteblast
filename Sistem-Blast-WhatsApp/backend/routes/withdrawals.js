const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');
const { sendWithdrawalNotification, broadcastWithdrawalNotification } = require('../services/telegramBot');

const router = express.Router();
const prisma = new PrismaClient();

function isWibTimeWithinWindow(openTimeStr, closeTimeStr) {
  if (!openTimeStr || !closeTimeStr) return true;
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const wibDate = new Date(utc + (3600000 * 7)); // UTC+7
  const currentMinutes = wibDate.getHours() * 60 + wibDate.getMinutes();

  const [openH, openM] = openTimeStr.split(':').map(Number);
  const openMinutes = openH * 60 + (openM || 0);

  const [closeH, closeM] = closeTimeStr.split(':').map(Number);
  const closeMinutes = closeH * 60 + (closeM || 0);

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  } else {
    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }
}

// GET list of withdrawals
// User sees their own, Admin sees all
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { role, userId } = req.user;
    
    let withdrawals;
    if (role === 'ADMIN') {
      withdrawals = await prisma.withdrawal.findMany({
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      withdrawals = await prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
    }

    res.json(withdrawals);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data penarikan" });
  }
});

// POST Create a new withdrawal request (User only)
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { amount } = req.body;
    const { userId } = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Nominal penarikan tidak valid" });
    }

    // Ambil data user
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user.bankType || !user.bankName || !user.bankAccount || !user.bankOwner) {
      return res.status(400).json({ error: "Silakan lengkapi profil pembayaran Anda terlebih dahulu" });
    }

    // Ambil settings
    const settings = await prisma.appSetting.findFirst();
    let minWithdrawal = 50000;
    
    if (user.bankType === 'EWALLET') {
      minWithdrawal = settings ? settings.minWithdrawalEwallet : 10000;
    } else {
      minWithdrawal = settings ? settings.minWithdrawalBank : 50000;
    }

    if (settings && settings.withdrawalAutoCloseEnabled) {
      if (!isWibTimeWithinWindow(settings.withdrawalOpenTime, settings.withdrawalCloseTime)) {
        return res.status(400).json({ error: `Maaf, jam operasional penarikan hanya dibuka pada jam ${settings.withdrawalOpenTime} - ${settings.withdrawalCloseTime} WIB.` });
      }
    }

    if (amount < minWithdrawal) {
      return res.status(400).json({ error: `Minimal penarikan adalah Rp ${minWithdrawal.toLocaleString('id-ID')}` });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: "Saldo tidak mencukupi" });
    }

    // Create withdrawal
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Potong saldo secara atomic untuk mencegah race condition ganda
      const updatedUser = await tx.user.updateMany({
        where: { 
          id: userId,
          balance: { gte: amount } // Pastikan saldo masih cukup saat query dieksekusi!
        },
        data: { balance: { decrement: amount } }
      });

      if (updatedUser.count === 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      // Ambil user terbaru untuk log
      const currentUser = await tx.user.findUnique({ where: { id: userId } });

      await tx.balanceHistory.create({
        data: {
          userId,
          type: 'WITHDRAWAL',
          amount: -amount,
          oldBalance: currentUser.balance + amount,
          newBalance: currentUser.balance,
          description: `Withdrawal Request`
        }
      });

      return await tx.withdrawal.create({
        data: {
          userId,
          amount,
          bankType: user.bankType,
          bankName: user.bankName,
          bankAccount: user.bankAccount,
          bankOwner: user.bankOwner,
          status: 'PENDING'
        }
      });
    });

    // Kirim Notifikasi Telegram (Non-blocking)
    if (settings && settings.telegramBotToken && settings.telegramChatId) {
      sendWithdrawalNotification(withdrawal.id, user, amount, settings);
    }

    res.json({ message: "Permintaan penarikan berhasil diajukan", withdrawal });

  } catch (error) {
    if (error.message === "INSUFFICIENT_BALANCE") {
      return res.status(400).json({ error: "Saldo tidak mencukupi (terdeteksi transaksi ganda)" });
    }
    console.error(error);
    res.status(500).json({ error: "Gagal mengajukan penarikan" });
  }
});

// PUT Update withdrawal status (Admin only)
router.put('/:id/status', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, rejectReason } = req.body; // 'APPROVED' or 'REJECTED', and optional rejectReason

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ error: "Status tidak valid" });
    }

    const withdrawal = await prisma.withdrawal.findUnique({ where: { id } });
    if (!withdrawal) {
      return res.status(404).json({ error: "Data penarikan tidak ditemukan" });
    }

    if (withdrawal.status !== 'PENDING') {
      return res.status(400).json({ error: `Data ini sudah di-${withdrawal.status.toLowerCase()}` });
    }

    await prisma.$transaction(async (tx) => {
      const updatedWd = await tx.withdrawal.updateMany({
        where: { id, status: 'PENDING' },
        data: { 
          status,
          rejectReason: status === 'REJECTED' ? rejectReason : null
        }
      });

      if (updatedWd.count === 0) {
        throw new Error("ALREADY_PROCESSED");
      }

      // If rejected, refund the balance
      if (status === 'REJECTED') {
        const userBefore = await tx.user.findUnique({ where: { id: withdrawal.userId } });
        
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { balance: { increment: withdrawal.amount } }
        });

        await tx.balanceHistory.create({
          data: {
            userId: withdrawal.userId,
            type: 'REFUND',
            amount: withdrawal.amount,
            oldBalance: userBefore.balance,
            newBalance: userBefore.balance + withdrawal.amount,
            description: `Refund Rejection WD ID: ${id}`
          }
        });
      }
    });

    // Panggil broadcast
    const withdrawalWithUser = await prisma.withdrawal.findUnique({
      where: { id },
      include: { user: true }
    });
    if (withdrawalWithUser && withdrawalWithUser.user) {
      broadcastWithdrawalNotification(withdrawalWithUser, status, rejectReason);
    }

    res.json({ message: `Penarikan berhasil di-${status.toLowerCase()}` });

  } catch (error) {
    if (error.message === "ALREADY_PROCESSED") {
      return res.status(400).json({ error: "Data ini sudah diproses sebelumnya (terdeteksi klik ganda)" });
    }
    res.status(500).json({ error: "Gagal memperbarui status penarikan" });
  }
});

module.exports = router;
