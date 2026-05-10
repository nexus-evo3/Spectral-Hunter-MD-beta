const store = require("../store");

module.exports = [
  {
    name: "backup",
    aliases: ["sauvegarde", "bkp"],
    category: "surveillance",
    description: "Sauvegarder la liste des membres",
    usage: "!backup",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ chat, reply }) => {
      const members = chat.participants.map((p) => ({ number: p.id.user, isAdmin: p.isAdmin || p.isSuperAdmin, savedAt: new Date().toISOString() }));
      const backup = store.get("membersBackup") || {};
      backup[chat.id._serialized] = { groupName: chat.name, count: members.length, savedAt: new Date().toISOString(), members };
      store.set("membersBackup", backup);
      await reply(`✅ *Sauvegarde effectuée !*\n\n👥 ${members.length} membres\n📅 ${new Date().toLocaleString("fr-FR")}`);
    },
  },
  {
    name: "restorelist",
    aliases: ["restaurer", "compare"],
    category: "surveillance",
    description: "Comparer membres actuels avec la sauvegarde",
    usage: "!restorelist",
    ownerOnly: true, groupOnly: true,
    handler: async ({ chat, reply }) => {
      const backup = store.get("membersBackup") || {};
      const saved = backup[chat.id._serialized];
      if (!saved) { await reply("❌ Aucune sauvegarde. Faites !backup d'abord."); return; }
      const current = chat.participants.map((p) => p.id.user);
      const savedNums = saved.members.map((m) => m.number);
      const removed = savedNums.filter((n) => !current.includes(n));
      const added = current.filter((n) => !savedNums.includes(n));
      let text = `📋 *Comparaison — ${new Date(saved.savedAt).toLocaleDateString("fr-FR")}*\n\n`;
      text += `👥 Sauvegarde : ${savedNums.length} | Actuel : ${current.length}\n\n`;
      if (removed.length) { text += `❌ *Manquants (${removed.length}) :*\n`; removed.forEach((n) => { text += `  • ${n}\n`; }); text += "\n"; }
      if (added.length) { text += `✅ *Nouveaux (${added.length}) :*\n`; added.forEach((n) => { text += `  • ${n}\n`; }); }
      if (!removed.length && !added.length) text += "✅ Aucun changement.";
      await reply(text);
    },
  },
  {
    name: "attacklog",
    aliases: ["logs"],
    category: "surveillance",
    description: "Afficher l'historique des attaques",
    usage: "!attacklog [nombre]",
    ownerOnly: true,
    handler: async ({ reply, args }) => {
      const count = parseInt(args[0]) || 10;
      const logs = store.get("attackLog") || [];
      if (!logs.length) { await reply("✅ Aucune attaque détectée."); return; }
      const recent = logs.slice(-count).reverse();
      let text = `🚨 *${recent.length} dernière(s) attaque(s) :*\n\n`;
      recent.forEach((l, i) => { text += `${i + 1}. 📵 ${l.number}\n   Type : ${l.type}\n   Date : ${new Date(l.date).toLocaleString("fr-FR")}\n\n`; });
      text += `📊 Total : ${logs.length} attaque(s)`;
      await reply(text);
    },
  },
  {
    name: "clearattacklog",
    aliases: ["clrlogs"],
    category: "surveillance",
    description: "Effacer l'historique des attaques",
    usage: "!clearattacklog",
    ownerOnly: true,
    handler: async ({ reply }) => {
      store.set("attackLog", []);
      await reply("✅ Historique effacé.");
    },
  },
  {
    name: "adminwatch",
    aliases: ["aw"],
    category: "surveillance",
    description: "Activer/désactiver la surveillance des admins",
    usage: "!adminwatch on/off",
    ownerOnly: true,
    handler: async ({ reply, args }) => {
      const mode = args[0]?.toLowerCase();
      if (!["on", "off"].includes(mode)) { await reply("❌ Usage : !adminwatch on/off"); return; }
      store.set("adminwatch", mode === "on");
      await reply(mode === "on" ? "👁️ *Admin Watch ACTIVÉ*" : "👁️ *Admin Watch DÉSACTIVÉ*");
    },
  },
];
