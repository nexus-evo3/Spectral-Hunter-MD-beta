const config = require("../config");

module.exports = [
  {
    name: "help",
    aliases: ["h", "aide"],
    category: "general",
    description: "Afficher la liste des commandes",
    usage: "!help [commande]",
    ownerOnly: false,
    handler: async ({ reply, args, getAllCommands }) => {
      const allCmds = getAllCommands();

      if (args[0]) {
        const cmd = allCmds.find(
          (c) => c.name === args[0].toLowerCase() ||
          (c.aliases || []).includes(args[0].toLowerCase())
        );
        if (!cmd) { await reply(`❌ Commande *${args[0]}* inconnue.`); return; }
        let text = `🛡️ *${config.BOT_NAME}*\n\n📌 *${config.PREFIX}${cmd.name}*\n📝 ${cmd.description}\n💡 Usage : ${cmd.usage}`;
        if (cmd.aliases?.length) text += `\n🔁 Alias : ${cmd.aliases.map((a) => config.PREFIX + a).join(", ")}`;
        if (cmd.ownerOnly) text += `\n🔒 Réservé au propriétaire`;
        else if (cmd.adminOnly) text += `\n🔐 Réservé aux admins`;
        await reply(text);
        return;
      }

      const categories = {
        "🚫 Blacklist":      allCmds.filter((c) => c.category === "blacklist"),
        "👥 Groupe":         allCmds.filter((c) => c.category === "group"),
        "🛡️ Protection":    allCmds.filter((c) => c.category === "protection"),
        "👁️ Surveillance":  allCmds.filter((c) => c.category === "surveillance"),
        "🤖 Automatisation": allCmds.filter((c) => c.category === "automation"),
        "ℹ️ Général":       allCmds.filter((c) => !c.category || c.category === "general"),
      };

      let text = `🛡️ *${config.BOT_NAME} — Commandes*\n\n`;
      for (const [cat, cmds] of Object.entries(categories)) {
        if (!cmds.length) continue;
        text += `*${cat}*\n`;
        cmds.forEach((c) => { text += `  ${config.PREFIX}${c.name} — ${c.description}\n`; });
        text += "\n";
      }
      text += `💡 Tapez *!help [commande]* pour plus de détails.`;
      await reply(text);
    },
  },

  {
    name: "status",
    aliases: ["stat"],
    category: "general",
    description: "Voir le statut du bot",
    usage: "!status",
    ownerOnly: true,
    handler: async ({ reply }) => {
      const store = require("../store");
      const blacklist = require("../blacklist");
      const whitelist = require("../whitelist");
      const s = store.load();
      await reply(
        `🛡️ *SPECTRAL HUNTER MD V1 — Statut*\n\n` +
        `✅ Bot : En ligne\n` +
        `🚫 Blacklist : ${blacklist.getAll().length} numéro(s)\n` +
        `✅ Whitelist : ${whitelist.getAll().length} numéro(s)\n` +
        `🔇 Membres muets : ${(s.mutedUsers || []).length}\n` +
        `🔒 Forteresse : ${s.fortress ? "✅" : "❌"}\n` +
        `🔗 Anti-lien : ${s.antilink ? "✅" : "❌"}\n` +
        `🛡️ Anti-spam : ${s.antispam ? "✅" : "❌"}\n` +
        `👁️ Admin Watch : ${s.adminwatch ? "✅" : "❌"}\n` +
        `👋 Bienvenue : ${s.welcome?.enabled ? "✅" : "❌"}\n` +
        `👋 Au revoir : ${s.goodbye?.enabled ? "✅" : "❌"}\n` +
        `🚨 Attaques : ${(s.attackLog || []).length}\n\n` +
        `📅 ${new Date().toLocaleString("fr-FR")}`
      );
    },
  },
];
                                          
