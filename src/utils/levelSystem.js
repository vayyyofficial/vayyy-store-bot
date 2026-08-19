// src/utils/levelSystem.js
const db = require("./database");
const { getEmbedTemplate } = require("./featureEmbed");

// Cooldown EXP per user (60 detik)
const expCooldowns = new Set();

/**
 * Memproses pemberian EXP saat user mengirim pesan
 * @param {import('discord.js').Message} message
 */
async function handleLeveling(message) {
  if (message.author.bot || !message.guild) return;

  const userId = message.author.id;
  const guildId = message.guild.id;
  const cooldownKey = `${guildId}-${userId}`;

  if (expCooldowns.has(cooldownKey)) return;

  // 1. Tambahkan Cooldown
  expCooldowns.add(cooldownKey);
  setTimeout(() => expCooldowns.delete(cooldownKey), 60000);

  // 2. Ambil data XP & Level saat ini
  const dbKey = `levels_${guildId}_${userId}`;
  let userData = db.get(dbKey) || { xp: 0, level: 0 };

  // Acak EXP yang didapat (15 - 25 XP per pesan)
  const gainedXp = Math.floor(Math.random() * 11) + 15;
  userData.xp += gainedXp;

  // Formula Level-Up (100 * level^1.5)
  let neededXp = Math.floor(100 * Math.pow(userData.level + 1, 1.5));

  // 3. Cek apakah Level Up
  if (userData.xp >= neededXp) {
    userData.level += 1;
    db.set(dbKey, userData);

    // Ambil Channel Level-Up dari Config
    const levelChannelId = db.get(`config_${guildId}.levelChannel`);
    const targetChannel = levelChannelId
      ? message.guild.channels.cache.get(levelChannelId)
      : message.channel;

    if (targetChannel) {
      const placeholders = {
        "{user}": message.author.toString(),
        "{user.name}": message.author.username,
        "{user.avatar}": message.author.displayAvatarURL({ dynamic: true }),
        "{user.level}": userData.level.toString(),
        "{user.xp}": userData.xp.toString(),
        "{server.name}": message.guild.name,
      };

      const embedPayload = await getEmbedTemplate(
        guildId,
        "level_up",
        placeholders,
      );
      if (embedPayload) {
        await targetChannel.send(embedPayload);
      }
    }
  } else {
    db.set(dbKey, userData);
  }
}

module.exports = { handleLeveling };
