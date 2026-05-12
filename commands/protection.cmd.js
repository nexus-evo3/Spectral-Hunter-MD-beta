const store = require("../store");
const whitelist = require("../whitelist");

module.exports = [
  {
    name: "fortress",
    aliases: ["forteresse"],
    category: "protection",
    description: "Activer/désactiver le mode forteresse",
    usage: "!fortress on/off",
    ownerOnly: true,
    groupOnly: true,
    handler: async ({ reply, args }) => {
      const mode = args[0]?.toLowerCase();
      if (!["on", "off"].includes(mode)) { await reply("❌ Usage : !fortress on/off"); return; }
      store.set("fortress", mode === "on");
      await reply(mode === "on" ? "🔒 *Mode Forteresse ACTIVÉ*\n\nSeuls les admins peuvent écrire." : "🔓 *Mode Forteresse DÉSACTIVÉ*");
    },
  },
  {
    name: "antilink",
    aliases: ["al"],
    category: "protection",
    description: "Activer/désactiver l'anti-lien",
    usage: "!antilink on/off",
    ownerOnly: false,
    adminOnly: true,
    groupOnly: true,
    handler: async ({ reply, args }) => {
      const mode = args[0]?.toLowerCase();
      if (!["on", "off"].includes(mode)) { await reply("❌ Usage : !antilink on/off"); return; }
      store.set("antilink", mode === "on");
      await reply(mode === "on" ? "🔗 *Anti-lien ACTIVÉ*" : "🔗 *Anti-lien DÉSACTIVÉ*");
    },
  },
  {
    name: "antispam",
    aliases: ["as"],
    category: "protection",
    description: "Activer/désactiver l'anti-spam",
    usage: "!antispam on/off",
    ownerOnly: false,
    adminOnly: true,
    groupOnly: true,
    handler: async ({ reply, args }) => {
      const mode = args[0]?.toLowerCase();
      if (!["on", "off"].includes(mode)) { await reply("❌ Usage : !antispam on/off"); return; }
      store.set("antispam", mode === "on");
      await reply(mode === "on" ? "🛡️ *Anti-spam ACTIVÉ*" : "🛡️ *Anti-spam DÉSACTIVÉ*");
    },
  },
  {
    name: "whitelist",
    aliases: ["wl"],
    category: "protection",
    description: "Ajouter à la whitelist",
    usage: "!whitelist [numéro]",
    ownerOnly: true,
    handler: async ({ reply, args }) => {
      const number = args[0];
      if (!number) { await reply("❌ Usage : !whitelist [numéro]"); return; }
      await reply(whitelist.add(number, "admin") ? `✅ *${number}* ajouté à la whitelist.` : `⚠️ *${number}* est déjà dans la whitelist.`);
    },
  },
  {
    name: "unwhitelist",
    aliases: ["uwl"],
    category: "protection",
    description: "Retirer de la whitelist",
    usage: "!unwhitelist [numéro]",
    ownerOnly: true,
    handler: async ({ reply, args }) => {
      const number = args[0];
      if (!number) { await reply("❌ Usage : !unwhitelist [numéro]"); return; }
      await reply(whitelist.remove(number) ? `✅ *${number}* retiré.` : `⚠️ *${number}* n'est pas dans la whitelist.`);
    },
  },
  {
    name: "showwhitelist",
    aliases: ["swl"],
    category: "protection",
    description: "Afficher la whitelist",
    vusage: "!showwhitelist",
    ownerOnly: true,
    handler: async ({ reply }) => {
      await reply(`✅ *WHITELIST (${whitelist.getAll().length})*\n\n${whitelist.exportList()}`);
    },
  },
];
    
