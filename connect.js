/**
 * SPECTRAL HUNTER — Script de connexion
 * Lancez ce script UNE SEULE FOIS pour générer la session.
 * Usage : node connect.js [votre_numéro]
 * Ex    : node connect.js 237682598338
 */

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const readline = require("readline");

const AUTH_FOLDER = "auth_info";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askNumber() {
  return new Promise((resolve) => {
    // Vérifier si le numéro est passé en argument
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
  console.log("\n🛡️  SPECTRAL HUNTER — Connexion WhatsApp\n");

  const number = await askNumber();
  if (!number || number.length < 8) {
    console.log("❌ Numéro invalide !");
    process.exit(1);
  }

  console.log(`\n📱 Numéro : ${number}`);
  console.log("⏳ Démarrage de la connexion...\n");

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: "silent" }),
    browser: ["Spectral Hunter", "Chrome", "1.0.0"],
    mobile: false,
  });

  sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      setTimeout(async () => {
        try {
          const code = await sock.requestPairingCode("+" + number);
          const formatted = code?.match(/.{1,4}/g)?.join("-") || code;

          console.log("╔══════════════════════════════════════════════╗");
          console.log("║         🛡️  SPECTRAL HUNTER                 ║");
          console.log("║                                              ║");
          console.log(`║   CODE : ${formatted.padEnd(36)}║`);
          console.log("║                                              ║");
          console.log("║  WhatsApp > Appareils connectés              ║");
          console.log("║  > Connecter avec un numéro de téléphone     ║");
          console.log("╚══════════════════════════════════════════════╝\n");
        } catch (e) {
          console.log(`❌ Erreur code : ${e.message}`);
        }
      }, 3000);
    }

    if (connection === "open") {
      console.log("\n✅ Connexion réussie ! Session sauvegardée.");
      console.log("🚀 Vous pouvez maintenant lancer : node index.js\n");
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

