// src/utils/levelSystem.js
const db = require("./database");
const { sendFeatureEmbed } = require("./featureEmbed");
const { generateProgressBar } = require("./placeholder");

const xpCooldowns = new Set();

async function handleLeveling(message) {
  const { guild, author } = message;
  const key = `${guild.id}_${author.id}`;

  // Cooldown 60 detik per user agar XP tidak di-spam
  if (xpCooldowns.has(key)) return;

  const guildConfig = (await db.get(`config_${guild.id}`)) || {};
  let userData = (await db.get(`level_${guild.id}_${author.id}`)) || {
    xp: 0,
    level: 1,
  };

  // Penambahan XP acak antara 15 - 25
  const xpGained = Math.floor(Math.random() * 11) + 15;
  userData.xp += xpGained;

  // Formula target XP untuk naik level
  let xpNeeded = userData.level * 100;

  // Cek jika terjadi Kenaikan Level
  if (userData.xp >= xpNeeded) {
    userData.level += 1;
    userData.xp -= xpNeeded; // Simpan sisa XP
    await db.set(`level_${guild.id}_${author.id}`, userData);

    // Jalankan pengiriman pesan jika levelupChannel sudah di-set
    const levelChannelId = guildConfig.levelupChannel;
    if (levelChannelId) {
      const levelChannel = await guild.channels
        .fetch(levelChannelId)
        .catch(() => null);

      if (levelChannel) {
        const nextXpNeeded = userData.level * 100;
        const progressBar = generateProgressBar(userData.xp, nextXpNeeded);

        const placeholders = {
          guild: guild,
          user: author,
          level: userData.level,
          xp: userData.xp,
          xp_needed: nextXpNeeded,
          progressbar: progressBar,
        };

        // Mengirim template "levelup" dari sistem /embed
        await sendFeatureEmbed({
          guild: guild,
          channel: levelChannel,
          templateName: "levelup",
          data: placeholders,
        });
      }
    }
  } else {
    await db.set(`level_${guild.id}_${author.id}`, userData);
  }

  // Pasang cooldown 60 detik
  xpCooldowns.add(key);
  setTimeout(() => xpCooldowns.delete(key), 60000);
}

module.exports = { handleLeveling };
