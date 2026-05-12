const fs = require("fs");
const path = require("path");
const config = require("../config");
const logger = require("../logger");
const { getBody } = require("../defender");

const commands = new Map();
const aliases = new Map();

function getMentions(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

function getQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    message: ctx.quotedMessage,
    sender: ctx.participant,
    type: Object.keys(ctx.quotedMessage)[0],
    stickerSha256: ctx.quotedMessage?.stickerMessage?.fileSha256,
  };
}

function loadCommands() {
  const cmdDir = __dirname;
  const files = fs.readdirSync(cmdDir).filter((f) => f.endsWith(".cmd.js"));
  for (const file of files) {
    const cmds = require(path.join(cmdDir, file));
    for (const cmd of cmds) {
      commands.set(cmd.name, cmd);
      if (cmd.aliases) {
        for (const alias of cmd.aliases) aliases.set(alias, cmd.name);
      }
      logger.info(`Commande chargée : ${config.PREFIX}${cmd.name}`);
    }
  }
  logger.info(`✅ ${commands.size} commande(s) chargée(s)`);
}

async function dispatch(ctx) {
  const { sock, msg, jid, isOwner, isAdmin, isGroup } = ctx;
  const body = getBody(msg);
  if (!body.startsWith(config.PREFIX)) return false;

  const args = body.slice(config.PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();
  const resolvedName = aliases.get(commandName) || commandName;
  const cmd = commands.get(resolvedName);
  if (!cmd) return false;

  const reply = async (text) => sock.sendMessage(jid, { text }, { quoted: msg });
  const send = async (text) => sock.sendMessage(jid, { text });
  const deleteMsg = async () => sock.sendMessage(jid, { delete: msg.key });

  if (cmd.ownerOnly && !isOwner) { await reply("🚫 Réservé au propriétaire."); return true; }
  if (cmd.adminOnly && !isAdmin && !isOwner) { await reply("🚫 Réservé aux admins."); return true; }
  if (cmd.groupOnly && !isGroup) { await reply("🚫 Groupes uniquement."); return true; }

  try {
    await cmd.handler({
      ...ctx, body, args, reply, send, deleteMsg,
      getMentions: () => getMentions(msg),
      getQuoted: () => getQuoted(msg),
      getAllCommands,
    });
  } catch (err) {
    logger.warn(`Erreur [${resolvedName}] : ${err.message}`);
    await reply(`❌ Erreur : ${err.message}`);
  }
  return true;
}

function getAllCommands() { return [...commands.values()]; }

module.exports = { loadCommands, dispatch, getAllCommands };
  
