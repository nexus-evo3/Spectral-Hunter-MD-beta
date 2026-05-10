const blacklist = require("./blacklist");
const whitelist = require("./whitelist");
const store = require("./store");
const logger = require("./logger");
const antilink = require("./modules/antilink");
const antispam = require("./modules/antispam");
const config = require("./config");

const BUG_PATTERNS = [
  (msg) => msg.body && msg.body.length > 5000,
  (msg) => msg.body && /[\u200B-\u200F\uFEFF]{5,}/.test(msg.body),
  (msg) => msg.body && /(.)\1{200,}/.test(msg.body),
  (msg) => msg.body && /(javascript:|<script|%00)/i.test(msg.body),
];

const removalTracker = {};

function trackRemoval(number) {
  const now = Date.now();
  if (!removalTracker[number]) {
    removalTracker[number] = { count: 1, first: now };
  } else if (now - removalTracker[number].first < config.PURGE_WINDOW_MS) {
    removalTracker[number].count++;
  } else {
    removalTracker[number] = { count: 1, first: now };
  }
  return removalTracker[number].count >= config.PURGE_THRESHOLD;
}

function logAttack(number, type) {
  store.push("attackLog", { number, type, date: new Date().toISOString() });
}

async function alertOwner(client, title, details) {
  try {
    await client.sendMessage(
      config.OWNER_NUMBER + "@c.us",
      `🚨 *SPECTRAL HUNTER — ${title}*\n\n${details}\n📅 ${new Date().toLocaleString("fr-FR")}`
    );
  } catch (e) {
    logger.warn(`Alerte propriétaire échouée : ${e.message}`);
  }
}

// ─── Gestionnaire principal ───────────────────────────────────────────────────
async function handleMessage(ctx) {
  const { client, message, chat, sender, senderNumber, isAdmin, isOwner } = ctx;

  if (isOwner || isAdmin) return;
  if (whitelist.isWhitelisted(senderNumber)) return;

  // 1. Blacklist
  if (blacklist.isBlacklisted(senderNumber)) {
    logger.ban(`Blacklisté : ${senderNumber}`);
    await message.delete(true).catch(() => {});
    await chat.removeParticipants([sender]).catch(() => {});
    return;
  }

  // 2. Mode Forteresse
  if (store.get("fortress")) {
    await message.delete(true).catch(() => {});
    return;
  }

  // 3. Membres muets
  const mutedUsers = store.get("mutedUsers") || [];
  if (mutedUsers.includes(senderNumber)) {
    await message.delete(true).catch(() => {});
    return;
  }

  // 4. Message bug
  if (BUG_PATTERNS.some((p) => p(message))) {
    logger.alert(`Message bug de ${senderNumber}`);
    await message.delete(true).catch(() => {});
    blacklist.add(senderNumber, "Message bug", "auto");
    logAttack(senderNumber, "Message bug");
    await chat.removeParticipants([sender]).catch(() => {});
    await alertOwner(client, "Message Bug",
      `⚠️ Message malveillant supprimé\n📵 ${senderNumber}\n🚫 Expulsé et blacklisté`
    );
    return;
  }

  // 5. Anti-lien
  if (store.get("antilink") && message.body && antilink.containsLink(message.body)) {
    await message.delete(true).catch(() => {});
    await chat.sendMessage(`⚠️ @${senderNumber} Les liens ne sont pas autorisés.`);
    return;
  }

  // 6. Anti-spam
  if (store.get("antispam") && antispam.isSpamming(senderNumber)) {
    logger.alert(`Spam de ${senderNumber}`);
    await message.delete(true).catch(() => {});
    blacklist.add(senderNumber, "Spam", "auto");
    logAttack(senderNumber, "Spam");
    await chat.removeParticipants([sender]).catch(() => {});
    await alertOwner(client, "Spam Détecté",
      `⚠️ Spammeur expulsé\n📵 ${senderNumber}\n🚫 Blacklisté`
    );
    return;
  }
}

// ─── VV ──────────────────────────────────────────────────────────────────────
async function handleViewOnce(ctx) {
  const { client, message, chat, senderNumber } = ctx;

  if (!message.isViewOnce) return;

  try {
    const source = chat.isGroup ? `Groupe : ${chat.name}` : "Privé";
    logger.info(`VV intercepté de ${senderNumber}`);

    const media = await message.downloadMedia();
    if (!media) return;

    await client.sendMessage(
      config.OWNER_NUMBER + "@c.us",
      media,
      {
        caption:
          `👁️ *VV Intercepté*\n` +
          `📱 De : ${senderNumber}\n` +
          `📍 ${source}\n` +
          `📅 ${new Date().toLocaleString("fr-FR")}`,
      }
    );
  } catch (e) {
    logger.warn(`Erreur VV : ${e.message}`);
  }
}

// ─── Joinstick ───────────────────────────────────────────────────────────────
async function handleStickerTrigger(ctx, dispatchFn) {
  const { message } = ctx;
  if (message.type !== "sticker") return false;

  const sha256 = message._data?.fileSha256;
  if (!sha256) return false;

  const stickerId = Buffer.from(sha256).toString("base64");
  const bindings = store.get("stickerBindings") || {};
  const command = bindings[stickerId];
  if (!command) return false;

  logger.info(`Sticker trigger : ${command}`);
  await message.delete(true).catch(() => {});

  const fakeMessage = Object.create(message);
  fakeMessage.body = command;

  await dispatchFn({ ...ctx, message: fakeMessage });
  return true;
}

// ─── Bienvenue / Au revoir ───────────────────────────────────────────────────
async function handleGroupJoin(client, notification) {
  const welcome = store.get("welcome");
  if (!welcome?.enabled) return;
  try {
    const chat = await notification.getChat();
    const contact = await notification.getContact();
    const name = contact.pushname || notification.id.participant.replace("@c.us", "");
    const msg = welcome.message.replace("{name}", name).replace("{group}", chat.name);
    await chat.sendMessage(msg);
  } catch (e) {
    logger.warn(`Erreur bienvenue : ${e.message}`);
  }
}

async function handleGroupLeave(client, notification) {
  const goodbye = store.get("goodbye");
  if (!goodbye?.enabled) return;
  try {
    const chat = await notification.getChat();
    const contact = await notification.getContact();
    const name = contact.pushname || notification.id.participant.replace("@c.us", "");
    const msg = goodbye.message.replace("{name}", name).replace("{group}", chat.name);
    await chat.sendMessage(msg);
  } catch (e) {
    logger.warn(`Erreur au revoir : ${e.message}`);
  }
}

// ─── Purge / Admin Watch ─────────────────────────────────────────────────────
async function handleMassRemoval(client, notification, ownerNumber) {
  if (notification.type !== "remove") return;
  const authorNumber = notification.author?.replace("@c.us", "");
  if (!authorNumber || authorNumber === ownerNumber) return;

  if (trackRemoval(authorNumber)) {
    logger.alert(`Purge en masse par ${authorNumber}`);
    blacklist.add(authorNumber, "Purge en masse", "auto");
    logAttack(authorNumber, "Purge en masse");
    await alertOwner(client, "Purge Détectée !",
      `⚠️ Expulsions en masse !\n📵 ${authorNumber}\n🚫 Blacklisté`
    );
  }
}

async function handleAdminChange(client, notification, ownerNumber) {
  if (!store.get("adminwatch")) return;
  if (!["promote", "demote"].includes(notification.type)) return;
  const action = notification.type === "promote" ? "⬆️ PROMU ADMIN" : "⬇️ RÉTROGRADÉ";
  const target = notification.id.participant?.replace("@c.us", "");
  const by = notification.author?.replace("@c.us", "");
  await alertOwner(client, "Changement Admin",
    `${action}\n👤 Membre : ${target}\n👑 Par : ${by || "Inconnu"}`
  );
}

module.exports = {
  handleMessage,
  handleViewOnce,
  handleStickerTrigger,
  handleGroupJoin,
  handleGroupLeave,
  handleMassRemoval,
  handleAdminChange,
};
