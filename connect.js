/**
 * SPECTRAL HUNTER — Script de connexion (whatsapp-web.js)
 * Lancez ce script UNE SEULE FOIS pour générer la session.
 * Usage : node connect.js 237681015024
 */

const { Client, LocalAuth } = require("whatsapp-web.js");
const readline = require("readline");

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
  console.log("\n🛡️  SPECTRAL HUNTER — Connexion WhatsApp\n");

  const number = await askNumber();
  if (!number || number.length < 8) {
    console.log("❌ Numéro invalide !");
    process.exit(1);
  }

  console.log(`📱 Numéro : ${number}`);
  console.log("⏳ Démarrage...\n");

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: "spectral-hunter" }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
    },
  });

  client.on("qr", async () => {
    setTimeout(async () => {
      try {
        const code = await client.requestPairingCode("+" + number);
        const formatted = code?.match(/.{1,4}/g)?.join("-") || code;

        console.log("\n╔══════════════════════════════════════════════╗");
        console.log("║         🛡️  SPECTRAL HUNTER                 ║");
        console.log("║                                              ║");
        console.log(`║   CODE : ${formatted.padEnd(36)}║`);
        console.log("║                                              ║");
        console.log("║  WhatsApp > Appareils connectés              ║");
        console.log("║  > Connecter avec un numéro de téléphone     ║");
        console.log("╚══════════════════════════════════════════════╝\n");
      } catch (e) {
        console.log(`❌ Erreur code : ${e.message}`);
        console.log("Nouvelle tentative dans 10s...");
        setTimeout(() => client.initialize(), 10000);
      }
    }, 5000);
  });

  client.on("ready", () => {
    console.log("\n✅ Connexion réussie ! Session sauvegardée.");
    console.log("🚀 Lancez maintenant : node index.js\n");
    rl.close();
    process.exit(0);
  });

  client.on("auth_failure", () => {
    console.log("❌ Échec authentification. Relancez le script.");
    process.exit(1);
  });

  client.initialize();
}

connect().catch((e) => {
  console.error("Erreur :", e.message);
  process.exit(1);
});
                
