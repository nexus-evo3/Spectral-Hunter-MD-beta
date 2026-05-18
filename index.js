const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  Browsers,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const config = require("./config");
const logger = require("./logger");
const blacklist = require("./blacklist");
const whitelist = require("./whitelist");
const store = require("./store");
const defender = require("./defender");
const router = require("./commands/router");
const keepalive = require("./keepalive");

const AUTH_FOLDER = "auth_info";

let sock;

async function startBot() {
  // Vérifier si la session existe
  if (!fs.existsSync(AUTH_FOLDER) || fs.readdirSync(AUTH_FOLDER).length === 0) {
    logger.warn("⚠️ Aucune session trouvée !");
    logger.warn("Lancez d'abord : node connect.js [votre_numéro]");
    process.exit(1);
  }

  logger.info("✅ Session trouvée — démarrage du bot...");

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
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

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      logger.info("✅ Spectral Hunter MD V1 connecté !");
      keepalive.setConnected(true);
      try {
        await sock.sendMessage(config.OWNER_NUMBER + "@s.whatsapp.net", {
          text:
            `🛡️ *SPECTRAL HUNTER MD V1*\n\n` +
            `✅ Spectral Hunter connecté\n` +
            `⚙️ Préfixe : ${config.PREFIX}\n\n` +
            `Tapez *${config.PREFIX}help* pour voir les commandes.`,
        });
      } catch (_) {}
    }

    if (connection === "close") {
      keepalive.setConnected(false);
      const code = lastDisconnect?.error?.output?.statusCode;
      const loggedOut = code === DisconnectReason.loggedOut;
      logger.warn(`Déconnecté (code: ${code})`);
      if (loggedOut) {
        logger.warn("Session expirée. Relancez node connect.js");
        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        process.exit(1);
      } else {
        logger.info("Reconnexion dans 5s...");
        setTimeout(startBot, 5000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      try {
        if (!msg.message) continue;
        if (msg.key.fromMe) continue;
        const jid = msg.key.remoteJid;
        if (!jid) continue;
        const isGroup = jid.endsWith("@g.us");
        const sender = isGroup ? msg.key.participant : msg.key.remoteJid;
        const senderNumber = sender?.replace(/[^0-9]/g, "") || "";
        const ownerNumber = config.OWNER_NUMBER.replace(/[^0-9]/g, "");
        const isOwner = senderNumber === ownerNumber;

        let groupMeta = null;
        let isAdmin = false;
        if (isGroup) {
          try {
            groupMeta = await sock.groupMetadata(jid);
            const adminList = groupMeta.participants.filter((p) => p.admin).map((p) => p.id);
            isAdmin = adminList.includes(sender);
          } catch (_) {}
        }

        const ctx = { sock, msg, jid, sender, senderNumber, isOwner, isAdmin, isGroup, groupMeta, downloadMediaMessage };

        await defender.handleViewOnce(ctx);
        const triggered = await defender.handleStickerTrigger(ctx, router.dispatch);
        if (triggered) continue;
        if (isGroup) await defender.handleMessage(ctx);
        await router.dispatch(ctx);
      } catch (err) {
        logger.warn(`Erreur message : ${err.message}`);
      }
    }
  });

  sock.ev.on("group-participants.update", async (update) => {
    await defender.handleGroupParticipants(sock, update, config.OWNER_NUMBER).catch(() => {});
  });
}

blacklist.init();
whitelist.init();
router.loadCommands();
keepalive.startServer(config.RENDER_URL);
logger.info("🚀 Démarrage de Spectral Hunter MD V1...");
startBot();
    
