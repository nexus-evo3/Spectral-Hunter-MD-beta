/**
 * SPECTRAL HUNTER — Script de connexion
 * Lancez ce script UNE SEULE FOIS pour générer la session.
 * Usage : node connect.js 237681015024
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");

const AUTH_FOLDER = "auth_info";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askNumber() {
  return new Promise((resolve) => {
    if (process.argv[2]) {
      resolve(process.argv[2].replace(/[^0-9]/g, ""));
      return;
    }
    rl.question("\n📱 Entrez votre numéro WhatsApp (avec indicatif, sans +) : ", (answer) => {
      resolve(answer.replace(/[^0-9]/g, ""));
    });
  });
}

async function connect() {
  console.log("\n🛡️  SPECTRAL HUNTER MD V1 — Connexion WhatsApp\n");

  const number = await askNumber();
  if (!number || number.length < 8) {
    console.log("❌ Numéro invalide !");
    process.exit(1);
  }

  console.log(`📱 Numéro : ${number}`);
  console.log("⏳ Démarrage...\n");

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: Browsers.ubuntu("Chrome"),
    mobile: false,
    keepAliveIntervalMs: 10000,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode(number);
          const formatted = code?.match(/.{1,4}/g)?.join("-") || code;

          console.log("\n╔══════════════════════════════════════════════╗");
          console.log("║         🛡️  SPECTRAL HUNTER MD V1           ║");
          console.log("║                                              ║");
          console.log(`║   CODE : ${formatted.padEnd(36)}║`);
          console.log("║                                              ║");
          console.log("║  WhatsApp > Appareils connectés              ║");
          console.log("║  > Connecter avec un numéro de téléphone     ║");
          console.log("╚══════════════════════════════════════════════╝\n");
        } catch (e) {
          console.log(`❌ Erreur code : ${e.message}`);
        }
      }, 10000);
    }

    if (connection === "open") {
      console.log("\n✅ Connexion réussie ! Session sauvegardée.");
      console.log("🚀 Lancez maintenant : node index.js\n");
      rl.close();
      process.exit(0);
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code === DisconnectReason.loggedOut) {
        console.log("❌ Déconnecté. Relancez le script.");
        process.exit(1);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

connect().catch((e) => {
  console.error("Erreur :", e.message);
  process.exit(1);
});
  
