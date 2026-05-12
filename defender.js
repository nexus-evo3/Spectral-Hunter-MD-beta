const blacklist = require("./blacklist");
const whitelist = require("./whitelist");
const store = require("./store");
const logger = require("./logger");
const antilink = require("./modules/antilink");
const antispam = require("./modules/antispam");
const config = require("./config");

const BUG_PATTERNS = [
  (body) => body.length > 5000,
  (body) => /[\u200B-\u200F\uFEFF]{5,}/.test(body),
  (body) => /(.)\1{200,}/.test(body),
  (body) => /(javascript:|<script|%00)/i.test(body),
];

const removalTracker = {};

function getBody(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ""
  );
}

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

async function alertOwner(sock, title, details) {
  try {
    await sock.sendMessage(config.OWNER_NUMBER + "@s.whatsapp.net", {
      text: `🚨 *SPECTRAL HUNTER — ${title}*\n\n${details}\n📅 ${new Date().toLocaleString("fr-FR")}`,
    });
  } catch (e) {
    logger.warn(`Alerte propriétaire échouée : ${e.message}`);
  }
}

async function handleMessage(ctx) {
  const { sock, msg, jid, sender, senderNumber, isAdmin, isOwner } = ctx;
  if (isOwner || isAdmin) return;
  if (whitelist.isWhitelisted(senderNumber)) return;

  const body = getBody(msg);

  if (blacklist.isBlacklisted(senderNumber)) {
    logger.ban(`Blacklisté : ${senderNumber}`);
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
    await sock.groupParticipantsUpdate(jid, [sender], "remove").catch(() => {});
    return;
  }

  if (store.get("fortress")) {
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
    return;
  }

  const mutedUsers = store.get("mutedUsers") || [];
  if (mutedUsers.includes(senderNumber)) {
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
    return;
  }

  if (body && BUG_PATTERNS.some((p) => p(body))) {
    logger.alert(`Message bug de ${senderNumber}`);
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
    blacklist.add(senderNumber, "Message bug", "auto");
    logAttack(senderNumber, "Message bug");
    await sock.groupParticipantsUpdate(jid, [sender], "remove").catch(() => {});
    await alertOwner(sock, "Message Bug", `⚠️ Message malveillant\n📵 ${senderNumber}\n🚫 Expulsé et blacklisté`);
    return;
  }

  if (store.get("antilink") && body && antilink.containsLink(body)) {
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
    await sock.sendMessage(jid, { text: `⚠️ @${senderNumber} Les liens ne sont pas autorisés.`, mentions: [sender] });
    return;
  }

  if (store.get("antispam") && antispam.isSpamming(senderNumber)) {
    logger.alert(`Spam de ${senderNumber}`);
    await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
    blacklist.add(senderNumber, "Spam", "auto");
    logAttack(senderNumber, "Spam");
    await sock.groupParticipantsUpdate(jid, [sender], "remove").catch(() => {});
    await alertOwner(sock, "Spam", `⚠️ Spammeur expulsé\n📵 ${senderNumber}`);
    return;
  }
}

async function handleViewOnce(ctx) {
  const { sock, msg, jid, senderNumber, isGroup, groupMeta, downloadMediaMessage } = ctx;
  const viewOnce = msg.message?.viewOnceMessage?.message || msg.message?.viewOnceMessageV2?.message;
  if (!viewOnce) return;
  try {
    const source = isGroup ? `Groupe : ${groupMeta?.subject || jid}` : "Privé";
    logger.info(`VV intercepté de ${senderNumber}`);
    const fakeMsg = { ...msg, message: viewOnce };
    const buffer = await downloadMediaMessage(fakeMsg, "buffer", {});
    if (!buffer) return;
    const mediaType = Object.keys(viewOnce)[0];
    let content = {};
    if (mediaType === "imageMessage") {
      content = { image: buffer, caption: `👁️ *VV*\n📱 ${senderNumber}\n📍 ${source}\n📅 ${new Date().toLocaleString("fr-FR")}` };
    } else if (mediaType === "videoMessage") {
      content = { video: buffer, caption: `👁️ *VV*\n📱 ${senderNumber}\n📍 ${source}\n📅 ${new Date().toLocaleString("fr-FR")}` };
    } else if (mediaType === "audioMessage") {
      content = { audio: buffer, mimetype: "audio/mp4" };
    } else {
      content = { document: buffer, fileName: "vv_media" };
    }
    await sock.sendMessage(config.OWNER_NUMBER + "@s.whatsapp.net", content);
  } catch (e) {
    logger.warn(`Erreur VV : ${e.message}`);
  }
}

async function handleStickerTrigger(ctx, dispatchFn) {
  const { sock, msg, jid } = ctx;
  if (!msg.message?.stickerMessage) return false;
  const sha256 = msg.message.stickerMessage.fileSha256;
  if (!sha256) return false;
  const stickerId = Buffer.from(sha256).toString("base64");
  const bindings = store.get("stickerBindings") || {};
  const command = bindings[stickerId];
  if (!command) return false;
  logger.info(`Sticker trigger : ${command}`);
  await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
  const fakeMsg = JSON.parse(JSON.stringify(msg));
  fakeMsg.message = { conversation: command };
  await dispatchFn({ ...ctx, msg: fakeMsg });
  return true;
}

async function handleGroupParticipants(sock, update, ownerNumber) {
  const { id: jid, participants, action } = update;

  if (action === "add") {
    const welcome = store.get("welcome");
    if (welcome?.enabled) {
      for (const participant of participants) {
        try {
          const number = participant.replace("@s.whatsapp.net", "");
          const msg = welcome.message.replace("{name}", number).replace("{group}", jid);
          await sock.sendMessage(jid, { text: msg });
        } catch (_) {}
      }
    }
  }

  if (action === "remove") {
    const goodbye = store.get("goodbye");
    if (goodbye?.enabled) {
      for (const participant of participants) {
        try {
          const number = participant.replace("@s.whatsapp.net", "");
          const msg = goodbye.message.replace("{name}", number).replace("{group}", jid);
          await sock.sendMessage(jid, { text: msg });
        } catch (_) {}
      }
    }

    const author = update.author?.replace("@s.whatsapp.net", "");
    if (author && author !== ownerNumber && trackRemoval(author)) {
      blacklist.add(author, "Purge en masse", "auto");
      logAttack(author, "Purge en masse");
      await alertOwner(sock, "Purge Détectée",
        `⚠️ Expulsions en masse !\n📵 ${author}\n🚫 Blacklisté`
      );
    }
  }

  if (["promote", "demote"].includes(action) && store.get("adminwatch")) {
    const action_fr = action === "promote" ? "⬆️ PROMU ADMIN" : "⬇️ RÉTROGRADÉ";
    const target = participants[0]?.replace("@s.whatsapp.net", "");
    await alertOwner(sock, "Changement Admin", `${action_fr}\n👤 ${target}`);
  }
}

module.exports = { handleMessage, handleViewOnce, handleStickerTrigger, handleGroupParticipants, getBody };
                              
