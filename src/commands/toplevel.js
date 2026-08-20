// src/commands/toplevel.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("toplevel")
    .setDescription(
      "Menampilkan peringkat member dengan level tertinggi (Top 10)",
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Filter data khusus peringkat level di guild ini
    const allData = (await db.all()) || [];
    const prefix = `level_${guildId}_`;

    const topLevelData = allData
      .filter((entry) => entry.id.startsWith(prefix))
      .map((entry) => ({
        userId: entry.id.replace(prefix, ""),
        level: entry.value.level || 1,
        xp: entry.value.xp || 0,
      }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)
      .slice(0, 10);

    if (topLevelData.length === 0) {
      return interaction.reply({
        content: "❌ Belum ada data peringkat level di server ini.",
        flags: 64,
      });
    }

    let description = "";
    for (let i = 0; i < topLevelData.length; i++) {
      const item = topLevelData[i];
      const medal =
        i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `**#${i + 1}**`;
      description += `${medal} <@${item.userId}> • **Level ${item.level}** (${item.xp} XP)\n`;
    }

    const embed = new EmbedBuilder()
      .setColor("#FFD700")
      .setTitle(`🏆 Leaderboard Level - ${interaction.guild.name}`)
      .setDescription(description)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
