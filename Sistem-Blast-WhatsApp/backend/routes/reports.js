const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET report data for a specific campaign
router.get('/:campaignId', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.campaignId);

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      return res.status(404).json({ error: "Kampanye tidak ditemukan" });
    }

    const targets = await prisma.targetNumber.findMany({
      where: { campaignId },
      include: {
        waSession: true
      },
      orderBy: { id: 'asc' }
    });

    const reportData = targets.map(target => {
      // Template Engine Sederhana untuk laporan
      let finalTemplate = campaign.messageTemplate.replace(/\{\{phone\}\}|\{phone\}/gi, target.phone);
      
      return {
        id: target.id,
        senderNumber: target.senderNumber ? target.senderNumber : (target.waSession ? target.waSession.sessionName : '-'),
        targetNumber: target.phone,
        messageText: finalTemplate,
        status: target.status,
        timestamp: target.updatedAt
      };
    });

    res.json(reportData);
  } catch (error) {
    console.error("Error fetching report:", error);
    res.status(500).json({ error: "Gagal memuat laporan kampanye" });
  }
});

module.exports = router;
