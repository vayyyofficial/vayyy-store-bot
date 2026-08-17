const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const db = require("../utils/database");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Menu utama pengaturan konfigurasi store")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt.setName("testi_channel").setDescription("Set Channel Testimoni"),
    )
    .addChannelOption((opt) =>
      opt.setName("order_channel").setDescription("Set Channel Log Order"),
    )
    .addChannelOption((opt) =>
      opt.setName("feedback_channel").setDescription("Set Channel Feedback"),
    )
    .addChannelOption((opt) =>
      opt
        .setName("store_channel")
        .setDescription("Set Channel Info Open/Close Store"),
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const testiChannel = interaction.options.getChannel("testi_channel");
    const orderChannel = interaction.options.getChannel("order_channel");
    const feedbackChannel = interaction.options.getChannel("feedback_channel");
    const storeChannel = interaction.options.getChannel("store_channel");

    // Ambil konfigurasi lama
    const currentConfigs = (await db.get(`config_${guildId}`)) || {};

    // Perbarui hanya jika opsi dipilih
    if (testiChannel) currentConfigs.testiChannel = testiChannel.id;
    if (orderChannel) currentConfigs.orderChannel = orderChannel.id;
    if (feedbackChannel) currentConfigs.feedbackChannel = feedbackChannel.id;
    if (storeChannel) currentConfigs.storeChannel = storeChannel.id;

    // Simpan kembali ke database
    await db.set(`config_${guildId}`, currentConfigs);

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Control Panel Configuration Store")
      .addFields(
        {
          name: "Channel Testimoni",
          value: currentConfigs.testiChannel
            ? `<#${currentConfigs.testiChannel}>`
            : "`Belum di-set`",
          inline: true,
        },
        {
          name: "Channel Log Order",
          value: currentConfigs.orderChannel
            ? `<#${currentConfigs.orderChannel}>`
            : "`Belum di-set`",
          inline: true,
        },
        {
          name: "Channel Feedback",
          value: currentConfigs.feedbackChannel
            ? `<#${currentConfigs.feedbackChannel}>`
            : "`Belum di-set`",
          inline: true,
        },
        {
          name: "Channel Open/Close",
          value: currentConfigs.storeChannel
            ? `<#${currentConfigs.storeChannel}>`
            : "`Belum di-set`",
          inline: true,
        },
      )
      .setColor(config.embedColor || "#FAB502")
      .setTimestamp();

    return interaction.reply({ embeds: [embed], flags: 64 });
  },
};
