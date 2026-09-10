const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateUser } = require('../middleware/authMiddleware');
const waService = require('../services/whatsappService');
const blastService = require('../services/blastService');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const prisma = new PrismaClient();

// Helper untuk hitung ukuran folder recursive
function getFolderSize(dirPath) {
  let totalSize = 0;
  if (!fs.existsSync(dirPath)) return 0;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      totalSize += getFolderSize(filePath);
    } else {
      totalSize += stats.size;
    }
  }
  return totalSize;
}

// GET all devices for logged in user
router.get('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const devices = await prisma.waSession.findMany({
      where: { 
        userId,
        NOT: {
          sessionName: 'Menunggu Tautan'
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Sync status with in-memory service
    const syncedDevices = devices.map(device => {
      const liveStatus = waService.getSessionStatus(device.id);
      const blastState = blastService.getBlastState(device.id);
      return { 
         ...device, 
         status: liveStatus === 'OFFLINE' ? device.status : liveStatus,
         blastState
      };
    });

    // Memori Cache Sederhana untuk mencegah query berat tiap detik
    if (!global.campaignCache || Date.now() - global.campaignCache.time > 15000) {
      const activeCampaign = await prisma.campaign.findFirst({
        where: { status: 'ACTIVE' }
      });
      
      let activeTargetCount = 0;
      if (activeCampaign) {
        activeTargetCount = await prisma.targetNumber.count({
          where: { campaignId: activeCampaign.id, status: 'READY' }
        });
      }
      
      global.campaignCache = {
        time: Date.now(),
        activeCampaign,
        activeTargetCount
      };
    }

    const { activeCampaign, activeTargetCount } = global.campaignCache;

    res.json({
      devices: syncedDevices,
      activeCampaign,
      activeTargetCount
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal memuat daftar perangkat" });
  }
});

// TEST SEND ROUTE
router.post('/test-send', async (req, res) => {
  try {
    const { deviceId, target, message } = req.body;
    const session = waService.sessions[deviceId];
    if (!session || !session.sock) return res.status(400).json({error: "Session offline"});
    
    const jid = target + '@s.whatsapp.net';
    const result = await session.sock.sendMessage(jid, { text: message });
    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST Start/Stop blast for all devices
router.post('/blast-all', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { action, delay, maxMessages } = req.body; 
    
    const devices = await prisma.waSession.findMany({ where: { userId } });
    
    let affected = 0;
    for (const d of devices) {
      if (action === 'START') {
        const status = waService.getSessionStatus(d.id);
        if (status === 'CONNECTED') {
           blastService.startDeviceBlast(d.id, delay || 5000, maxMessages ? parseInt(maxMessages) : null);
           affected++;
        }
      } else {
        blastService.stopDeviceBlast(d.id);
        affected++;
      }
    }
    
    res.json({ message: `Berhasil mengatur ${affected} perangkat` });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengatur blast global" });
  }
});

// POST Stop all blasts (Admin Only)
router.post('/admin/stop-all-blast', authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Akses ditolak" });
    
    const activeDevices = await prisma.waSession.findMany({
      where: { status: 'CONNECTED' }
    });
    
    let stoppedCount = 0;
    for (const d of activeDevices) {
      blastService.stopDeviceBlast(d.id);
      stoppedCount++;
    }
    
    res.json({ message: `Berhasil menghentikan ${stoppedCount} perangkat yang sedang terkoneksi.` });
  } catch (error) {
    res.status(500).json({ error: "Gagal menghentikan semua blast" });
  }
});

// POST Start/Stop blast for specific device
router.post('/:id/blast', authenticateUser, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const { action, delay, maxMessages } = req.body;

    const device = await prisma.waSession.findFirst({
      where: { id: deviceId, userId: req.user.userId }
    });
    if (!device) return res.status(404).json({ error: "Perangkat tidak ditemukan" });

    if (action === 'START') {
       let status = waService.getSessionStatus(deviceId);
       
       // Fallback: jika in-memory reset (akibat restart server), percayai database
       if (status === 'OFFLINE' && device.status === 'CONNECTED') {
           status = 'CONNECTED';
       }

       if (status !== 'CONNECTED' && !status.includes('TIDUR')) {
           return res.status(400).json({ error: "Perangkat belum terhubung" });
       }
       blastService.startDeviceBlast(deviceId, delay || 5000, maxMessages ? parseInt(maxMessages) : null);
       res.json({ message: "Blasting dimulai" });
    } else {
       blastService.stopDeviceBlast(deviceId);
       res.json({ message: "Blasting dihentikan" });
    }
  } catch (error) {
    res.status(500).json({ error: "Gagal mengatur blast perangkat" });
  }
});

// POST Create a new device and generate QR
router.post('/', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name } = req.body;

    // Clean up any abandoned pairing sessions first
    const abandonedSessions = await prisma.waSession.findMany({
      where: { userId, sessionName: 'Menunggu Tautan' },
      select: { id: true }
    });
    
    for (const s of abandonedSessions) {
      try { await waService.deleteSession(s.id); } catch(e) {}
      await prisma.waSession.delete({ where: { id: s.id } });
    }

    const deviceCount = await prisma.waSession.count({ where: { userId } });
    if (deviceCount >= 3) {
      return res.status(400).json({ error: "Batas maksimal 3 WhatsApp per akun telah tercapai." });
    }

    const device = await prisma.waSession.create({
      data: {
        userId,
        sessionName: 'Menunggu Tautan',
        // Note: Prisma status enum takes 'DISCONNECTED' or 'CONNECTED'.
        // Let's use DISCONNECTED in DB, but in memory it is STARTING.
        status: 'DISCONNECTED'
      }
    });

    res.status(201).json({ message: "Perangkat dibuat, sedang menyiapkan...", device });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal membuat perangkat" });
  }
});

// GET QR / Pairing Code status for a device
router.get('/:id/qr', authenticateUser, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    const device = await prisma.waSession.findFirst({
      where: { id: deviceId, userId: req.user.userId }
    });

    if (!device) return res.status(404).json({ error: "Perangkat tidak ditemukan" });

    const qrCode = waService.getSessionQR(deviceId);
    let status = waService.getSessionStatus(deviceId);
    
    // Fallback: jika in-memory bilang OFFLINE tapi DB bilang CONNECTED,
    // percaya DB (terjadi saat backend restart saat sesi aktif)
    if (status === 'OFFLINE' && device.status === 'CONNECTED') {
      status = 'CONNECTED';
    }
    
    // Ambil pairingCode dari memory kalau ada
    const sessionMemory = waService.sessions[deviceId];
    const pairingCode = sessionMemory ? sessionMemory.pairingCode : null;

    res.json({ qrCode, status, pairingCode });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data perangkat" });
  }
});

// POST Start session if offline
router.post('/:id/start', authenticateUser, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const device = await prisma.waSession.findFirst({
      where: { id: deviceId, userId: req.user.userId }
    });
    if (!device) return res.status(404).json({ error: "Perangkat tidak ditemukan" });

    waService.startSession(deviceId);
    res.json({ message: "Menghidupkan mesin..." });
  } catch (error) {
    res.status(500).json({ error: "Gagal memulai sesi" });
  }
});

// POST Request Pairing Code
router.post('/:id/pairing-code', authenticateUser, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) return res.status(400).json({ error: "Nomor telepon wajib diisi" });

    const device = await prisma.waSession.findFirst({
      where: { id: deviceId, userId: req.user.userId }
    });

    if (!device) return res.status(404).json({ error: "Perangkat tidak ditemukan" });

    const code = await waService.getPairingCode(deviceId, phoneNumber);
    
    res.json({ message: "Berhasil mendapatkan kode", pairingCode: code });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal membuat pairing code. Pastikan nomor format internasional (misal 628xxx)." });
  }
});

// GET Storage Stats (Admin Only)
router.get('/storage/stats', authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Akses ditolak" });
    const totalDevices = await prisma.waSession.count();
    // Path diubah ke folder backend-worker karena sistem Baileys dipindah ke sana
    const sessionsDir = path.join(__dirname, '..', '..', 'backend-worker', 'sessions');
    let sizeInBytes = 0;
    try {
      sizeInBytes = getFolderSize(sessionsDir);
    } catch(e) {}
    
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    res.json({ totalDevices, sizeInMB });
  } catch (error) {
    res.status(500).json({ error: "Gagal memuat statistik penyimpanan" });
  }
});

// GET Inactive Sessions Count (Admin Only)
router.get('/inactive/check', authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Akses ditolak" });
    const days = parseInt(req.query.days) || 3;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const count = await prisma.waSession.count({
      where: {
        status: 'DISCONNECTED',
        updatedAt: { lt: dateLimit }
      }
    });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengecek sesi mati" });
  }
});

// DELETE Inactive Sessions (Admin Only)
router.delete('/inactive/clean', authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Akses ditolak" });
    const days = parseInt(req.query.days) || 3;
    const limit = parseInt(req.query.limit) || 100000; // Default ambil semua kalau nggak ada limit
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const devices = await prisma.waSession.findMany({
      where: {
        status: 'DISCONNECTED',
        updatedAt: { lt: dateLimit }
      },
      take: limit
    });

    let deleted = 0;
    for (const d of devices) {
      // Perintah ke worker (kalau worker hidup)
      await waService.deleteSession(d.id);
      blastService.clearBlastState(d.id);
      await prisma.waSession.delete({ where: { id: d.id } });
      deleted++;
    }

    // Pembersihan Fisik Tambahan (Orphaned Folders)
    // Berjaga-jaga kalau ada folder nyangkut saat worker mati
    let orphanedCleaned = 0;
    try {
      const fs = require('fs');
      const sessionsDir = path.join(__dirname, '..', 'auth_info');
      if (fs.existsSync(sessionsDir)) {
        const remainingSessions = await prisma.waSession.findMany({ select: { id: true } });
        const activeIds = remainingSessions.map(s => s.id);
        const folders = fs.readdirSync(sessionsDir);
        
        for (const folder of folders) {
          if (folder.startsWith('session_')) {
            const sId = parseInt(folder.replace('session_', ''));
            if (!activeIds.includes(sId)) {
              fs.rmSync(path.join(sessionsDir, folder), { recursive: true, force: true });
              orphanedCleaned++;
            }
          }
        }
      }
    } catch(e) {
      console.error("Gagal membersihkan folder hantu:", e);
    }

    res.json({ message: `Berhasil menghapus ${deleted} sesi mati dan ${orphanedCleaned} folder hantu.` });
  } catch (error) {
    res.status(500).json({ error: "Gagal membersihkan sesi mati" });
  }
});

// DELETE Junk "Menunggu Tautan" Sessions (Admin Only)
router.delete('/inactive/clean-junk', authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Akses ditolak" });
    
    const junkDevices = await prisma.waSession.findMany({
      where: { sessionName: 'Menunggu Tautan' },
      select: { id: true }
    });

    let deleted = 0;
    for (const d of junkDevices) {
      // Perintah ke worker
      try {
        await waService.deleteSession(d.id);
        blastService.clearBlastState(d.id);
      } catch(e) {} // ignore if worker not responding
      await prisma.waSession.delete({ where: { id: d.id } });
      deleted++;
    }

    res.json({ message: `Berhasil menghapus ${deleted} perangkat "Menunggu Tautan".` });
  } catch (error) {
    res.status(500).json({ error: "Gagal membersihkan perangkat sampah" });
  }
});

// DELETE All Sessions (Admin Only) - Danger Zone
router.delete('/inactive/clean-all', authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ error: "Akses ditolak" });

    const allDevices = await prisma.waSession.deleteMany({});
    
    // Clear all from memory
    const fs = require('fs');
    const sessionsDir = path.join(__dirname, '..', 'auth_info');
    if (fs.existsSync(sessionsDir)) {
      fs.rmSync(sessionsDir, { recursive: true, force: true });
      fs.mkdirSync(sessionsDir);
    }
    
    for (const key in blastService.blastStates) {
      blastService.clearBlastState(key);
    }

    res.json({ message: `Berhasil mereset total ${allDevices.count} perangkat dan mengosongkan folder fisik.` });
  } catch (error) {
    res.status(500).json({ error: "Gagal mereset semua sesi" });
  }
});

// DELETE a device
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    // Pastikan device ini milik user
    const device = await prisma.waSession.findFirst({
      where: { id: deviceId, userId: req.user.userId }
    });

    if (!device) return res.status(404).json({ error: "Perangkat tidak ditemukan" });

    // Hapus sesi baileys dan file auth
    await waService.deleteSession(deviceId);
    blastService.clearBlastState(deviceId);

    // Hapus dari DB
    await prisma.waSession.delete({
      where: { id: deviceId }
    });

    res.json({ message: "Perangkat berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menghapus perangkat" });
  }
});

module.exports = router;
