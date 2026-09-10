const waService = require('./whatsappService');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
const logFile = path.join(logDir, 'blast.log');

const writeLog = (deviceId, targetPhone, status, detail) => {
  const time = new Date().toLocaleString('id-ID');
  
  // Amankan JSON.stringify dari error Circular atau Buffer panjang
  let detailStr = detail;
  if (typeof detail === 'object' && detail !== null) {
    try {
      detailStr = JSON.stringify(detail, (key, val) => {
        if (val && val.type === 'Buffer') return '[Buffer]';
        return val;
      });
    } catch (e) {
      detailStr = String(detail);
    }
  }

  const line = `[${time}] Device: ${deviceId} | Target: ${targetPhone} | Status: ${status} | Raw Response: ${detailStr}\n`;
  fs.appendFile(logFile, line, (err) => {
    if (err) console.error("Gagal menulis log blast:", err);
  });
};

// { [deviceId]: { isBlasting: boolean, delay: number, loopActive: boolean, messagesAttempted: number, messagesSent: number, messagesFailed: number, incomeEarned: number } }
const blastStates = {};

const getBlastState = (deviceId) => {
  if (!blastStates[deviceId]) {
    blastStates[deviceId] = { 
      isBlasting: false, 
      status: 'IDLE',
      delay: 5000, 
      maxMessages: null,
      loopActive: false, 
      messagesAttempted: 0,
      messagesSent: 0, 
      messagesFailed: 0,
      incomeEarned: 0,
      pendingStartTime: null,
      nextActionTime: null
    };
  }
  return blastStates[deviceId];
};

const startDeviceBlast = (deviceId, delay, maxMessages = null) => {
  const state = getBlastState(deviceId);
  state.isBlasting = true;
  state.status = 'RUNNING';
  state.delay = delay;
  state.maxMessages = maxMessages;
  state.pendingStartTime = null;
  state.nextActionTime = null;

  if (!state.loopActive) {
    runBlastLoop(deviceId);
  }
};

const stopDeviceBlast = (deviceId) => {
  const state = getBlastState(deviceId);
  state.isBlasting = false;
  state.status = 'STOPPED';
};

const runBlastLoop = async (deviceId) => {
  const state = getBlastState(deviceId);
  state.loopActive = true;

  while (state.isBlasting) {
    try {
      if (state.maxMessages !== null && state.messagesAttempted >= state.maxMessages) {
         console.log(`[Blast] Device ${deviceId} reached max messages: ${state.maxMessages}`);
         state.isBlasting = false;
         state.status = 'COMPLETED';
         break;
      }

      // 1. Check if socket is connected
      const session = waService.sessions[deviceId];
      if (!session || !session.sock || session.status !== 'CONNECTED') {
        console.log(`[Blast] Device ${deviceId} offline. Pausing.`);
        state.isBlasting = false;
        state.status = 'DISCONNECTED';
        break;
      }

      // 2. Fetch the active campaign
      const activeCampaign = await prisma.campaign.findFirst({
        where: { status: 'ACTIVE' }
      });

      if (!activeCampaign) {
        console.log(`[Blast] No active campaign. Pausing device ${deviceId}.`);
        state.isBlasting = false;
        state.status = 'NO CAMPAIGN';
        break;
      }

      // 3. Ambil 1 target yang READY menggunakan Atomic Update untuk mencegah bentrok
      let target = null;
      let retries = 3;
      while (retries > 0 && !target) {
        target = await prisma.$transaction(async (tx) => {
          const t = await tx.targetNumber.findFirst({
            where: { status: 'READY', campaignId: activeCampaign.id },
            orderBy: { id: 'asc' }
          });
          
          if (!t) return null; // Memang kosong

          // Atomic Update: Pastikan status masih READY sebelum kita curi
          const updateResult = await tx.targetNumber.updateMany({
            where: { id: t.id, status: 'READY', campaignId: activeCampaign.id },
            data: { status: 'TERPAKAI', waSessionId: deviceId }
          });

          // Jika count 0, artinya target ini baru saja dicuri (dalam hitungan milidetik) oleh Device lain!
          if (updateResult.count === 0) return null; 

          return t;
        });
        
        if (target) break;
        retries--;
      }

      if (!target) {
        if (!state.pendingStartTime) state.pendingStartTime = Date.now();
        
        // Cek jika sudah lebih dari 2 menit (120000 ms)
        if (Date.now() - state.pendingStartTime > 120000) {
           console.log(`[Blast] Device ${deviceId} pending > 2 menit. Menghentikan blast.`);
           state.isBlasting = false;
           state.status = 'STOPPED (Timeout)';
           state.pendingStartTime = null;
           state.nextActionTime = null;
           break;
        }

        console.log(`[Blast] Target numbers empty. Pending device ${deviceId}.`);
        state.status = 'PENDING (Menunggu Data)';
        state.nextActionTime = Date.now() + 5000;
        await new Promise(resolve => setTimeout(resolve, 5000));
        continue;
      }

      state.pendingStartTime = null;
      state.status = 'RUNNING';

      state.messagesAttempted += 1;

      // 4. Cek apakah nomor terdaftar di WA
      const jid = `${target.phone}@s.whatsapp.net`;
      let isOnWa = false;
      try {
        const [waResult] = await session.sock.onWhatsApp(jid);
        if (waResult && waResult.exists) {
          isOnWa = true;
        }
      } catch (err) {
        console.error(`[Blast] Error checking WA number ${jid}:`, err.message);
      }

      let isSuccess = false;

      if (!isOnWa) {
        console.log(`[Blast] Device ${deviceId} skip ${target.phone} - Tidak terdaftar di WA`);
        state.messagesFailed += 1;
        writeLog(deviceId, target.phone, "GAGAL", "Tidak terdaftar di WhatsApp");
        
        try {
          const dbDevice = await prisma.waSession.findUnique({ where: { id: deviceId } });
          if (dbDevice) {
            await prisma.waSession.update({ where: { id: deviceId }, data: { messagesFailed: { increment: 1 } } });
          }
          await prisma.targetNumber.update({ 
            where: { id: target.id }, 
            data: { status: 'GAGAL', senderNumber: dbDevice ? dbDevice.sessionName : null } 
          });
        } catch (e) {}
      } else {
        const baileys = await import('@whiskeysockets/baileys');
        const { generateWAMessageFromContent, proto, prepareWAMessageMedia } = baileys;

        let isSuccess = false;
        let sendResult = null;

        try {
           let messageContent = {};
           
           if (activeCampaign.linkText && activeCampaign.linkUrl) {
              // INTERACTIVE NATIVE FLOW BUTTON
              const baileys = await import('@whiskeysockets/baileys');
              let uploadedMedia = null;
              
              if (activeCampaign.mediaUrl) {
                 const imagePath = path.join(__dirname, '..', activeCampaign.mediaUrl);
                 if (fs.existsSync(imagePath)) {
                    // Gunakan buffer dengan mimetype eksplisit untuk bypass error file-type
                    const mediaMsg = await baileys.generateWAMessage(jid, { image: fs.readFileSync(imagePath), mimetype: 'image/jpeg' }, { userJid: session.sock.user.id, upload: session.sock.waUploadToServer });
                    if (mediaMsg && mediaMsg.message && mediaMsg.message.imageMessage) {
                       uploadedMedia = { imageMessage: mediaMsg.message.imageMessage };
                    }
                 }
              }

              // Template Engine Sederhana untuk Anti-Spam dan Sapaan
              const greetings = ["Kak", "Bunda", "Bosku", "Gan", "Sis"];
              const randomName = greetings[Math.floor(Math.random() * greetings.length)];
              
              let finalTemplate = activeCampaign.messageTemplate
                  .replace(/\{\{name\}\}|\{name\}/gi, randomName)
                  .replace(/\{\{phone\}\}|\{phone\}/gi, target.phone);

              const interactiveMessageObj = {
                  header: { 
                    hasMediaAttachment: !!uploadedMedia,
                    ...(uploadedMedia ? { imageMessage: uploadedMedia.imageMessage } : {})
                  },
                  body: { text: finalTemplate },
                  footer: { text: "WhatsApp" },
                  nativeFlowMessage: {
                      buttons: [
                          {
                              "name": "cta_url",
                              "buttonParamsJson": JSON.stringify({
                                  "display_text": activeCampaign.linkText,
                                  "url": activeCampaign.linkUrl,
                                  "merchant_url": activeCampaign.linkUrl
                              })
                          }
                      ]
                  }
              };

              const msg = baileys.generateWAMessageFromContent(jid, {
                  viewOnceMessage: {
                      message: {
                          messageContextInfo: {
                              deviceListMetadata: {},
                              deviceListMetadataVersion: 2
                          },
                          interactiveMessage: interactiveMessageObj
                      }
                  }
              }, { userJid: session.sock.user.id });

              // Injeksi node binary manual untuk mem-bypass filter keamanan WhatsApp Android
              const relayRes = await session.sock.relayMessage(jid, msg.message, { 
                  messageId: msg.key.id,
                  additionalNodes: [
                      {
                          tag: 'biz',
                          attrs: {},
                          content: [
                              {
                                  tag: 'interactive',
                                  attrs: { type: 'native_flow', v: '1' },
                                  content: [{ tag: 'native_flow', attrs: { name: 'mixed', v: '9' } }]
                              }
                          ]
                      },
                      { tag: 'bot', attrs: { biz_bot: '1' } }
                  ]
              });
              isSuccess = true;
              sendResult = relayRes || "Relay Success Without Response Data";
           } else {
              // PESAN NORMAL (TEKS / GAMBAR)
              const greetings = ["Kak", "Bunda", "Bosku", "Gan", "Sis"];
              const randomName = greetings[Math.floor(Math.random() * greetings.length)];
              
              let finalTemplate = activeCampaign.messageTemplate
                  .replace(/\{\{name\}\}|\{name\}/gi, randomName)
                  .replace(/\{\{phone\}\}|\{phone\}/gi, target.phone);

              if (activeCampaign.mediaUrl) {
                 const imagePath = path.join(__dirname, '..', activeCampaign.mediaUrl);
                 if (fs.existsSync(imagePath)) {
                    messageContent = {
                       image: fs.readFileSync(imagePath),
                       mimetype: 'image/jpeg',
                       caption: finalTemplate
                    };
                 } else {
                    messageContent = { text: finalTemplate };
                 }
              } else {
                 messageContent = { text: finalTemplate };
              }
              const normalRes = await session.sock.sendMessage(jid, messageContent);
              isSuccess = true;
              sendResult = normalRes;
           }
        } catch (sendErr) {
           console.error(`[Blast] Device ${deviceId} gagal kirim ke ${target.phone}:`, sendErr.message);
           state.messagesFailed += 1;
           writeLog(deviceId, target.phone, "GAGAL", sendErr.message);
           
           try {
             await prisma.waSession.update({ where: { id: deviceId }, data: { messagesFailed: { increment: 1 } } });
           } catch (e) {}

           // Kembalikan ke READY agar dikerjakan device lain
           await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'READY', waSessionId: null } });
        }
      
        // 6. Berikan imbalan ke User pemilik device jika sukses
        if (isSuccess) {
          
          let isValidated = true; // Default selalu sukses jika fitur deteksi mati
          let failReason = "Server merespons Sukses, namun pesan ditolak/dihapus sistem keamanan dari layar chat pengirim.";

          // Ambil pengaturan aplikasi secara real-time untuk mengecek status fitur Anti-Shadowban
          const appSetting = await prisma.appSetting.findFirst();
          const isShadowbanCheckOn = appSetting ? appSetting.shadowbanCheckEnabled : false;

          if (isShadowbanCheckOn) {
            // Tunggu 4 detik untuk memberi waktu sinkronisasi ke layar chat pekerja
            await new Promise(r => setTimeout(r, 4000));
            const recentOut = session.recentOutgoing || [];
            if (!recentOut.includes(jid)) {
              isValidated = false;
            }
          }
          
          if (isValidated) {
            try {
              const dbDevice = await prisma.waSession.findUnique({ 
                where: { id: deviceId },
                include: { 
                  user: {
                    include: { referrer: true }
                  } 
                } 
              });

              if (dbDevice) {
                const reward = appSetting ? appSetting.rewardPerMessage : 50;

                // Reward untuk pekerja sendiri
                await prisma.user.update({
                  where: { id: dbDevice.userId },
                  data: { 
                    balance: { increment: reward },
                    messagesSent: { increment: 1 }
                  }
                });

                // Update total sent device
                await prisma.waSession.update({
                  where: { id: dbDevice.id },
                  data: { messagesSent: { increment: 1 } }
                });
                
                state.incomeEarned += reward;

                // Reward untuk atasan (referrer) jika ada
                if (dbDevice.user && dbDevice.user.referrer) {
                  const referrer = dbDevice.user.referrer;
                  const refReward = referrer.tier === 'VIP' 
                    ? (appSetting ? appSetting.referralRewardVip : 200)
                    : (appSetting ? appSetting.referralRewardRegular : 50);

                  await prisma.user.update({
                    where: { id: referrer.id },
                    data: {
                      balance: { increment: refReward },
                      referralEarnings: { increment: refReward },
                      referralMessageCount: { increment: 1 }
                    }
                  });
                }
              }

              state.messagesSent += 1;
              console.log(`[Blast] Device ${deviceId} SUKSES kirim pesan ke ${target.phone}`);
              writeLog(deviceId, target.phone, "SUKSES", sendResult);
              await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'SUKSES', senderNumber: dbDevice ? dbDevice.sessionName : null } });
            } catch (dbErr) {
              console.error(`[Blast] Error updating reward for ${deviceId}:`, dbErr.message);
            }
          } else {
            console.log(`[Blast] Device ${deviceId} GAGAL kirim pesan ke ${target.phone} (Tidak Muncul di Layar Chat)`);
            state.messagesFailed += 1;
            writeLog(deviceId, target.phone, "GAGAL", failReason);
            
            try {
              await prisma.waSession.update({ where: { id: deviceId }, data: { messagesFailed: { increment: 1 } } });
            } catch (e) {}

            // Kembalikan ke READY agar dikerjakan device lain
            await prisma.targetNumber.update({ where: { id: target.id }, data: { status: 'READY', waSessionId: null } });
          }
        }
      }

    } catch (err) {
      console.error(`[Blast] Device ${deviceId} ERROR:`, err.message);
    }

    // Delay sebelum kirim ke nomor berikutnya
    if (state.isBlasting) {
      state.nextActionTime = Date.now() + state.delay;
      await new Promise(r => setTimeout(r, state.delay));
    }
  }

  state.loopActive = false;
};

module.exports = {
  getBlastState,
  startDeviceBlast,
  stopDeviceBlast
};
