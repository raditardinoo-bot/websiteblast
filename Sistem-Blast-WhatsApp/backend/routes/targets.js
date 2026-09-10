const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const router = express.Router();
const prisma = new PrismaClient();

const upload = multer({ dest: 'uploads/temp/' });

function cleanPhone(phone) {
  let p = phone.toString().replace(/\D/g, '');
  if (p.startsWith('0')) {
    p = '62' + p.substring(1);
  }
  return p;
}

// GET all targets stats (With Server-Side Pagination)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const status = req.query.status || 'ALL';
    const campaignId = req.query.campaignId || 'ALL';

    const whereClause = {};
    if (status !== 'ALL') {
       if (status === 'READY') {
          whereClause.status = { in: ['READY', 'PROCESSING'] };
       } else {
          whereClause.status = status;
       }
    }
    if (campaignId !== 'ALL') {
       whereClause.campaignId = parseInt(campaignId);
    }

    const targets = await prisma.targetNumber.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { 
        campaign: true,
        waSession: { include: { user: true } }
      }
    });

    const totalFiltered = await prisma.targetNumber.count({ where: whereClause });
    const totalPages = Math.ceil(totalFiltered / limit);
    
    const stats = {
      total: await prisma.targetNumber.count(),
      ready: await prisma.targetNumber.count({ where: { status: { in: ['READY', 'PROCESSING'] } } }),
      sukses: await prisma.targetNumber.count({ where: { status: 'SUKSES' } }),
      gagal: await prisma.targetNumber.count({ where: { status: 'GAGAL' } })
    };

    res.json({ targets, stats, pagination: { page, limit, totalFiltered, totalPages } });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil data nomor" });
  }
});

// POST Manual Input
router.post('/manual', async (req, res) => {
  try {
    const { phones, campaignId } = req.body;
    if (!phones || !Array.isArray(phones)) {
      return res.status(400).json({ error: "Data tidak valid" });
    }
    if (!campaignId) {
      return res.status(400).json({ error: "Pilih kampanye terlebih dahulu" });
    }

    const cleanPhones = phones.map(cleanPhone).filter(p => p.length >= 10);

    const dataToInsert = cleanPhones.map(phone => ({
      phone,
      status: 'READY',
      campaignId: parseInt(campaignId)
    }));

    if (dataToInsert.length > 0) {
      await prisma.targetNumber.createMany({
        data: dataToInsert
      });
    }

    res.json({ message: `Berhasil menambahkan nomor baru.` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menambahkan nomor" });
  }
});

// POST Upload Excel
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { campaignId } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "File wajib ada" });
    }
    if (!campaignId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Pilih kampanye terlebih dahulu" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    let phones = [];
    
    for (let i = 0; i < rows.length; i++) {
      for (let j = 0; j < rows[i].length; j++) {
        let cellValue = rows[i][j];
        if (cellValue) {
          let cleaned = cleanPhone(cellValue);
          if (cleaned.length >= 10 && cleaned.length <= 15) {
            phones.push(cleaned);
          }
        }
      }
    }

    const dataToInsert = phones.map(phone => ({
      phone,
      status: 'READY',
      campaignId: parseInt(campaignId)
    }));

    if (dataToInsert.length > 0) {
      await prisma.targetNumber.createMany({
        data: dataToInsert
      });
    }

    fs.unlinkSync(req.file.path);

    res.json({ message: `Berhasil mengekstrak ${phones.length} nomor dari Excel` });
  } catch (error) {
    console.error(error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: "Gagal memproses file Excel" });
  }
});

// DELETE clean by status
router.delete('/clean/:status', async (req, res) => {
  try {
    const status = req.params.status.toUpperCase();
    if (!['SUKSES', 'GAGAL'].includes(status)) {
       return res.status(400).json({ error: "Status tidak valid untuk dibersihkan" });
    }
    const deleted = await prisma.targetNumber.deleteMany({
      where: { status: status }
    });
    res.json({ message: `Berhasil membersihkan ${deleted.count} nomor ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal membersihkan nomor terpakai" });
  }
});

// DELETE single target
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.targetNumber.delete({
      where: { id }
    });
    res.json({ message: "Nomor berhasil dihapus" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menghapus nomor" });
  }
});

module.exports = router;
