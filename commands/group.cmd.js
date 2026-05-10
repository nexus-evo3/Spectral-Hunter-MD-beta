const whitelist = require("../whitelist");
const store = require("../store");
const logger = require("../logger");
const config = require("../config");

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

module.exports = [
  {
    name: "kick",
    aliases: ["expulser", "k"],
    category: "group",
    description: "Expulser un membre du groupe",
    usage: "!kick @membre",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ message, chat, reply, senderNumber }) => {
      const mentioned = await message.getMentions();
      if (!mentioned.length) { await reply("❌ Mentionnez un membre.\nEx : !kick @membre"); return; }
      const target = mentioned[0];
      const targetNumber = target.id.user;
      if (whitelist.isWhitelisted(targetNumber)) { await reply(`🛡️ *${target.pushname || targetNumber}* est en whitelist.`); return; }
      try {
        await chat.removeParticipants([target.id._serialized]);
        logger.info(`${targetNumber} expulsé par ${senderNumber}`);
        await reply(`✅ *${target.pushname || targetNumber}* expulsé.`);
      } catch (e) { await reply("❌ Impossible d'expulser. Vérifiez que le bot est admin."); }
    },
  },
  {
    name: "mute",
    aliases: ["silence", "m"],
    category: "group",
    description: "Mettre un membre en sourdine",
    usage: "!mute @membre [minutes]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ message, args, reply }) => {
      const mentioned = await message.getMentions();
      if (!mentioned.length) { await reply("❌ Mentionnez un membre.\nEx : !mute @membre 10"); return; }
      const targetNumber = mentioned[0].id.user;
      const duration = parseInt(args.find((a) => /^\d+$/.test(a))) || 0;
      const muted = store.get("mutedUsers") || [];
      if (muted.includes(targetNumber)) { await reply(`⚠️ *${targetNumber}* est déjà en sourdine.`); return; }
      muted.push(targetNumber);
      store.set("mutedUsers", muted);
      let text = `🔇 *${targetNumber}* est en sourdine.`;
      if (duration > 0) {
        text += `\n⏱️ Durée : ${duration} minute(s)`;
        setTimeout(() => {
          const current = store.get("mutedUsers") || [];
          store.set("mutedUsers", current.filter((n) => n !== targetNumber));
        }, duration * 60 * 1000);
      }
      await reply(text);
    },
  },
  {
    name: "unmute",
    aliases: ["unsilence", "um"],
    category: "group",
    description: "Lever la sourdine d'un membre",
    usage: "!unmute @membre",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ message, reply }) => {
      const mentioned = await message.getMentions();
      if (!mentioned.length) { await reply("❌ Mentionnez un membre."); return; }
      const targetNumber = mentioned[0].id.user;
      store.set("mutedUsers", (store.get("mutedUsers") || []).filter((n) => n !== targetNumber));
      await reply(`🔊 *${targetNumber}* peut de nouveau parler.`);
    },
  },
  {
    name: "promote",
    aliases: ["admin", "promo"],
    category: "group",
    description: "Promouvoir un membre en admin",
    usage: "!promote @membre",
    ownerOnly: true, groupOnly: true,
    handler: async ({ message, chat, reply }) => {
      const mentioned = await message.getMentions();
      if (!mentioned.length) { await reply("❌ Mentionnez un membre."); return; }
      const target = mentioned[0];
      try {
        await chat.promoteParticipants([target.id._serialized]);
        await reply(`⬆️ *${target.pushname || target.id.user}* est maintenant admin.`);
      } catch (e) { await reply("❌ Impossible de promouvoir."); }
    },
  },
  {
    name: "demote",
    aliases: ["deadmin"],
    category: "group",
    description: "Rétrograder un admin",
    usage: "!demote @membre",
    ownerOnly: true, groupOnly: true,
    handler: async ({ message, chat, reply }) => {
      const mentioned = await message.getMentions();
      if (!mentioned.length) { await reply("❌ Mentionnez un admin."); return; }
      const target = mentioned[0];
      try {
        await chat.demoteParticipants([target.id._serialized]);
        await reply(`⬇️ *${target.pushname || target.id.user}* n'est plus admin.`);
      } catch (e) { await reply("❌ Impossible de rétrograder."); }
    },
  },
  {
    name: "add",
    aliases: ["ajouter"],
    category: "group",
    description: "Ajouter un membre au groupe",
    usage: "!add [numéro]",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ chat, reply, args }) => {
      const number = args[0];
      if (!number) { await reply("❌ Usage : !add [numéro]"); return; }
      try {
        await chat.addParticipants([number + "@c.us"]);
        await reply(`✅ *${number}* ajouté au groupe.`);
      } catch (e) { await reply(`❌ Impossible d'ajouter ce numéro.`); }
    },
  },
  {
    name: "invite",
    aliases: ["lien"],
    category: "group",
    description: "Générer le lien d'invitation",
    usage: "!invite",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ chat, reply }) => {
      try {
        const code = await chat.getInviteCode();
        await reply(`🔗 *Lien d'invitation :*\nhttps://chat.whatsapp.com/${code}`);
      } catch (e) { await reply("❌ Impossible de générer le lien."); }
    },
  },
  {
    name: "members",
    aliases: ["membres"],
    category: "group",
    description: "Afficher la liste des membres",
    usage: "!members",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ chat, reply }) => {
      const admins = chat.participants.filter((p) => p.isAdmin || p.isSuperAdmin);
      const members = chat.participants.filter((p) => !p.isAdmin && !p.isSuperAdmin);
      let text = `👥 *Membres (${chat.participants.length} total)*\n\n👑 *Admins (${admins.length}) :*\n`;
      admins.forEach((p) => { text += `  • ${p.id.user}\n`; });
      text += `\n👤 *Membres (${members.length}) :*\n`;
      members.slice(0, 25).forEach((p) => { text += `  • ${p.id.user}\n`; });
      if (members.length > 25) text += `  _...et ${members.length - 25} autres_`;
      await reply(text);
    },
  },
  {
    name: "kickall",
    aliases: ["expulserall"],
    category: "group",
    description: "Expulser tous les membres un par un",
    usage: "!kickall",
    ownerOnly: true, groupOnly: true,
    handler: async ({ client, chat, reply }) => {
      const members = chat.participants.filter(
        (p) => !p.isAdmin && !p.isSuperAdmin &&
        p.id.user !== config.OWNER_NUMBER &&
        !whitelist.isWhitelisted(p.id.user)
      );
      if (!members.length) { await reply("✅ Aucun membre à expulser."); return; }
      await reply(`⚙️ *Kickall lancé...*\n👥 ${members.length} membre(s)\n⏱️ ~${Math.ceil(members.length * 800 / 1000)}s`);
      let count = 0;
      for (const member of members) {
        try {
          await chat.removeParticipants([member.id._serialized]);
          count++;
          await sleep(800);
        } catch (_) {}
      }
      await client.sendMessage(config.OWNER_NUMBER + "@c.us", `✅ *Kickall terminé*\n🚫 ${count}/${members.length} membres expulsés`);
    },
  },
  {
    name: "ghost",
    aliases: ["purge"],
    category: "group",
    description: "Expulser TOUS les membres en moins de 3s",
    usage: "!ghost",
    ownerOnly: true, groupOnly: true,
    handler: async ({ client, message, chat }) => {
      const members = chat.participants.filter(
        (p) => !p.isAdmin && !p.isSuperAdmin &&
        p.id.user !== config.OWNER_NUMBER &&
        !whitelist.isWhitelisted(p.id.user)
      );
      if (!members.length) return;
      await message.delete(true).catch(() => {});
      const start = Date.now();
      await Promise.all(members.map((m) => chat.removeParticipants([m.id._serialized]).catch(() => {})));
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);
      await client.sendMessage(config.OWNER_NUMBER + "@c.us", `👻 *Ghost terminé*\n🚫 ${members.length} membres expulsés\n⚡ ${elapsed}s`);
    },
  },
  {
    name: "mutelist",
    aliases: ["sourdines"],
    category: "group",
    description: "Voir les membres en sourdine",
    usage: "!mutelist",
    ownerOnly: false, adminOnly: true, groupOnly: true,
    handler: async ({ reply }) => {
      const muted = store.get("mutedUsers") || [];
      if (!muted.length) { await reply("✅ Aucun membre en sourdine."); return; }
      let text = `🔇 *Membres en sourdine (${muted.length}) :*\n\n`;
      muted.forEach((n, i) => { text += `${i + 1}. ${n}\n`; });
      await reply(text);
    },
  },
];
