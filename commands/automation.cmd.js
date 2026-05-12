const store = require("../store");

module.exports = [
  {
    name: "welcome", aliases: ["bienvenue"], category: "automation",
    description: "Message de bienvenue", usage: "!welcome on/off [message]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ reply, args }) => {
      const mode = args[0]?.toLowerCase();
      if (!["on", "off"].includes(mode)) { await reply("❌ Usage : !welcome on [message] ou !welcome off\nVariables : {name}, {group}"); return; }
      const customMsg = args.slice(1).join(" ");
      const welcome = store.get("welcome") || {};
      welcome.enabled = mode === "on";
      if (customMsg) welcome.message = customMsg;
      store.set("welcome", welcome);
      await reply(mode === "on" ? `👋 *Bienvenue ACTIVÉ*\n\n📝 ${welcome.message}` : "👋 *Bienvenue DÉSACTIVÉ*");
    },
  },
  {
    name: "goodbye", aliases: ["aurevoir"], category: "automation",
    description: "Message d'au revoir", usage: "!goodbye on/off [message]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ reply, args }) => {
      const mode = args[0]?.toLowerCase();
      if (!["on", "off"].includes(mode)) { await reply("❌ Usage : !goodbye on [message] ou !goodbye off"); return; }
      const customMsg = args.slice(1).join(" ");
      const goodbye = store.get("goodbye") || {};
      goodbye.enabled = mode === "on";
      if (customMsg) goodbye.message = customMsg;
      store.set("goodbye", goodbye);
      await reply(mode === "on" ? `👋 *Au revoir ACTIVÉ*\n\n📝 ${goodbye.message}` : "👋 *Au revoir DÉSACTIVÉ*");
    },
  },
  {
    name: "announce", aliases: ["annonce", "ann"], category: "automation",
    description: "Envoyer une annonce", usage: "!announce [message]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ sock, jid, msg, args, deleteMsg }) => {
      const text = args.join(" ");
      if (!text) { await sock.sendMessage(jid, { text: "❌ Usage : !announce [message]" }); return; }
      await deleteMsg().catch(() => {});
      await sock.sendMessage(jid, { text: `📢 *ANNONCE*\n\n${text}\n\n— _Administration • ${new Date().toLocaleDateString("fr-FR")}_` });
    },
  },
  {
    name: "poll", aliases: ["sondage", "vote"], category: "automation",
    description: "Créer un sondage", usage: "!poll [question] | [option1] | [option2]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply, args }) => {
      const parts = args.join(" ").split("|").map(p => p.trim()).filter(Boolean);
      if (parts.length < 3) { await reply("❌ Usage : !poll Question | Option 1 | Option 2"); return; }
      const emojis = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      let text = `📊 *SONDAGE*\n\n❓ *${parts[0]}*\n\n`;
      parts.slice(1).forEach((opt, i) => { text += `${emojis[i] || `${i+1}.`} ${opt}\n`; });
      await sock.sendMessage(jid, { text });
    },
  },
  {
    name: "schedule", aliases: ["programmer"], category: "automation",
    description: "Programmer un message", usage: "!schedule [HH:MM] [message]",
    ownerOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply, args }) => {
      const time = args[0];
      const text = args.slice(1).join(" ");
      if (!time || !text || !/^\d{2}:\d{2}$/.test(time)) { await reply("❌ Usage : !schedule 20:30 Message"); return; }
      const [h, m] = time.split(":").map(Number);
      const target = new Date();
      target.setHours(h, m, 0, 0);
      if (target <= new Date()) target.setDate(target.getDate() + 1);
      setTimeout(async () => { await sock.sendMessage(jid, { text: `⏰ *Message programmé*\n\n${text}` }); }, target - Date.now());
      await reply(`⏰ *Programmé !*\n🕐 ${time}\n⏱️ Dans ~${Math.round((target - Date.now()) / 60000)} min\n📝 "${text}"`);
    },
  },
  {
    name: "tag", aliases: ["tagall"], category: "automation",
    description: "Mentionner tous les membres", usage: "!tag [message]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ sock, jid, args, groupMeta }) => {
      if (!groupMeta) return;
      const text = args.join(" ") || "📢 Message important !";
      const mentions = groupMeta.participants.map(p => p.id);
      const mentionText = `📣 *${text}*\n\n` + mentions.map(p => `@${p.split("@")[0]}`).join(" ");
      await sock.sendMessage(jid, { text: mentionText, mentions });
    },
  },
];
    
