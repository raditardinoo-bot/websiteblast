const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'uploads', 'campaigns');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, 'camp-' + Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Ekstensi file tidak diizinkan. Ini demi keamanan server.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// GET ALL
router.get('/', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: "Gagal memuat kampanye" });
  }
});

// CREATE
router.post('/', authenticateUser, authorizeRole('ADMIN'), upload.single('media'), async (req, res) => {
  try {
    const { name, messageTemplate, linkText, linkUrl } = req.body;
    let mediaUrl = null;
    
    if (req.file) {
      mediaUrl = `/uploads/campaigns/${req.file.filename}`;
    }

    const campaign = await prisma.campaign.create({
      data: {
        name,
        messageTemplate,
        linkText: linkText || null,
        linkUrl: linkUrl || null,
        mediaUrl,
        status: 'PAUSED' // Default to PAUSED when created
      }
    });

    res.status(201).json({ message: "Kampanye berhasil dibuat", campaign });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal membuat kampanye" });
  }
});

// TOGGLE STATUS (Hanya 1 yang aktif)
router.put('/:id/toggle', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { status } = req.body; // 'ACTIVE' atau 'PAUSED'

    if (status === 'ACTIVE') {
      // Nonaktifkan semua kampanye lain
      await prisma.campaign.updateMany({
        where: { id: { not: campaignId }, status: 'ACTIVE' },
        data: { status: 'PAUSED' }
      });
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status }
    });

    res.json({ message: "Status berhasil diubah", campaign: updatedCampaign });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengubah status" });
  }
});

// UPDATE CAMPAIGN
router.put('/:id', authenticateUser, authorizeRole('ADMIN'), upload.single('media'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    const { name, messageTemplate, linkText, linkUrl } = req.body;
    
    // Cari kampanye yang ada
    const existing = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!existing) return res.status(404).json({ error: "Kampanye tidak ditemukan" });

    let mediaUrl = existing.mediaUrl;
    
    if (req.file) {
      mediaUrl = `/uploads/campaigns/${req.file.filename}`;
      // Note: Bisa ditambahkan script fs.unlinkSync untuk menghapus gambar lama jika perlu,
      // tapi untuk sekarang kita biarkan saja.
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name,
        messageTemplate,
        linkText: linkText || null,
        linkUrl: linkUrl || null,
        mediaUrl
      }
    });

    res.json({ message: "Kampanye berhasil diperbarui", campaign: updatedCampaign });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memperbarui kampanye" });
  }
});

// DELETE CAMPAIGN
router.delete('/:id', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const campaignId = parseInt(req.params.id);
    await prisma.campaign.delete({
      where: { id: campaignId }
    });
    res.json({ message: "Kampanye berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menghapus kampanye" });
  }
});

module.exports = router;
