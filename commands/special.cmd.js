const store = require("../store");
const logger = require("../logger");

module.exports = [
  {
    name: "joinstick", aliases: ["bs"], category: "general",
    description: "Lier un sticker à une commande", usage: "!joinstick [commande]",
    ownerOnly: true,
    handler: async ({ reply, args, getQuoted }) => {
      const quoted = getQuoted();
      if (!quoted || quoted.type !== "stickerMessage") { await reply("❌ Citez un sticker.\nEx : (citez sticker) !joinstick !fortress on"); return; }
      const command = args.join(" ").trim();
      if (!command) { await reply("❌ Indiquez la commande à lier."); return; }
      const stickerId = quoted.stickerSha256 ? Buffer.from(quoted.stickerSha256).toString("base64") : quoted.sender;
      const bindings = store.get("stickerBindings") || {};
      if (Object.values(bindings).includes(command)) { await reply(`⚠️ *${command}* est déjà liée à un sticker.`); return; }
      bindings[stickerId] = command;
      store.set("stickerBindings", bindings);
      await reply(`✅ *Sticker lié !*\n\n⚡ Commande : ${command}\n🎭 Silencieux à chaque envoi.`);
    },
  },
  {
    name: "unstick", aliases: ["ubs"], category: "general",
    description: "Délier un sticker", usage: "!unstick",
    ownerOnly: true,
    handler: async ({ reply, getQuoted }) => {
      const quoted = getQuoted();
      if (!quoted || quoted.type !== "stickerMessage") { await reply("❌ Citez le sticker à délier."); return; }
      const stickerId = quoted.stickerSha256 ? Buffer.from(quoted.stickerSha256).toString("base64") : quoted.sender;
      const bindings = store.get("stickerBindings") || {};
      if (!bindings[stickerId]) { await reply("⚠️ Ce sticker n'est lié à aucune commande."); return; }
      const cmd = bindings[stickerId];
      delete bindings[stickerId];
      store.set("stickerBindings", bindings);
      await reply(`✅ Sticker délié.\n_Commande supprimée : ${cmd}_`);
    },
  },
  {
    name: "sticklist", aliases: ["stickbindings"], category: "general",
    description: "Voir tous les stickers liés", usage: "!sticklist",
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
                                                     
