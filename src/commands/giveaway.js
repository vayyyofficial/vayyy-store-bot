// src/commands/giveaway.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require("discord.js");
const ms = require("ms");
const db = require("../utils/database");
const { sendFeatureEmbed } = require("../utils/featureEmbed");
const { endGiveaway, pickWinners } = require("../utils/giveawayManager");
const { buildGiveawayPlaceholders } = require("../utils/placeholder");

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
            .setDescription("Jumlah pemenang (Maksimal 10)")
            .setMinValue(1)
            .setMaxValue(10)
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

      if (winnerCount > 10) {
        return interaction.reply({
          content:
            "❌ Maksimal jumlah pemenang untuk giveaway ini adalah 10 orang!",
          flags: 64,
        });
      }

      const durationMs = ms(durationStr);
      if (!durationMs) {
        return interaction.reply({
          content:
            "❌ Format durasi tidak valid! Gunakan format seperti `10m`, `1h`, atau `1d`.",
          flags: 64,
        });
      }

      const endTime = Date.now() + durationMs;
      await interaction.deferReply({ flags: 64 });

      // Tombol Ikut Giveaway
      const joinBtn = new ButtonBuilder()
        .setCustomId("gw_join")
        .setLabel("🎉 Ikut Giveaway")
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(joinBtn);

      const tempGwData = {
        prize: prize,
        winnerCount: winnerCount,
        endTime: endTime,
        hostId: interaction.user.id,
        participants: [],
      };

      const placeholders = buildGiveawayPlaceholders(tempGwData);

      let gwMessage = null;
      const customSent = await sendFeatureEmbed({
        guild: interaction.guild,
        channel: interaction.channel,
        templateName: "giveaway-start",
        data: placeholders,
        extraComponents: [row],
      });

      if (!customSent) {
        gwMessage = await interaction.channel.send({
          content: `🎉 **GIVEAWAY STARTED!**\n\n🎁 **Hadiah:** ${prize}\n🏆 **Pemenang:** ${winnerCount}\n⏳ **Berakhir:** <t:${Math.floor(
            endTime / 1000,
          )}:R>\n👑 **Host:** ${interaction.user}`,
          components: [row],
        });
      } else {
        const msgs = await interaction.channel.messages.fetch({ limit: 1 });
        gwMessage = msgs.first();
      }

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

      await db.set(`giveaway_${gwMessage.id}`, gwData);
      await interaction.editReply("✅ Giveaway berhasil dimulai!");
    } else if (sub === "end") {
      const msgId = interaction.options.getString("message_id");
      await endGiveaway(interaction.client, msgId);
      await interaction.reply({
        content: "✅ Giveaway telah dihentikan dan diundi!",
        flags: 64,
      });
    } else if (sub === "reroll") {
      const msgId = interaction.options.getString("message_id");
      const gw = await db.get(`giveaway_${msgId}`);

      if (!gw || !gw.ended) {
        return interaction.reply({
          content: "❌ Giveaway tidak ditemukan atau belum berakhir!",
          flags: 64,
        });
      }

      const newWinners = pickWinners(gw.participants, gw.winnerCount);
      gw.winners = newWinners;
      await db.set(`giveaway_${msgId}`, gw);

      const placeholders = buildGiveawayPlaceholders(gw, newWinners);

      const customReroll = await sendFeatureEmbed({
        guild: interaction.guild,
        channel: interaction.channel,
        templateName: "giveaway-reroll",
        data: placeholders,
      });

      if (!customReroll) {
        await interaction.reply({
          content: `🔄 **REROLL PEMENANG!**\nPemenang baru untuk **${gw.prize}** adalah: ${placeholders["{winners}"]}`,
        });
      } else {
        await interaction.reply({
          content: "🔄 **Reroll pemenang berhasil dieksekusi!**",
          flags: 64,
        });
      }
    } else if (sub === "edit") {
      const msgId = interaction.options.getString("message_id");
      const newPrize = interaction.options.getString("hadiah_baru");
      const gw = await db.get(`giveaway_${msgId}`);

      if (!gw || gw.ended) {
        return interaction.reply({
          content: "❌ Giveaway tidak ditemukan atau sudah berakhir!",
          flags: 64,
        });
      }

      // Update data di database
      const oldPrize = gw.prize;
      gw.prize = newPrize;
      await db.set(`giveaway_${msgId}`, gw);

      // Real-time Edit Pesan Discord
      try {
        const channel = await interaction.guild.channels
          .fetch(gw.channelId)
          .catch(() => null);

        if (!channel) {
          return interaction.reply({
            content: "❌ Channel giveaway tidak ditemukan!",
            flags: 64,
          });
        }

        const message = await channel.messages.fetch(msgId).catch(() => null);

        if (!message) {
          return interaction.reply({
            content: "❌ Pesan giveaway tidak ditemukan di channel!",
            flags: 64,
          });
        }

        // Cek apakah pesan asli menggunakan Embed atau Text biasa
        if (message.embeds && message.embeds.length > 0) {
          const oldEmbed = message.embeds[0];
          const updatedEmbed = EmbedBuilder.from(oldEmbed);

          // Update teks hadiah di Description jika ada
          if (oldEmbed.description) {
            updatedEmbed.setDescription(
              oldEmbed.description.replaceAll(oldPrize, newPrize),
            );
          }

          // Update teks hadiah di Fields jika ada
          if (oldEmbed.fields && oldEmbed.fields.length > 0) {
            const updatedFields = oldEmbed.fields.map((field) => ({
              ...field,
              value: field.value.replaceAll(oldPrize, newPrize),
            }));
            updatedEmbed.setFields(updatedFields);
          }

          await message.edit({
            embeds: [updatedEmbed],
            components: message.components,
          });
        } else {
          // Edit pesan berupa teks standar
          await message.edit({
            content: `🎉 **GIVEAWAY STARTED!**\n\n🎁 **Hadiah:** ${newPrize}\n🏆 **Pemenang:** ${gw.winnerCount}\n⏳ **Berakhir:** <t:${Math.floor(
              gw.endTime / 1000,
            )}:R>\n👑 **Host:** <@${gw.hostId}>`,
            components: message.components,
          });
        }

        await interaction.reply({
          content: `✅ Hadiah giveaway berhasil diubah menjadi **${newPrize}** dan pesan Discord telah diperbarui!`,
          flags: 64,
        });
      } catch (err) {
        console.error("Gagal memperbarui pesan giveaway di Discord:", err);
        await interaction.reply({
          content: `⚠️ Hadiah diubah di database, tetapi gagal mengedit pesan: ${err.message}`,
          flags: 64,
        });
      }
    }
  },
};
