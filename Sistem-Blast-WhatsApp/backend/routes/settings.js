const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { reloadBot } = require('../services/telegramBot');
const { authenticateUser, authorizeRole } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// Konfigurasi Multer untuk upload gambar
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, 'logo-' + Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.webp', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Ekstensi file tidak diizinkan. Ini demi keamanan server.'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// GET settings (Public - for login and profile)
router.get('/public', async (req, res) => {
  try {
    let settings = await prisma.appSetting.findFirst();
    if (!settings) {
      settings = await prisma.appSetting.create({ data: {} });
    }
    res.json({
      appName: settings.appName,
      logoUrl: settings.logoUrl,
      allowedBanks: settings.allowedBanks,
      allowedEWallets: settings.allowedEWallets,
      minWithdrawalBank: settings.minWithdrawalBank,
      minWithdrawalEwallet: settings.minWithdrawalEwallet,
      maxWithdrawalBank: settings.maxWithdrawalBank,
      maxWithdrawalEwallet: settings.maxWithdrawalEwallet,
      adminFeeBank: settings.adminFeeBank,
      adminFeeEwallet: settings.adminFeeEwallet,
      withdrawalAutoCloseEnabled: settings.withdrawalAutoCloseEnabled,
      withdrawalOpenTime: settings.withdrawalOpenTime,
      withdrawalCloseTime: settings.withdrawalCloseTime,
      csType: settings.csType,
      csValue: settings.csValue,
      ruleProfileName: settings.ruleProfileName,
      ruleProfilePhotoUrl: settings.ruleProfilePhotoUrl,
      popupEnabledDashboard: settings.popupEnabledDashboard,
      popupEnabledBlast: settings.popupEnabledBlast,
      popupType: settings.popupType,
      popupMediaUrls: settings.popupMediaUrls,
      popupText: settings.popupText,
      bgThemeType: settings.bgThemeType,
      bgImageUrl: settings.bgImageUrl,
      telegramBroadcastEnabled: settings.telegramBroadcastEnabled,
      shadowbanCheckEnabled: settings.shadowbanCheckEnabled,
      isMaintenance: settings.isMaintenance
    });
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil pengaturan" });
  }
});

// GET settings (Admin)
router.get('/', authenticateUser, authorizeRole('ADMIN'), async (req, res) => {
  try {
    let settings = await prisma.appSetting.findFirst();
    if (!settings) {
      settings = await prisma.appSetting.create({
        data: {}
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: "Gagal mengambil pengaturan" });
  }
});

// UPDATE settings (dengan atau tanpa upload file)
router.put('/', authenticateUser, authorizeRole('ADMIN'), upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'ruleProfilePhoto', maxCount: 1 }, { name: 'popupFiles', maxCount: 10 }, { name: 'bgImage', maxCount: 1 }]), async (req, res) => {
  try {
    const { 
      appName, 
      rewardPerMessage, 
      minWithdrawalBank, 
      minWithdrawalEwallet, 
      maxWithdrawalBank,
      maxWithdrawalEwallet,
      adminFeeBank,
      adminFeeEwallet,
      withdrawalAutoCloseEnabled,
      withdrawalOpenTime,
      withdrawalCloseTime,
      allowedBanks,
      allowedEWallets,
      referralRewardRegular,
      referralRewardVip,
      csType,
      csValue,
      telegramBotToken,
      telegramChatId,
      telegramChannelId,
      telegramBroadcastEnabled,
      ruleProfileName,
      popupEnabledDashboard,
      popupEnabledBlast,
      popupType,
      popupMediaUrls,
      popupText,
      bgThemeType,
      shadowbanCheckEnabled,
      isMaintenance,
      maintenanceKey
    } = req.body;
    
    let settings = await prisma.appSetting.findFirst();
    let logoUrlToSave = settings ? settings.logoUrl : null;
    let ruleProfilePhotoUrlToSave = settings ? settings.ruleProfilePhotoUrl : null;
    let bgImageUrlToSave = settings ? settings.bgImageUrl : null;

    if (req.files) {
      if (req.files['logo'] && req.files['logo'][0]) {
        logoUrlToSave = `/uploads/${req.files['logo'][0].filename}`;
      }
      if (req.files['ruleProfilePhoto'] && req.files['ruleProfilePhoto'][0]) {
        ruleProfilePhotoUrlToSave = `/uploads/${req.files['ruleProfilePhoto'][0].filename}`;
      }
      if (req.files['bgImage'] && req.files['bgImage'][0]) {
        bgImageUrlToSave = `/uploads/${req.files['bgImage'][0].filename}`;
      }
    }

    let finalPopupMediaUrls = settings ? settings.popupMediaUrls : null;

    if (popupType === 'IMAGE') {
      if (req.files && req.files['popupFiles'] && req.files['popupFiles'].length > 0) {
        // Uploaded new images, replace old ones or we can append (for now replace)
        const urls = req.files['popupFiles'].map(f => `/uploads/${f.filename}`);
        finalPopupMediaUrls = JSON.stringify(urls);
      } else if (popupMediaUrls) {
        finalPopupMediaUrls = popupMediaUrls; // could be empty string or existing string
      }
    } else if (popupType === 'VIDEO') {
      if (req.files && req.files['popupFiles'] && req.files['popupFiles'].length > 0) {
        finalPopupMediaUrls = JSON.stringify([`/uploads/${req.files['popupFiles'][0].filename}`]);
      } else if (popupMediaUrls) {
        try {
          const parsed = JSON.parse(popupMediaUrls);
          if (Array.isArray(parsed)) {
            finalPopupMediaUrls = popupMediaUrls;
          } else {
            finalPopupMediaUrls = JSON.stringify([popupMediaUrls]);
          }
        } catch (e) {
          finalPopupMediaUrls = JSON.stringify([popupMediaUrls]);
        }
      }
    }
    
    if (settings) {
      settings = await prisma.appSetting.update({
        where: { id: settings.id },
        data: {
          appName: appName || settings.appName,
          logoUrl: logoUrlToSave,
          rewardPerMessage: rewardPerMessage !== undefined ? Number(rewardPerMessage) : settings.rewardPerMessage,
          minWithdrawalBank: minWithdrawalBank !== undefined ? Number(minWithdrawalBank) : settings.minWithdrawalBank,
          minWithdrawalEwallet: minWithdrawalEwallet !== undefined ? Number(minWithdrawalEwallet) : settings.minWithdrawalEwallet,
          maxWithdrawalBank: maxWithdrawalBank !== undefined ? Number(maxWithdrawalBank) : settings.maxWithdrawalBank,
          maxWithdrawalEwallet: maxWithdrawalEwallet !== undefined ? Number(maxWithdrawalEwallet) : settings.maxWithdrawalEwallet,
          adminFeeBank: adminFeeBank !== undefined ? Number(adminFeeBank) : settings.adminFeeBank,
          adminFeeEwallet: adminFeeEwallet !== undefined ? Number(adminFeeEwallet) : settings.adminFeeEwallet,
          withdrawalAutoCloseEnabled: withdrawalAutoCloseEnabled !== undefined ? withdrawalAutoCloseEnabled === 'true' || withdrawalAutoCloseEnabled === true : settings.withdrawalAutoCloseEnabled,
          withdrawalOpenTime: withdrawalOpenTime !== undefined ? withdrawalOpenTime : settings.withdrawalOpenTime,
          withdrawalCloseTime: withdrawalCloseTime !== undefined ? withdrawalCloseTime : settings.withdrawalCloseTime,
          allowedBanks: allowedBanks || settings.allowedBanks,
          allowedEWallets: allowedEWallets || settings.allowedEWallets,
          referralRewardRegular: referralRewardRegular !== undefined ? Number(referralRewardRegular) : settings.referralRewardRegular,
          referralRewardVip: referralRewardVip !== undefined ? Number(referralRewardVip) : settings.referralRewardVip,
          csType: csType || settings.csType,
          csValue: csValue || settings.csValue,
          telegramBotToken: telegramBotToken !== undefined ? telegramBotToken : settings.telegramBotToken,
          telegramChatId: telegramChatId !== undefined ? telegramChatId : settings.telegramChatId,
          telegramChannelId: telegramChannelId !== undefined ? telegramChannelId : settings.telegramChannelId,
          telegramBroadcastEnabled: telegramBroadcastEnabled !== undefined ? telegramBroadcastEnabled === 'true' || telegramBroadcastEnabled === true : settings.telegramBroadcastEnabled,
          ruleProfileName: ruleProfileName !== undefined ? ruleProfileName : settings.ruleProfileName,
          ruleProfilePhotoUrl: ruleProfilePhotoUrlToSave,
          popupEnabledDashboard: popupEnabledDashboard !== undefined ? popupEnabledDashboard === 'true' || popupEnabledDashboard === true : settings.popupEnabledDashboard,
          popupEnabledBlast: popupEnabledBlast !== undefined ? popupEnabledBlast === 'true' || popupEnabledBlast === true : settings.popupEnabledBlast,
          popupType: popupType !== undefined ? popupType : settings.popupType,
          popupMediaUrls: finalPopupMediaUrls,
          popupText: popupText !== undefined ? popupText : settings.popupText,
          bgThemeType: bgThemeType !== undefined ? bgThemeType : settings.bgThemeType,
          bgImageUrl: bgImageUrlToSave,
          shadowbanCheckEnabled: shadowbanCheckEnabled !== undefined ? shadowbanCheckEnabled === 'true' || shadowbanCheckEnabled === true : settings.shadowbanCheckEnabled,
          isMaintenance: isMaintenance !== undefined ? isMaintenance === 'true' || isMaintenance === true : settings.isMaintenance,
          maintenanceKey: maintenanceKey !== undefined ? maintenanceKey : settings.maintenanceKey,
        }
      });
    } else {
      settings = await prisma.appSetting.create({
        data: { 
          appName: appName || "TRYWSBLAST", 
          logoUrl: logoUrlToSave,
          rewardPerMessage: rewardPerMessage !== undefined ? Number(rewardPerMessage) : 50, 
          minWithdrawalBank: minWithdrawalBank !== undefined ? Number(minWithdrawalBank) : 50000, 
          minWithdrawalEwallet: minWithdrawalEwallet !== undefined ? Number(minWithdrawalEwallet) : 10000, 
          maxWithdrawalBank: maxWithdrawalBank !== undefined ? Number(maxWithdrawalBank) : 5000000,
          maxWithdrawalEwallet: maxWithdrawalEwallet !== undefined ? Number(maxWithdrawalEwallet) : 500000,
          adminFeeBank: adminFeeBank !== undefined ? Number(adminFeeBank) : 2500,
          adminFeeEwallet: adminFeeEwallet !== undefined ? Number(adminFeeEwallet) : 300,
          withdrawalAutoCloseEnabled: withdrawalAutoCloseEnabled !== undefined ? withdrawalAutoCloseEnabled === 'true' || withdrawalAutoCloseEnabled === true : false,
          withdrawalOpenTime: withdrawalOpenTime !== undefined ? withdrawalOpenTime : "08:00",
          withdrawalCloseTime: withdrawalCloseTime !== undefined ? withdrawalCloseTime : "17:00",
          allowedBanks: allowedBanks || "BCA,BNI,BRI,MANDIRI,BSI",
          allowedEWallets: allowedEWallets || "DANA,OVO,GOPAY,LINKAJA,SHOPEEPAY",
          referralRewardRegular: referralRewardRegular !== undefined ? Number(referralRewardRegular) : 50,
          referralRewardVip: referralRewardVip !== undefined ? Number(referralRewardVip) : 200,
          csType: csType || "WA",
          csValue: csValue || "628123456789",
          telegramBotToken: telegramBotToken || null,
          telegramChatId: telegramChatId || null,
          telegramChannelId: telegramChannelId || null,
          telegramBroadcastEnabled: telegramBroadcastEnabled !== undefined ? telegramBroadcastEnabled === 'true' || telegramBroadcastEnabled === true : true,
          ruleProfileName: ruleProfileName || "Nama Pegawai - TRYWSBLAST",
          ruleProfilePhotoUrl: ruleProfilePhotoUrlToSave,
          popupEnabledDashboard: popupEnabledDashboard !== undefined ? popupEnabledDashboard === 'true' || popupEnabledDashboard === true : true,
          popupEnabledBlast: popupEnabledBlast !== undefined ? popupEnabledBlast === 'true' || popupEnabledBlast === true : true,
          popupType: popupType || "IMAGE",
          popupMediaUrls: finalPopupMediaUrls,
          popupText: popupText || "aturan wajib ganti nama dan profil gitu jika tidak patuh saldo tidak bisa di witdraw",
          bgThemeType: bgThemeType || "DEFAULT",
          bgImageUrl: bgImageUrlToSave,
          shadowbanCheckEnabled: shadowbanCheckEnabled !== undefined ? shadowbanCheckEnabled === 'true' || shadowbanCheckEnabled === true : false
        }
      });
    }

    // Reload bot if token changed
    if (telegramBotToken !== undefined) {
      try {
        reloadBot(settings.telegramBotToken);
      } catch (e) {
        console.error("Gagal reload bot:", e);
      }
    }

    res.json({ message: "Pengaturan berhasil diperbarui", settings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menyimpan pengaturan" });
  }
});

module.exports = router;
