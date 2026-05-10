const { Client, LocalAuth } = require("whatsapp-web.js");
const config = require("./config");
const logger = require("./logger");
const blacklist = require("./blacklist");
const whitelist = require("./whitelist");
const store = require("./store");
const defender = require("./defender");
const router = require("./commands/router");
const keepalive = require("./keepalive");

const client = new Client({
  authStrategy: new LocalAuth({ clientId: "spectral-hunter" }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
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

// ─── CONNEXION PAR PAIRING CODE ─────────────────────────────────────────────
client.on("qr", async () => {
  try {
    logger.info("Génération du Pairing Code...");
    const number = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
    const code = await client.requestPairingCode(number);
    const formatted = code?.match(/.{1,4}/g)?.join("-") || code;

    console.log("\n");
    console.log("╔══════════════════════════════════════════════╗");
    console.log("║         🛡️  SPECTRAL HUNTER MD V1           ║");
    console.log("║                                              ║");
    console.log(`║   CODE : ${formatted.padEnd(36)}║`);
    console.log("║                                              ║");
    console.log("║  WhatsApp > Appareils connectés              ║");
    console.log("║  > Connecter avec un numéro de téléphone     ║");
    console.log("╚══════════════════════════════════════════════╝");
    console.log("\n");

    logger.info(`Pairing Code : ${formatted}`);
  } catch (e) {
    logger.warn(`Erreur Pairing Code : ${e.message}`);
  }
});

// ─── BOT CONNECTÉ ────────────────────────────────────────────────────────────
client.on("ready", async () => {
  logger.info("✅ Spectral Hunter MD V1 opérationnel !");
  keepalive.setConnected(true);
  try {
    await client.sendMessage(
      config.OWNER_NUMBER + "@c.us",
      `🛡️ *SPECTRAL HUNTER MD V1*\n\n` +
      `✅ Bot connecté et opérationnel !\n` +
      `📅 ${new Date().toLocaleString("fr-FR")}\n\n` +
      `Tapez *!help* pour voir toutes les commandes.`
    );
  } catch (_) {}
});

client.on("auth_failure", () => {
  logger.warn("❌ Échec d'authentification");
  keepalive.setConnected(false);
});

client.on("disconnected", (reason) => {
  logger.warn(`Déconnecté : ${reason}`);
  keepalive.setConnected(false);
  setTimeout(() => client.initialize(), 5000);
});

// ─── MESSAGES ────────────────────────────────────────────────────────────────
client.on("message", async (message) => {
  try {
    const chat = await message.getChat();
    const sender = message.author || message.from;
    const senderNumber = sender.replace("@c.us", "").replace(/[^0-9]/g, "");
    const isOwner = senderNumber === config.OWNER_NUMBER.replace(/[^0-9]/g, "");

    let groupAdmins = [];
    let isAdmin = false;
    if (chat.isGroup) {
      groupAdmins = chat.participants
        .filter((p) => p.isAdmin || p.isSuperAdmin)
        .map((p) => p.id._serialized);
      isAdmin = groupAdmins.includes(sender);
    }

    const ctx = {
      client,
      message,
      chat,
      sender,
      senderNumber,
      isOwner,
      isAdmin,
      isGroup: chat.isGroup,
      groupAdmins,
    };

    // VV — interception vues uniques
    await defender.handleViewOnce(ctx);

    // Joinstick — sticker trigger
    const triggered = await defender.handleStickerTrigger(ctx, router.dispatch);
    if (triggered) return;

    // Défense automatique
    if (chat.isGroup) await defender.handleMessage(ctx);

    // Commandes
    await router.dispatch(ctx);

  } catch (err) {
    logger.warn(`Erreur message : ${err.message}`);
  }
});

// ─── ÉVÉNEMENTS DE GROUPE ────────────────────────────────────────────────────
client.on("group_join", (notif) => {
  defender.handleGroupJoin(client, notif).catch(() => {});
});

client.on("group_leave", (notif) => {
  defender.handleGroupLeave(client, notif).catch(() => {});
});

client.on("group_update", async (notif) => {
  await defender.handleMassRemoval(client, notif, config.OWNER_NUMBER).catch(() => {});
  await defender.handleAdminChange(client, notif, config.OWNER_NUMBER).catch(() => {});
});

// ─── DÉMARRAGE ───────────────────────────────────────────────────────────────
blacklist.init();
whitelist.init();
router.loadCommands();
keepalive.startServer(config.RENDER_URL);

logger.info("🚀 Démarrage de Spectral Hunter MD V1...");
client.initialize();
