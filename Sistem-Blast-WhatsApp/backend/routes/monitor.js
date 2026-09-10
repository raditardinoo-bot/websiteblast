const express = require('express');
const router = express.Router();
const blastService = require('../services/blastService');
const { authenticateUser } = require('../middleware/authMiddleware');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/monitor
// Hanya bisa diakses oleh admin
router.get('/', authenticateUser, async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Hanya Admin yang dapat mengakses monitor" });
    }

    const metrics = blastService.engineMetrics();
    const blastStates = blastService.blastStates;
    
    // Compute LIVE stats from blastStates
    let liveStats = Object.keys(blastStates).map(deviceId => {
        const state = blastStates[deviceId];
        if (!state.isBlasting) {
            if (!state.messagesAttempted && !state.messagesSent) return null; // Never started
            if (state.stoppedAt && Date.now() - state.stoppedAt > 3000) return null; // Stopped > 3s ago
        }
        return {
            id: Number(deviceId),
            sent: state.messagesSent || 0,
            failed: state.messagesFailed || 0,
            invalid: state.invalidNumbers || 0,
            status: state.status || 'UNKNOWN'
        };
    }).filter(s => s !== null);

    if (liveStats.length > 0) {
        const devices = await prisma.waSession.findMany({
            where: { id: { in: liveStats.map(s => s.id) } },
            include: { user: { select: { username: true } } }
        });
        const dMap = {};
        devices.forEach(d => dMap[d.id] = d);
        
        liveStats.forEach(s => {
            const d = dMap[s.id];
            s.sessionName = d ? d.sessionName : `Device ${s.id}`;
            s.user = d ? d.user : { username: 'Unknown' };
        });
    }

    liveStats.sort((a, b) => b.sent - a.sent);
    const top10 = liveStats.slice(0, 10);
    const bottom5 = [...liveStats].sort((a, b) => a.sent - b.sent).slice(0, 5);

    res.json({
      ...metrics,
      top10,
      bottom5
    });
  } catch (error) {
    console.error("Monitor Route Error:", error);
    res.status(500).json({ error: "Gagal mengambil data monitor" });
  }
});

module.exports = router;
