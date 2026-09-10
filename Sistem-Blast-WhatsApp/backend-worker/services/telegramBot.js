const { Telegraf, Markup } = require('telegraf');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

let bot = null;
let currentToken = null;

const initBot = async () => {
  try {
    const settings = await prisma.appSetting.findFirst();
    if (settings && settings.telegramBotToken) {
      startBot(settings.telegramBotToken);
    }
  } catch (err) {
    console.error("Gagal inisialisasi Telegram Bot:", err);
  }
};

const startBot = (token) => {
  if (bot) {
    try {
      bot.stop();
    } catch (e) {
      // Abaikan jika bot memang belum running
    }
    bot = null;
  }
  
  currentToken = token;
  bot = new Telegraf(token);
  console.log("Telegram Bot (Telegraf) berjalan...");

  // Handle Approve
  bot.action(/^approve_(\d+)$/, async (ctx) => {
    const withdrawalId = parseInt(ctx.match[1]);

    try {
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
      
      if (!withdrawal || withdrawal.status !== 'PENDING') {
        return ctx.answerCbQuery("Penarikan ini sudah diproses atau tidak ditemukan.", { show_alert: true });
      }

      await prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'APPROVED' }
      });
      
      await ctx.answerCbQuery("✅ Penarikan berhasil disetujui!", { show_alert: true });

      await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n*(✅ Telah Disetujui)*", { parse_mode: 'Markdown' });

    } catch (err) {
      console.error(err);
      ctx.answerCbQuery("Terjadi kesalahan sistem.", { show_alert: true });
    }
  });

  // Handle Reject Menu
  bot.action(/^reject_(\d+)$/, async (ctx) => {
    const withdrawalId = parseInt(ctx.match[1]);

    try {
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
      if (!withdrawal || withdrawal.status !== 'PENDING') {
        return ctx.answerCbQuery("Penarikan ini sudah diproses atau tidak ditemukan.", { show_alert: true });
      }

      await ctx.answerCbQuery();
      
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [{ text: 'Rekening Tidak Valid', callback_data: `doreject_${withdrawalId}_1` }],
          [{ text: 'Nama Pemilik Berbeda', callback_data: `doreject_${withdrawalId}_2` }],
          [{ text: 'E-Wallet Belum Premium', callback_data: `doreject_${withdrawalId}_3` }],
          [{ text: 'Sistem Bank Gangguan', callback_data: `doreject_${withdrawalId}_4` }],
          [{ text: '🔙 Batal Tolak', callback_data: `cancelreject_${withdrawalId}` }]
        ]
      });

    } catch (err) {
      console.error(err);
      ctx.answerCbQuery("Terjadi kesalahan sistem.", { show_alert: true });
    }
  });

  // Handle Cancel Reject
  bot.action(/^cancelreject_(\d+)$/, async (ctx) => {
    const withdrawalId = parseInt(ctx.match[1]);
    await ctx.answerCbQuery();
    await ctx.editMessageReplyMarkup({
      inline_keyboard: [
        [
          { text: '✅ Setujui', callback_data: `approve_${withdrawalId}` },
          { text: '❌ Tolak', callback_data: `reject_${withdrawalId}` }
        ]
      ]
    });
  });

  // Handle Do Reject with Reason
  bot.action(/^doreject_(\d+)_(\d)$/, async (ctx) => {
    const withdrawalId = parseInt(ctx.match[1]);
    const reasonCode = ctx.match[2];
    
    const reasons = {
      '1': 'Rekening Tidak Valid',
      '2': 'Nama Pemilik Berbeda',
      '3': 'E-Wallet Belum Premium',
      '4': 'Sistem Bank Gangguan'
    };
    
    const reason = reasons[reasonCode] || 'Ditolak Admin';

    try {
      const withdrawal = await prisma.withdrawal.findUnique({ where: { id: withdrawalId } });
      
      if (!withdrawal || withdrawal.status !== 'PENDING') {
        return ctx.answerCbQuery("Penarikan ini sudah diproses atau tidak ditemukan.", { show_alert: true });
      }

      await prisma.$transaction(async (tx) => {
        await tx.withdrawal.update({
          where: { id: withdrawalId },
          data: { status: 'REJECTED', rejectReason: reason }
        });
        
        // Refund
        await tx.user.update({
          where: { id: withdrawal.userId },
          data: { balance: { increment: withdrawal.amount } }
        });
      });

      await ctx.answerCbQuery("❌ Penarikan berhasil ditolak!", { show_alert: true });
      await ctx.editMessageText(ctx.callbackQuery.message.text + `\n\n*(❌ Ditolak: ${reason})*`, { parse_mode: 'Markdown' });

    } catch (err) {
      console.error(err);
      ctx.answerCbQuery("Terjadi kesalahan sistem.", { show_alert: true });
    }
  });

  bot.launch().catch(err => console.error("Gagal launch bot:", err));

  // Enable graceful stop
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

const reloadBot = (newToken) => {
  if (newToken && newToken !== currentToken) {
    startBot(newToken);
  } else if (!newToken && bot) {
    try {
      bot.stop();
    } catch (e) {}
    bot = null;
    currentToken = null;
    console.log("Telegram Bot dimatikan.");
  }
};

const sendWithdrawalNotification = async (withdrawalId, user, amount, settings) => {
  if (!bot || !settings.telegramChatId) return;

  const isBank = user.bankType === 'BANK';
  const labelTujuan = isBank ? "No Rekening" : "No E-Wallet";
  
  const text = `🚨 *PENARIKAN DANA BARU* 🚨\n\n` +
               `*Pekerja:* ${user.name} (@${user.username})\n` +
               `*Jumlah:* Rp ${amount.toLocaleString('id-ID')}\n` +
               `*Bank/Dompet:* ${user.bankName}\n` +
               `*${labelTujuan}:* ${user.bankAccount}\n` +
               `*a/n:* ${user.bankOwner}\n\n` +
               `Silakan pilih aksi di bawah ini:`;

  try {
    await bot.telegram.sendMessage(settings.telegramChatId, text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        Markup.button.callback('✅ Setujui', `approve_${withdrawalId}`),
        Markup.button.callback('❌ Tolak', `reject_${withdrawalId}`)
      ])
    });
  } catch (err) {
    console.error("Gagal mengirim notifikasi Telegram:", err);
  }
};

module.exports = {
  initBot,
  reloadBot,
  sendWithdrawalNotification
};
