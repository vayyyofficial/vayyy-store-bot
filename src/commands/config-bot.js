// src/commands/config-bot.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config-bot")
    .setDescription("Mengatur konfigurasi channel dan role bot server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("welcome_channel")
        .setDescription("Channel untuk pesan member masuk")
        .addChannelTypes(ChannelType.GuildText),
    )
    .addChannelOption((opt) =>
      opt
        .setName("goodbye_channel")
        .setDescription("Channel untuk pesan member keluar")
        .addChannelTypes(ChannelType.GuildText),
    )
    .addChannelOption((opt) =>
      opt
        .setName("levelup_channel")
        .setDescription("Channel untuk notifikasi naik level")
        .addChannelTypes(ChannelType.GuildText),
    )
    .addChannelOption((opt) =>
      opt
        .setName("honeypot_channel")
        .setDescription("Channel jebakan untuk bot/spammer")
        .addChannelTypes(ChannelType.GuildText),
    )
    .addChannelOption((opt) =>
      opt
        .setName("transcript_channel")
        .setDescription("Channel simpan transcript tiket")
        .addChannelTypes(ChannelType.GuildText),
    )
    .addRoleOption((opt) =>
      opt.setName("buyer_role").setDescription("Role khusus untuk pembeli"),
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // 1. Ambil konfigurasi lama dari database (atau buat objek kosong jika belum ada)
    const existingConfig = (await db.get(`config_${guildId}`)) || {};

    // 2. Ambil nilai opsi dari input user saat ini
    const welcome = interaction.options.getChannel("welcome_channel");
    const goodbye = interaction.options.getChannel("goodbye_channel");
    const levelup = interaction.options.getChannel("levelup_channel");
    const honeypot = interaction.options.getChannel("honeypot_channel");
    const transcript = interaction.options.getChannel("transcript_channel");
    const buyerRole = interaction.options.getRole("buyer_role");

    // 3. LOGIKA MERGE: Pertahankan data lama jika opsi tidak diisi (null)
    const updatedConfig = {
      welcomeChannel: welcome
        ? welcome.id
        : existingConfig.welcomeChannel || null,
      goodbyeChannel: goodbye
        ? goodbye.id
        : existingConfig.goodbyeChannel || null,
      levelupChannel: levelup
        ? levelup.id
        : existingConfig.levelupChannel || null,
      honeypotChannel: honeypot
        ? honeypot.id
        : existingConfig.honeypotChannel || null,
      transcriptChannel: transcript
        ? transcript.id
        : existingConfig.transcriptChannel || null,
      buyerRole: buyerRole ? buyerRole.id : existingConfig.buyerRole || null,
    };

    // 4. Simpan konfigurasi gabungan kembali ke database
    await db.set(`config_${guildId}`, updatedConfig);

    // 5. Fungsi pembantu untuk format tampilan response
    const formatChan = (id) => (id ? `<#${id}>` : "Belum di-set");
    const formatRole = (id) => (id ? `<@&${id}>` : "Belum di-set");

    // 6. Tampilkan status konfigurasi terbaru
    const responseText =
      `✅ **Pengaturan Bot Berhasil Diperbarui!**\n\n` +
      `• Welcome: ${formatChan(updatedConfig.welcomeChannel)}\n` +
      `• Goodbye: ${formatChan(updatedConfig.goodbyeChannel)}\n` +
      `• Level Up: ${formatChan(updatedConfig.levelupChannel)}\n` +
      `• Honeypot: ${formatChan(updatedConfig.honeypotChannel)}\n` +
      `• Transcript Logs: ${formatChan(updatedConfig.transcriptChannel)}\n` +
      `• Buyer Role: ${formatRole(updatedConfig.buyerRole)}`;

    await interaction.reply({
      content: responseText,
      flags: 64,
    });
  },
};
