// src/commands/config-bot.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config-bot")
    .setDescription("Mengatur channel dan role khusus untuk fitur bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("welcome_channel")
        .setDescription("Channel untuk Log Welcome"),
    )
    .addChannelOption((opt) =>
      opt
        .setName("goodbye_channel")
        .setDescription("Channel untuk Log Goodbye"),
    )
    .addChannelOption((opt) =>
      opt
        .setName("level_channel")
        .setDescription("Channel Notifikasi Level Up"),
    )
    .addChannelOption((opt) =>
      opt.setName("ai_channel").setDescription("Channel khusus AI Chatbot"),
    )
    .addChannelOption((opt) =>
      opt
        .setName("honeypot_channel")
        .setDescription("Channel Perangkap Honeypot (Auto-Kick)"),
    )
    .addChannelOption((opt) =>
      opt
        .setName("transcript_channel")
        .setDescription("Channel Log Transcript Tiket"),
    )
    .addRoleOption((opt) =>
      opt.setName("buyer_role").setDescription("Role Buyer untuk Unlimited AI"),
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const currentConfig = db.get(`config_${guildId}`) || {};

    const welcome = interaction.options.getChannel("welcome_channel");
    const goodbye = interaction.options.getChannel("goodbye_channel");
    const level = interaction.options.getChannel("level_channel");
    const ai = interaction.options.getChannel("ai_channel");
    const honeypot = interaction.options.getChannel("honeypot_channel");
    const transcript = interaction.options.getChannel("transcript_channel");
    const buyer = interaction.options.getRole("buyer_role");

    if (welcome) currentConfig.welcomeChannel = welcome.id;
    if (goodbye) currentConfig.goodbyeChannel = goodbye.id;
    if (level) currentConfig.levelChannel = level.id;
    if (ai) currentConfig.aiChannel = ai.id;
    if (honeypot) currentConfig.honeypotChannel = honeypot.id;
    if (transcript) currentConfig.transcriptChannel = transcript.id;
    if (buyer) currentConfig.buyerRole = buyer.id;

    db.set(`config_${guildId}`, currentConfig);

    await interaction.reply({
      content:
        "✅ **Pengaturan Bot Berhasil Diperbarui!**\n" +
        `- Welcome: ${currentConfig.welcomeChannel ? `<#${currentConfig.welcomeChannel}>` : "Belum di-set"}\n` +
        `- Goodbye: ${currentConfig.goodbyeChannel ? `<#${currentConfig.goodbyeChannel}>` : "Belum di-set"}\n` +
        `- Level Up: ${currentConfig.levelChannel ? `<#${currentConfig.levelChannel}>` : "Belum di-set"}\n` +
        `- AI Chat: ${currentConfig.aiChannel ? `<#${currentConfig.aiChannel}>` : "Belum di-set"}\n` +
        `- Honeypot: ${currentConfig.honeypotChannel ? `<#${currentConfig.honeypotChannel}>` : "Belum di-set"}\n` +
        `- Transcript Logs: ${currentConfig.transcriptChannel ? `<#${currentConfig.transcriptChannel}>` : "Belum di-set"}\n` +
        `- Buyer Role: ${currentConfig.buyerRole ? `<@&${currentConfig.buyerRole}>` : "Belum di-set"}`,
      ephemeral: true,
    });
  },
};
