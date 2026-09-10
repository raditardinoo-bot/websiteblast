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
           // Find a real image
           const imagePath = path.join(__dirname, '..', 'public', 'uploads', 'media-1734458872955.jpg'); // Guessing a file exists?
           let files = fs.readdirSync(path.join(__dirname, '..', 'public', 'uploads'));
           let realImage = files.find(f => f.endsWith('.jpg') || f.endsWith('.png'));
           if (!realImage) {
               console.log("No image found to test");
               process.exit(1);
           }
           const realImagePath = path.join(__dirname, '..', 'public', 'uploads', realImage);
           console.log("Testing with file:", realImagePath);
           
           try {
               const mediaMsg = await baileys.generateWAMessage(jid, { image: fs.readFileSync(realImagePath) }, { userJid: session.sock.user.id, upload: session.sock.waUploadToServer });
               console.log("Buffer test: Media msg built");
           } catch(err) {
               console.error("Buffer test failed:", err.message);
           }
           
           try {
               const mediaMsg2 = await baileys.generateWAMessageFromContent(jid, {
                   viewOnceMessage: {
                       message: {
                           interactiveMessage: {
                               header: { hasMediaAttachment: false },
                               body: { text: "Hello" }
                           }
                       }
                   }
               }, { userJid: session.sock.user.id });
               console.log("Interactive text test: built");
           } catch(err) {
               console.error("Interactive text test failed:", err.message);
           }
         }
       }
     } catch (e) {
       console.error("Error:", e);
     }
     process.exit();
  }, 5000);
}

testInteractiveImage();
