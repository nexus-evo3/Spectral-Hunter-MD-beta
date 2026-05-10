const store = require("../store");
const logger = require("../logger");

module.exports = [
  {
    name: "joinstick",
    aliases: ["bs", "bindstick"],
    category: "general",
    description: "Lier un sticker à une commande (citez le sticker)",
    usage: "!joinstick [commande complète]",
    ownerOnly: true,
    handler: async ({ message, args, reply }) => {
      if (!message.hasQuotedMsg) { await reply("❌ Citez un sticker.\nEx : (citez sticker) !joinstick !fortress on"); return; }
      const quoted = await message.getQuotedMessage();
      if (quoted.type !== "sticker") { await reply("❌ Le message cité doit être un sticker."); return; }
      const command = args.join(" ").trim();
      if (!command) { await reply("❌ Indiquez la commande à lier.\nEx : !joinstick !fortress on"); return; }
      const sha256 = quoted._data?.fileSha256;
      const stickerId = sha256 ? Buffer.from(sha256).toString("base64") : quoted.id.id;
      const bindings = store.get("stickerBindings") || {};
      if (Object.values(bindings).includes(command)) { await reply(`⚠️ La commande *${command}* est déjà liée à un sticker.`); return; }
      bindings[stickerId] = command;
      store.set("stickerBindings", bindings);
      logger.info(`Sticker lié à : ${command}`);
      await reply(`✅ *Sticker lié !*\n\n⚡ Commande : ${command}\n🎭 L'envoi de ce sticker déclenchera la commande silencieusement.`);
    },
  },
  {
    name: "unstick",
    aliases: ["ubs"],
    category: "general",
    description: "Délier un sticker de sa commande (citez le sticker)",
    usage: "!unstick",
    ownerOnly: true,
    handler: async ({ message, reply }) => {
      if (!message.hasQuotedMsg) { await reply("❌ Citez le sticker à délier."); return; }
      const quoted = await message.getQuotedMessage();
      if (quoted.type !== "sticker") { await reply("❌ Le message cité doit être un sticker."); return; }
      const sha256 = quoted._data?.fileSha256;
      const stickerId = sha256 ? Buffer.from(sha256).toString("base64") : quoted.id.id;
      const bindings = store.get("stickerBindings") || {};
      if (!bindings[stickerId]) { await reply("⚠️ Ce sticker n'est lié à aucune commande."); return; }
      const cmd = bindings[stickerId];
      delete bindings[stickerId];
      store.set("stickerBindings", bindings);
      await reply(`✅ Sticker délié.\n_Commande supprimée : ${cmd}_`);
    },
  },
  {
    name: "sticklist",
    aliases: ["stickbindings"],
    category: "general",
    description: "Voir tous les stickers liés",
    usage: "!sticklist",
    ownerOnly: true,
    handler: async ({ reply }) => {
      const bindings = store.get("stickerBindings") || {};
      const entries = Object.entries(bindings);
      if (!entries.length) { await reply("✅ Aucun sticker lié."); return; }
      let text = `🎭 *Stickers liés (${entries.length}) :*\n\n`;
      entries.forEach(([id, cmd], i) => { text += `${i + 1}. 🔗 ${cmd}\n   ID : ${id.slice(0, 12)}...\n\n`; });
      await reply(text);
    },
  },
];
