const blacklist = require("../blacklist");
const logger = require("../logger");

module.exports = [
  {
    name: "blacklist",
    aliases: ["bl"],
    category: "blacklist",
    description: "Ajouter un numéro à la blacklist",
    usage: "!blacklist [numéro] [raison]",
    ownerOnly: true,
    handler: async ({ reply, args }) => {
      const number = args[0];
      const reason = args.slice(1).join(" ") || "Ajout manuel";
      if (!number) { await reply("❌ Usage : !blacklist [numéro] [raison]"); return; }
      const added = blacklist.add(number, reason, "admin");
      await reply(added ? `✅ *${number}* ajouté à la blacklist.\n📋 Raison : ${reason}` : `⚠️ *${number}* est déjà dans la blacklist.`);
    },
  },
  {
    name: "unblacklist",
    aliases: ["ubl"],
    category: "blacklist",
    description: "Retirer un numéro de la blacklist",
    usage: "!unblacklist [numéro]",
    ownerOnly: true,
    handler: async ({ reply, args }) => {
      const number = args[0];
      if (!number) { await reply("❌ Usage : !unblacklist [numéro]"); return; }
      await reply(blacklist.remove(number) ? `✅ *${number}* retiré de la blacklist.` : `⚠️ *${number}* n'est pas dans la blacklist.`);
    },
  },
  {
    name: "showblacklist",
    aliases: ["sbl"],
    category: "blacklist",
    description: "Afficher toute la blacklist",
    usage: "!showblacklist",
    ownerOnly: true,
    handler: async ({ reply }) => {
      await reply(`🚫 *BLACKLIST (${blacklist.getAll().length})*\n\n${blacklist.exportList()}`);
    },
  },
  {
    name: "clearblacklist",
    aliases: ["clrbl"],
    category: "blacklist",
    description: "Vider la blacklist",
    usage: "!clearblacklist",
    ownerOnly: true,
    handler: async ({ reply }) => {
      blacklist.clear();
      await reply("✅ Blacklist vidée avec succès.");
    },
  },
];
