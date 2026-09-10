const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const getJwtSecret = () => process.env.JWT_SECRET || 'secret-key-trywsblast';

let cachedAppSetting = null;
let lastAppSettingFetch = 0;

const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret);
    req.user = decoded; // { userId, role, iat, exp, maintenanceBypass }
    
    // Cek Maintenance Mode untuk USER biasa
    if (req.user.role === 'USER') {
      const now = Date.now();
      if (!cachedAppSetting || now - lastAppSettingFetch > 10000) {
        try {
          const setting = await prisma.appSetting.findFirst();
          if (setting) {
            cachedAppSetting = setting;
            lastAppSettingFetch = now;
          }
        } catch (dbErr) {
          console.error("Gagal mengambil appSetting di middleware:", dbErr);
        }
      }
      
      if (cachedAppSetting && cachedAppSetting.isMaintenance && !req.user.maintenanceBypass) {
        return res.status(403).json({ error: 'MAINTENANCE', message: 'Maaf web sedang maintenance' });
      }
    }
    
    next();
  } catch (error) {
    console.error("[Auth] Verify error:", error.message);
    return res.status(401).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
  }
};

const authorizeRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      next();
    } else {
      return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin untuk tindakan ini.' });
    }
  };
};

module.exports = { authenticateUser, authorizeRole };
