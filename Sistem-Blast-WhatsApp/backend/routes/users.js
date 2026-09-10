const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const waService = require('../services/whatsappService');
const blastService = require('../services/blastService');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// GET all users (with optional role filter and server-side pagination)
router.get('/', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { role, search, phoneSearch, wdFilter, sortBy, sortOrder } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;

    // Filter Tanggal WD
    const filter = wdFilter || 'week'; // default minggu ini
    let wdDateLimit = null;
    const now = new Date();
    if (filter === 'day') {
      wdDateLimit = new Date(now.setHours(0,0,0,0));
    } else if (filter === 'week') {
      // Set to Monday of this week
      const d = new Date();
      const day = d.getDay() || 7; 
      d.setHours(0,0,0,0);
      wdDateLimit = new Date(d.setDate(d.getDate() - day + 1));
    } else if (filter === 'month') {
      wdDateLimit = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filter === 'year') {
      wdDateLimit = new Date(now.getFullYear(), 0, 1);
    }

    const wdWhereClause = { status: 'APPROVED' };
    if (wdDateLimit) {
      wdWhereClause.updatedAt = { gte: wdDateLimit };
    }

    let whereClause = {};
    if (role) {
      whereClause.role = role;
    }
    
    if (search && search.trim() !== '') {
      whereClause.username = { contains: search }; // SQLite is case-insensitive by default with contains usually, or we can just rely on Prisma
    }

    if (phoneSearch && phoneSearch.trim() !== '') {
      whereClause.waSessions = {
        some: { sessionName: { contains: phoneSearch } }
      };
    }

    const totalFiltered = await prisma.user.count({ where: whereClause });
    const totalPages = Math.ceil(totalFiltered / limit);

    let prismaOrderBy = { createdAt: 'desc' };
    if (sortBy === 'balance') {
      prismaOrderBy = { balance: sortOrder === 'asc' ? 'asc' : 'desc' };
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        waSessions: true,
        withdrawals: {
          where: wdWhereClause,
          select: { amount: true }
        }
      },
      orderBy: prismaOrderBy,
      skip: (page - 1) * limit,
      take: limit
    });
    
    // Hilangkan password dari response dan hitung detail
    const safeUsers = users.map(user => {
      const { password, withdrawals, ...rest } = user;
      
      const detailedSessions = user.waSessions.map(session => {
        const liveStatus = waService.getSessionStatus(session.id);
        const blastState = blastService.getBlastState(session.id);
        return {
          id: session.id,
          sessionName: session.sessionName,
          status: liveStatus === 'OFFLINE' ? session.status : liveStatus,
          isBlasting: blastState?.isBlasting || false,
          messagesSent: session.messagesSent || 0,
          messagesFailed: session.messagesFailed || 0
        };
      });

      const onlineCount = detailedSessions.filter(s => s.status === 'CONNECTED').length;
      const blastingCount = detailedSessions.filter(s => s.isBlasting).length;
      const totalWd = withdrawals.reduce((sum, w) => sum + w.amount, 0);

      return {
        ...rest,
        totalWithdrawal: totalWd,
        totalWa: user.waSessions.filter(s => s.sessionName !== 'Menunggu Tautan').length,
        onlineWa: onlineCount,
        blastingWa: blastingCount,
        devices: detailedSessions.filter(s => s.sessionName !== 'Menunggu Tautan')
      };
    });

    // Hitung Global Stats
    const totalWa = await prisma.waSession.count({
      where: { NOT: { sessionName: 'Menunggu Tautan' } }
    });
    const connectedSessionsCount = Object.values(waService.sessions || {}).filter(s => s.status === 'CONNECTED').length;
    const blastingSessionsCount = Object.values(blastService.blastStates || {}).filter(s => s && s.isBlasting).length;

    const totalBalanceAgg = await prisma.user.aggregate({
      where: { role: 'USER' },
      _sum: { balance: true }
    });
    
    const totalWithdrawalAgg = await prisma.withdrawal.aggregate({
      where: wdWhereClause,
      _sum: { amount: true }
    });

    res.json({
      users: safeUsers,
      globalStats: {
        totalWa,
        onlineWa: connectedSessionsCount,
        blastingWa: blastingSessionsCount,
        totalBalance: totalBalanceAgg._sum.balance || 0,
        totalWithdrawal: totalWithdrawalAgg._sum.amount || 0
      },
      pagination: {
        page,
        limit,
        totalFiltered,
        totalPages
      }
    });
  } catch (error) {
    console.error("Error in GET /users:", error);
    res.status(500).json({ error: "Gagal mengambil data pengguna" });
  }
});

// POST Create User / Admin
router.post('/', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { name, username, password, role } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(400).json({ error: "Username sudah digunakan" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        password: hashedPassword,
        role: role || 'USER'
      }
    });

    res.json({ message: "Pengguna berhasil ditambahkan" });
  } catch (error) {
    res.status(500).json({ error: "Gagal membuat pengguna" });
  }
});

// PUT Update User
router.put('/:id', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, username, password, role, isActive } = req.body;

    // Cek username bentrok
    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } }
      });
      if (existing) return res.status(400).json({ error: "Username sudah dipakai orang lain" });
    }

    let updateData = { name, username, role };
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    res.json({ message: "Data pengguna berhasil diperbarui" });
  } catch (error) {
    res.status(500).json({ error: "Gagal memperbarui pengguna" });
  }
});

// DELETE User
router.delete('/:id', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await prisma.user.delete({ where: { id: userId } });
    res.json({ message: "Pengguna berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ error: "Gagal menghapus pengguna. Mungkin masih ada data terkait." });
  }
});

// PUT Update User Tier (VIP/REGULAR)
router.put('/:id/tier', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { tier } = req.body; // 'VIP' or 'REGULAR'

    if (tier !== 'VIP' && tier !== 'REGULAR') {
      return res.status(400).json({ error: "Tier tidak valid" });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { tier }
    });

    res.json({ message: `Status pengguna berhasil diubah menjadi ${tier}` });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengubah tier pengguna" });
  }
});

// SECRET: GET users without referrer
router.get('/secret/no-referral', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { referredBy: null, role: 'USER' },
      orderBy: [
        { balance: 'desc' },
        { messagesSent: 'desc' }
      ],
      select: {
        id: true,
        username: true,
        balance: true,
        messagesSent: true,
      },
      take: 50 // limit to top 50
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// SECRET: GET all potential referrers (ketua)
router.get('/secret/referrers', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const referrers = await prisma.user.findMany({
      where: { referralCode: { not: null }, role: 'USER' },
      select: {
        id: true,
        username: true,
        referralCode: true
      }
    });
    res.json(referrers);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch referrers" });
  }
});

// SECRET: PUT set referrer for a user
router.put('/secret/set-referrer', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    const { userId, referrerId } = req.body;
    await prisma.user.update({
      where: { id: userId },
      data: { referredBy: referrerId }
    });
    res.json({ message: "Ketua berhasil diatur" });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengatur ketua" });
  }
});

module.exports = router;
