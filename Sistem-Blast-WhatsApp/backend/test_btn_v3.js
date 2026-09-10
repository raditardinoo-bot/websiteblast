const waService = require('./services/whatsappService');
const path = require('path');
const fs = require('fs');

async function testInteractiveImage() {
  await waService.initializeSessions();
  setTimeout(async () => {
     try {
       const baileys = await import('@whiskeysockets/baileys');
       const sessionKeys = Object.keys(waService.sessions);
       if (sessionKeys.length > 0) {
         const session = waService.sessions[sessionKeys[0]];
         if (session && session.sock && session.status === 'CONNECTED') {
           const jid = '6282229281176@s.whatsapp.net';
           const imagePath = path.join(__dirname, 'uploads', 'campaigns', 'camp-1781693466969.jpeg'); 
           
           let uploadedMedia = null;
           const mediaMsg = await baileys.generateWAMessage(jid, { image: fs.readFileSync(imagePath), mimetype: 'image/jpeg' }, { userJid: session.sock.user.id, upload: session.sock.waUploadToServer });
           if (mediaMsg && mediaMsg.message && mediaMsg.message.imageMessage) {
              uploadedMedia = { imageMessage: mediaMsg.message.imageMessage };
           }

           const msg = baileys.generateWAMessageFromContent(jid, {
              viewOnceMessage: {
                  message: {
                      messageContextInfo: {
                          deviceListMetadata: {},
                          deviceListMetadataVersion: 2
                      },
                      interactiveMessage: {
                          header: { 
                            hasMediaAttachment: !!uploadedMedia,
                            ...(uploadedMedia ? { imageMessage: uploadedMedia.imageMessage } : {})
                          },
                          body: { text: "Halo ini test manual node injection!" },
                          footer: { text: "TRYWSBLAST" },
                          nativeFlowMessage: {
                              buttons: [
                                  {
                                      "name": "cta_url",
                                      "buttonParamsJson": JSON.stringify({
                                          "display_text": "Kunjungi WEB",
                                          "url": "https://google.com",
                                          "merchant_url": "https://google.com"
                                      })
                                  }
                              ]
                          }
                      }
                  }
              }
           }, { userJid: session.sock.user.id });

           const res = await session.sock.relayMessage(jid, msg.message, { 
               messageId: msg.key.id,
               additionalNodes: [
                  { tag: "biz", attrs: {}, content: [ { tag: "interactive", attrs: { type: "native_flow", v: "1" }, content: [ { tag: "native_flow", attrs: { name: "quick_reply" } } ] } ] },
                  { tag: "bot", attrs: { biz_bot: "1" } }
               ]
           });
           console.log("Sent successfully! Message ID:", msg.key.id);
         }
       }
     } catch (e) {
       console.error("Error:", e);
     }
     process.exit();
  }, 5000);
}

testInteractiveImage();
