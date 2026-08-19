// src/commands/giveaway.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const ms = require("ms");
const db = require("../utils/database");
const { getEmbedTemplate } = require("../utils/featureEmbed");
const { endGiveaway, pickWinners } = require("../utils/giveawayManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Sistem manajemen giveaway server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Memulai giveaway baru")
        .addStringOption((opt) =>
          opt
            .setName("durasi")
            .setDescription("Durasi giveaway (contoh: 1h, 30m, 1d)")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("pemenang")
            .setDescription("Jumlah pemenang")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("hadiah")
            .setDescription("Hadiah giveaway")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("end")
        .setDescription(
          "Menghentikan giveaway secara paksa & langsung mengundi",
        )
        .addStringOption((opt) =>
          opt
            .setName("message_id")
            .setDescription("ID Pesan Giveaway")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reroll")
        .setDescription("Mengundi ulang pemenang giveaway")
        .addStringOption((opt) =>
          opt
            .setName("message_id")
            .setDescription("ID Pesan Giveaway")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription("Mengubah hadiah giveaway yang sedang berjalan")
        .addStringOption((opt) =>
          opt
            .setName("message_id")
            .setDescription("ID Pesan Giveaway")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("hadiah_baru")
            .setDescription("Hadiah baru")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === "start") {
      const durationStr = interaction.options.getString("durasi");
      const winnerCount = interaction.options.getInteger("pemenang");
      const prize = interaction.options.getString("hadiah");

      const durationMs = ms(durationStr);
      if (!durationMs) {
        return interaction.reply({
          content:
            "❌ Format durasi tidak valid! Gunakan format seperti `10m`, `1h`, atau `1d`.",
          ephemeral: true,
        });
      }

      const endTime = Date.now() + durationMs;
      await interaction.deferReply({ ephemeral: true });

      // Buat Tombol Ikut
      const joinBtn = new ButtonBuilder()
        .setCustomId("gw_join")
        .setLabel("🎉 Ikut Giveaway")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(joinBtn);

      const placeholders = {
        "{prize}": prize,
        "{winners_count}": winnerCount.toString(),
        "{end_time}": `<t:${Math.floor(endTime / 1000)}:R>`,
        "{host}": interaction.user.toString(),
      };

      const embedPayload = await getEmbedTemplate(
        guildId,
        "giveaway-start",
        placeholders,
      );
      let gwMessage;

      if (embedPayload) {
        embedPayload.components = [row];
        gwMessage = await interaction.channel.send(embedPayload);
      } else {
        gwMessage = await interaction.channel.send({
          content: `🎉 **GIVEAWAY STARTED!**\n**Hadiah:** ${prize}\n**Pemenang:** ${winnerCount}\n**Berakhir:** <t:${Math.floor(endTime / 1000)}:R>\nHost: ${interaction.user}`,
          components: [row],
        });
      }

      // Simpan ke DB
      const gwData = {
        giveawayId: gwMessage.id,
        messageId: gwMessage.id,
        channelId: interaction.channel.id,
        guildId: guildId,
        prize: prize,
        winnerCount: winnerCount,
        endTime: endTime,
        hostId: interaction.user.id,
        participants: [],
        ended: false,
      };

      db.set(`giveaway_${gwMessage.id}`, gwData);
      await interaction.editReply("✅ Giveaway berhasil dimulai!");
    } else if (sub === "end") {
      const msgId = interaction.options.getString("message_id");
      await endGiveaway(interaction.client, msgId);
      await interaction.reply({
        content: "✅ Giveaway telah dihentikan dan diundi!",
        ephemeral: true,
      });
    } else if (sub === "reroll") {
      const msgId = interaction.options.getString("message_id");
      const gw = db.get(`giveaway_${msgId}`);

      if (!gw || !gw.ended) {
        return interaction.reply({
          content: "❌ Giveaway tidak ditemukan atau belum berakhir!",
          ephemeral: true,
        });
      }

      const newWinners = pickWinners(gw.participants, gw.winnerCount);
      const winnersMention =
        newWinners.length > 0
          ? newWinners.map((id) => `<@${id}>`).join(", ")
          : "Tidak ada peserta.";

      await interaction.reply(
        `🔄 **REROLL PEMENANG!**\nPemenang baru untuk **${gw.prize}** adalah: ${winnersMention}!`,
      );
    } else if (sub === "edit") {
      const msgId = interaction.options.getString("message_id");
      const newPrize = interaction.options.getString("hadiah_baru");
      const gw = db.get(`giveaway_${msgId}`);

      if (!gw || gw.ended) {
        return interaction.reply({
          content: "❌ Giveaway tidak ditemukan atau sudah berakhir!",
          ephemeral: true,
        });
      }

      gw.prize = newPrize;
      db.set(`giveaway_${msgId}`, gw);

      await interaction.reply({
        content: `✅ Hadiah giveaway berhasil diubah menjadi **${newPrize}**!`,
        ephemeral: true,
      });
    }
  },
};
