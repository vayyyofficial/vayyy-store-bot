const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const config = require("../config/config");
const db = require("../utils/database");
const { sendFeatureEmbed } = require("../utils/featureEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Kirimkan masukan atau ulasan kamu")
    .addIntegerOption((opt) =>
      opt
        .setName("rating")
        .setDescription("Beri rating bintang (1 - 5)")
        .setMinValue(1)
        .setMaxValue(5)
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("pesan")
        .setDescription("Isi feedback atau ulasan kamu (Opsional)")
        .setRequired(false),
    )
    .addAttachmentOption((opt) =>
      opt
        .setName("image")
        .setDescription("Unggah gambar/bukti dari perangkat kamu (Opsional)")
        .setRequired(false),
    ),

  async execute(interaction) {
    const guild = interaction.guild;
    const member = interaction.member;

    // Verifikasi Akses Buyer
    const buyerRoleId = config.buyerRoleId;
    const isBuyer = buyerRoleId && member.roles.cache.has(buyerRoleId);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isBuyer && !isAdmin) {
      return interaction.reply({
        content: "❌ Maaf, fitur ini hanya dapat digunakan oleh **Buyer**!",
        flags: 64,
      });
    }

    const ratingNum = interaction.options.getInteger("rating");
    const rawMessageContent = interaction.options.getString("pesan");
    const messageContent =
      rawMessageContent && rawMessageContent.trim().length > 0
        ? rawMessageContent.trim()
        : "No Reason";

    const imageAttachment = interaction.options.getAttachment("image");

    const feedbackChannelId =
      (await db.get(`feedback_channel_${guild.id}`)) ||
      config.feedbackChannelId;
    const templateName =
      (await db.get(`feedback_template_${guild.id}`)) || "feedback";

    const feedbackChannel = guild.channels.cache.get(feedbackChannelId);

    if (!feedbackChannel) {
      return interaction.reply({
        content:
          "❌ Channel ulasan belum dikonfigurasi! Hubungi Admin untuk mengatur channel target.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const starEmoji =
      config.customStarEmoji || "<:emoji_20:1509016228717531256>";
    const ratingStars = starEmoji.repeat(ratingNum);

    // 1. Kirim Ulasan Ke Channel Feedback Target
    const sentViaTemplate = await sendFeatureEmbed({
      guild: guild,
      channel: feedbackChannel,
      templateName: templateName,
      data: {
        guild: guild,
        user: interaction.user,
        customer: interaction.user,
        rating: ratingNum,
        ulasan: messageContent,
        note: messageContent,
      },
      attachment: imageAttachment ? imageAttachment : null,
    });

    // Fallback jika tidak memakai template
    if (!sentViaTemplate) {
      const embed = new EmbedBuilder()
        .setTitle("📝 Feedback Baru Diterima")
        .setColor(config.embedColor || "#FAB502")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          {
            name: "👤 Pembeli / Buyer",
            value: `${interaction.user} (${interaction.user.tag})`,
            inline: true,
          },
          { name: "⭐ Rating", value: ratingStars, inline: true },
          { name: "💬 Pesan / Ulasan", value: messageContent },
        )
        .setFooter({ text: `Feedback dari server ${guild.name}` })
        .setTimestamp();

      if (imageAttachment) {
        embed.setImage(imageAttachment.url);
      }

      await feedbackChannel.send({ embeds: [embed] });
    }

    // 2. Update Database Statistik Rating Store
    let stats = (await db.get(`feedback_stats_${guild.id}`)) || {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };
    stats[ratingNum] = (stats[ratingNum] || 0) + 1;
    await db.set(`feedback_stats_${guild.id}`, stats);

    // 3. Auto-edit Papan Leaderboard Gabungan
    const configLb = await db.get(`config_leaderboard_${guild.id}`);
    if (
      configLb &&
      configLb.channelId &&
      configLb.template &&
      configLb.messageId
    ) {
      try {
        const lbChannel = await guild.channels.fetch(configLb.channelId);
        const lbMessage = await lbChannel.messages.fetch(configLb.messageId);

        if (lbMessage) {
          await sendFeatureEmbed({
            guild: guild,
            channel: lbChannel,
            editMessage: lbMessage,
            templateName: configLb.template,
            data: { guild: guild, user: interaction.user },
          });
        }
      } catch (err) {
        console.error("Gagal auto-update leaderboard dari feedback:", err);
      }
    }

    return interaction.editReply({
      content: `✅ Terima kasih atas ulasan ${ratingStars} kamu! Feedback telah dikirim.`,
    });
  },
};
