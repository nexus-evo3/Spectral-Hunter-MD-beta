const fs = require("fs");
const path = require("path");
const config = require("../config");
const logger = require("../logger");

const commands = new Map();
const aliases = new Map();

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
  const { message, chat, isOwner, isAdmin } = ctx;
  const body = message.body?.trim();
  if (!body || !body.startsWith(config.PREFIX)) return false;

  const args = body.slice(config.PREFIX.length).trim().split(/\s+/);
  const commandName = args.shift().toLowerCase();

  const resolvedName = aliases.get(commandName) || commandName;
  const cmd = commands.get(resolvedName);
  if (!cmd) return false;

  if (cmd.ownerOnly && !isOwner) {
    await message.reply("🚫 Cette commande est réservée au propriétaire du bot.");
    return true;
  }
  if (cmd.adminOnly && !isAdmin && !isOwner) {
    await message.reply("🚫 Cette commande est réservée aux admins du groupe.");
    return true;
  }
  if (cmd.groupOnly && !chat.isGroup) {
    await message.reply("🚫 Cette commande ne fonctionne que dans les groupes.");
    return true;
  }

  try {
    await cmd.handler({ ...ctx, args, reply: (text) => message.reply(text), getAllCommands });
  } catch (err) {
    logger.warn(`Erreur commande [${resolvedName}] : ${err.message}`);
    await message.reply(`❌ Erreur : ${err.message}`);
  }

  return true;
}

function getAllCommands() {
  return [...commands.values()];
}

module.exports = { loadCommands, dispatch, getAllCommands };
