const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET Referral Stats and History for the logged-in User
router.get('/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        referredUsers: {
          select: {
            id: true,
            name: true,
            username: true,
            createdAt: true,
            referralMessageCount: true,
            messagesSent: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User tidak ditemukan" });
    }

    const totalInvited = user.referredUsers.length;
    const totalEarned = user.referralEarnings;
    const totalMessages = user.referralMessageCount;

    res.json({
      referralCode: user.referralCode,
      totalInvited,
      totalEarned,
      totalMessages,
      history: user.referredUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memuat data referral" });
  }
});

module.exports = router;
