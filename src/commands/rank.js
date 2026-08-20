// src/commands/rank.js
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const db = require("../utils/database");
const { generateProgressBar } = require("../utils/placeholder");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Melihat level dan progress XP kamu atau user lain")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Target user").setRequired(false),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("user") || interaction.user;
    const guildId = interaction.guild.id;

    const userData = (await db.get(`level_${guildId}_${target.id}`)) || {
      xp: 0,
      level: 1,
    };

    const xpNeeded = userData.level * 100;
    const progressBar = generateProgressBar(userData.xp, xpNeeded);

    const embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle(`📊 Level & Progress - ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ forceStatic: false }))
      .addFields(
        { name: "📈 Level", value: `**${userData.level}**`, inline: true },
        { name: "✨ XP", value: `${userData.xp} / ${xpNeeded}`, inline: true },
        { name: "🚀 Progress", value: progressBar, inline: false },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
