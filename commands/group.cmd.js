const whitelist = require("../whitelist");
const store = require("../store");
const logger = require("../logger");
const config = require("../config");

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = [
  {
    name: "kick", aliases: ["k"], category: "group",
    description: "Expulser un membre", usage: "!kick @membre",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply, getMentions, senderNumber }) => {
      const mentions = getMentions();
      if (!mentions.length) { await reply("❌ Mentionnez un membre."); return; }
      const target = mentions[0];
      const targetNumber = target.replace("@s.whatsapp.net", "").replace(/[^0-9]/g, "");
      if (whitelist.isWhitelisted(targetNumber)) { await reply(`🛡️ *${targetNumber}* est en whitelist.`); return; }
      try {
        await sock.groupParticipantsUpdate(jid, [target], "remove");
        await reply(`✅ *${targetNumber}* expulsé.`);
      } catch (_) { await reply("❌ Impossible d'expulser. Vérifiez que le bot est admin."); }
    },
  },
  {
    name: "mute", aliases: ["silence", "m"], category: "group",
    description: "Mettre en sourdine", usage: "!mute @membre [minutes]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ reply, args, getMentions }) => {
      const mentions = getMentions();
      if (!mentions.length) { await reply("❌ Mentionnez un membre."); return; }
      const targetNumber = mentions[0].replace("@s.whatsapp.net", "").replace(/[^0-9]/g, "");
      const duration = parseInt(args.find((a) => /^\d+$/.test(a))) || 0;
      const muted = store.get("mutedUsers") || [];
      if (muted.includes(targetNumber)) { await reply(`⚠️ Déjà en sourdine.`); return; }
      muted.push(targetNumber);
      store.set("mutedUsers", muted);
      if (duration > 0) setTimeout(() => { store.set("mutedUsers", (store.get("mutedUsers") || []).filter(n => n !== targetNumber)); }, duration * 60000);
      await reply(`🔇 *${targetNumber}* en sourdine.${duration > 0 ? `\n⏱️ ${duration} minute(s)` : ""}`);
    },
  },
  {
    name: "unmute", aliases: ["um"], category: "group",
    description: "Lever la sourdine", usage: "!unmute @membre",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ reply, getMentions }) => {
      const mentions = getMentions();
      if (!mentions.length) { await reply("❌ Mentionnez un membre."); return; }
      const targetNumber = mentions[0].replace("@s.whatsapp.net", "").replace(/[^0-9]/g, "");
      store.set("mutedUsers", (store.get("mutedUsers") || []).filter(n => n !== targetNumber));
      await reply(`🔊 *${targetNumber}* peut de nouveau parler.`);
    },
  },
  {
    name: "promote", aliases: ["admin"], category: "group",
    description: "Promouvoir en admin", usage: "!promote @membre",
    ownerOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply, getMentions }) => {
      const mentions = getMentions();
      if (!mentions.length) { await reply("❌ Mentionnez un membre."); return; }
      try { await sock.groupParticipantsUpdate(jid, [mentions[0]], "promote"); await reply(`⬆️ Promu admin.`); }
      catch (_) { await reply("❌ Impossible de promouvoir."); }
    },
  },
  {
    name: "demote", aliases: ["deadmin"], category: "group",
    description: "Rétrograder un admin", usage: "!demote @membre",
    ownerOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply, getMentions }) => {
      const mentions = getMentions();
      if (!mentions.length) { await reply("❌ Mentionnez un admin."); return; }
      try { await sock.groupParticipantsUpdate(jid, [mentions[0]], "demote"); await reply(`⬇️ Rétrogradé.`); }
      catch (_) { await reply("❌ Impossible de rétrograder."); }
    },
  },
  {
    name: "add", aliases: ["ajouter"], category: "group",
    description: "Ajouter un membre", usage: "!add [numéro]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply, args }) => {
      const number = args[0];
      if (!number) { await reply("❌ Usage : !add [numéro]"); return; }
      try { await sock.groupParticipantsUpdate(jid, [number + "@s.whatsapp.net"], "add"); await reply(`✅ *${number}* ajouté.`); }
      catch (_) { await reply("❌ Impossible d'ajouter."); }
    },
  },
  {
    name: "invite", aliases: ["lien"], category: "group",
    description: "Lien d'invitation", usage: "!invite",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply }) => {
      try { const code = await sock.groupInviteCode(jid); await reply(`🔗 https://chat.whatsapp.com/${code}`); }
      catch (_) { await reply("❌ Impossible de générer le lien."); }
    },
  },
  {
    name: "members", aliases: ["membres"], category: "group",
    description: "Liste des membres", usage: "!members",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ reply, groupMeta }) => {
      if (!groupMeta) { await reply("❌ Impossible de récupérer les membres."); return; }
      const admins = groupMeta.participants.filter(p => p.admin);
      const members = groupMeta.participants.filter(p => !p.admin);
      let text = `👥 *Membres (${groupMeta.participants.length})*\n\n👑 *Admins (${admins.length}) :*\n`;
      admins.forEach(p => { text += `  • ${p.id.replace("@s.whatsapp.net", "")}\n`; });
      text += `\n👤 *Membres (${members.length}) :*\n`;
      members.slice(0, 25).forEach(p => { text += `  • ${p.id.replace("@s.whatsapp.net", "")}\n`; });
      if (members.length > 25) text += `  _...et ${members.length - 25} autres_`;
      await reply(text);
    },
  },
  {
    name: "kickall", aliases: ["expulserall"], category: "group",
    description: "Expulser tous les membres un par un", usage: "!kickall",
    ownerOnly: true, groupOnly: true,
    handler: async ({ sock, jid, reply, groupMeta }) => {
      if (!groupMeta) { await reply("❌ Impossible de récupérer les membres."); return; }
      const members = groupMeta.participants.filter(p => !p.admin && p.id.replace("@s.whatsapp.net","").replace(/[^0-9]/g,"") !== config.OWNER_NUMBER.replace(/[^0-9]/g,"") && !whitelist.isWhitelisted(p.id.replace("@s.whatsapp.net","").replace(/[^0-9]/g,"")));
      if (!members.length) { await reply("✅ Aucun membre à expulser."); return; }
      await reply(`⚙️ *Kickall lancé...*\n👥 ${members.length} membre(s)\n⏱️ ~${Math.ceil(members.length * 800 / 1000)}s`);
      let count = 0;
      for (const member of members) {
        try { await sock.groupParticipantsUpdate(jid, [member.id], "remove"); count++; await sleep(800); } catch (_) {}
      }
      await sock.sendMessage(config.OWNER_NUMBER + "@s.whatsapp.net", { text: `✅ *Kickall terminé*\n🚫 ${count}/${members.length} membres expulsés` });
    },
  },
  {
    name: "ghost", aliases: ["purge"], category: "group",
    description: "Expulser TOUS en moins de 3s", usage: "!ghost",
    ownerOnly: true, groupOnly: true,
    handler: async ({ sock, jid, msg, groupMeta }) => {
      if (!groupMeta) return;
      const members = groupMeta.participants.filter(p => !p.admin && p.id.replace("@s.whatsapp.net","").replace(/[^0-9]/g,"") !== config.OWNER_NUMBER.replace(/[^0-9]/g,"") && !whitelist.isWhitelisted(p.id.replace("@s.whatsapp.net","").replace(/[^0-9]/g,"")));
      if (!members.length) return;
      await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
      const start = Date.now();
      await Promise.all(members.map(m => sock.groupParticipantsUpdate(jid, [m.id], "remove").catch(() => {})));
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      await sock.sendMessage(config.OWNER_NUMBER + "@s.whatsapp.net", { text: `👻 *Ghost terminé*\n🚫 ${members.length} membres\n⚡ ${elapsed}s` });
    },
  },
  {
    name: "mutelist", aliases: ["sourdines"], category: "group",
    description: "Membres en sourdine", usage: "!mutelist",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ reply }) => {
      const muted = store.get("mutedUsers") || [];
      if (!muted.length) { await reply("✅ Aucun membre en sourdine."); return; }
      let text = `🔇 *En sourdine (${muted.length}) :*\n\n`;
      muted.forEach((n, i) => { text += `${i + 1}. ${n}\n`; });
      await reply(text);
    },
  },
];
    
