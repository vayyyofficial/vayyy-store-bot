// src/commands/moderation.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const db = require("../utils/database");

// Helper internal konversi durasi
function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("Fitur pengelolaan dan moderasi anggota server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)

    // CLEAR
    .addSubcommand((sub) =>
      sub
        .setName("clear")
        .setDescription(
          "Menghapus pesan (Pilih opsi jumlah ATAU hapus total channel)",
        )
        .addIntegerOption((opt) =>
          opt
            .setName("jumlah")
            .setDescription("Jumlah pesan yang ingin dihapus (1-100)")
            .setMinValue(1)
            .setMaxValue(100)
            .setRequired(false),
        )
        .addBooleanOption((opt) =>
          opt
            .setName("all")
            .setDescription(
              "Set TRUE untuk menghapus SELURUH pesan (Clone & Reset channel)",
            )
            .setRequired(false),
        ),
    )

    // MUTE
    .addSubcommand((sub) =>
      sub
        .setName("mute")
        .setDescription("Membungkam (mute) member untuk durasi tertentu")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member yang ingin di-mute")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("durasi")
            .setDescription("Durasi mute (Contoh: 10m, 2h, 1d)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("alasan")
            .setDescription("Alasan tindakan mute")
            .setRequired(false),
        ),
    )

    // UNMUTE
    .addSubcommand((sub) =>
      sub
        .setName("unmute")
        .setDescription("Membuka status mute member")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member yang ingin di-unmute")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("alasan")
            .setDescription("Alasan unmute")
            .setRequired(false),
        ),
    )

    // KICK
    .addSubcommand((sub) =>
      sub
        .setName("kick")
        .setDescription("Mengeluarkan member dari server")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member yang ingin di-kick")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("alasan")
            .setDescription("Alasan kick")
            .setRequired(false),
        ),
    )

    // BAN
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription("Mem-ban member secara permanen dari server")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member yang ingin di-ban")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("alasan").setDescription("Alasan ban").setRequired(false),
        ),
    )

    // TEMPBAN
    .addSubcommand((sub) =>
      sub
        .setName("tempban")
        .setDescription("Mem-ban member secara sementara dengan otomatis unban")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member yang ingin di-ban")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("durasi")
            .setDescription("Durasi ban sementara (Contoh: 1d, 7d)")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("alasan")
            .setDescription("Alasan tempban")
            .setRequired(false),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    // ==========================================
    // 1. CLEAR
    // ==========================================
    if (sub === "clear") {
      const amount = interaction.options.getInteger("jumlah");
      const clearAll = interaction.options.getBoolean("all");

      if (!amount && !clearAll) {
        return interaction.reply({
          content:
            "❌ Harap masukkan pilihan **jumlah** pesan (1-100) atau set **all: True** untuk membersihkan seluruh channel!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (clearAll) {
        await interaction.reply({
          content: "🧹 Memproses pembersihan total channel...",
          flags: MessageFlags.Ephemeral,
        });

        const channel = interaction.channel;
        const position = channel.position;

        try {
          const clonedChannel = await channel.clone({
            reason: `Clear All oleh ${interaction.user.tag}`,
          });

          await clonedChannel.setPosition(position);
          await channel.delete(`Clear All oleh ${interaction.user.tag}`);

          const embed = new EmbedBuilder()
            .setColor("#57F287")
            .setTitle("🧹 Channel Berhasil Dibersihkan Total!")
            .setDescription(
              `Channel ini telah di-reset dan dibersihkan oleh <@${interaction.user.id}>.`,
            )
            .setTimestamp();

          const msg = await clonedChannel.send({ embeds: [embed] });
          setTimeout(() => msg.delete().catch(() => {}), 10000);
          return;
        } catch (err) {
          console.error("Error Clear All:", err);
          return interaction.followUp({
            content:
              "❌ Gagal meng-clone channel. Pastikan bot punya permission `Manage Channels`!",
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      try {
        const deleted = await interaction.channel.bulkDelete(amount, true);
        return interaction.reply({
          content: `🧹 Berhasil menghapus **${deleted.size}** pesan.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        return interaction.reply({
          content:
            "❌ Gagal menghapus pesan. Pesan yang berumur lebih dari 14 hari tidak dapat dihapus secara masal.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ==========================================
    // 2. MUTE
    // ==========================================
    else if (sub === "mute") {
      const targetUser = interaction.options.getUser("target");
      const durationStr = interaction.options.getString("durasi");
      const reason =
        interaction.options.getString("alasan") || "Tidak ada alasan.";

      if (targetUser.id === interaction.user.id) {
        return interaction.reply({
          content: "❌ Kamu tidak bisa meng-mute diri sendiri!",
          flags: MessageFlags.Ephemeral,
        });
      }

      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      if (!member) {
        return interaction.reply({
          content: "❌ Member tidak ditemukan di server ini.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (interaction.guild.ownerId === targetUser.id) {
        return interaction.reply({
          content: "❌ Bot tidak bisa meng-mute Owner Server!",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!member.moderatable) {
        return interaction.reply({
          content: "❌ Bot tidak bisa meng-mute member ini!",
          flags: MessageFlags.Ephemeral,
        });
      }

      const durationMs = parseDuration(durationStr);
      if (!durationMs || durationMs > 28 * 24 * 60 * 60 * 1000) {
        return interaction.reply({
          content:
            "❌ Format durasi salah! Gunakan seperti `10m`, `2h`, `1d` (Maksimal 28 hari).",
          flags: MessageFlags.Ephemeral,
        });
      }

      const dmEmbed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle(`🤐 Kamu Di-mute di ${interaction.guild.name}`)
        .addFields(
          { name: "⏱️ Durasi", value: durationStr, inline: true },
          { name: "📝 Alasan", value: reason, inline: true },
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});

      try {
        await member.timeout(durationMs, reason);
        return interaction.reply({
          content: `🤐 <@${targetUser.id}> berhasil di-mute selama **${durationStr}**. Alasan: ${reason}`,
        });
      } catch (err) {
        return interaction.reply({
          content: `❌ Gagal melakukan mute: \`${err.message}\``,
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // ==========================================
    // 3. UNMUTE
    // ==========================================
    else if (sub === "unmute") {
      const targetUser = interaction.options.getUser("target");
      const reason =
        interaction.options.getString("alasan") || "Di-unmute oleh moderator.";

      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      if (!member) {
        return interaction.reply({
          content: "❌ Member tidak ditemukan.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!member.isCommunicationDisabled()) {
        return interaction.reply({
          content: "❌ Member ini sedang tidak dalam status mute.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await member.timeout(null, reason);
      return interaction.reply({
        content: `🔊 Status mute untuk <@${targetUser.id}> telah dicabut. Alasan: ${reason}`,
      });
    }

    // ==========================================
    // 4. KICK
    // ==========================================
    else if (sub === "kick") {
      const targetUser = interaction.options.getUser("target");
      const reason =
        interaction.options.getString("alasan") || "Tidak ada alasan.";

      const member = await interaction.guild.members
        .fetch(targetUser.id)
        .catch(() => null);
      if (!member || !member.kickable) {
        return interaction.reply({
          content: "❌ Saya tidak dapat meng-kick member ini!",
          flags: MessageFlags.Ephemeral,
        });
      }

      const dmEmbed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle(`👞 Kamu Dikeluarkan dari ${interaction.guild.name}`)
        .addFields({ name: "📝 Alasan", value: reason })
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
      await member.kick(reason);

      return interaction.reply({
        content: `👞 <@${targetUser.id}> berhasil di-kick! Alasan: ${reason}`,
      });
    }

    // ==========================================
    // 5. BAN
    // ==========================================
    else if (sub === "ban") {
      const targetUser = interaction.options.getUser("target");
      const reason =
        interaction.options.getString("alasan") || "Tidak ada alasan.";

      const dmEmbed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle(`🔨 Kamu Di-ban dari ${interaction.guild.name}`)
        .addFields({ name: "📝 Alasan", value: reason })
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
      await interaction.guild.members.ban(targetUser.id, { reason });

      return interaction.reply({
        content: `🔨 <@${targetUser.id}> berhasil di-ban! Alasan: ${reason}`,
      });
    }

    // ==========================================
    // 6. TEMPBAN
    // ==========================================
    else if (sub === "tempban") {
      const targetUser = interaction.options.getUser("target");
      const durationStr = interaction.options.getString("durasi");
      const reason =
        interaction.options.getString("alasan") || "Tidak ada alasan.";

      const durationMs = parseDuration(durationStr);
      if (!durationMs) {
        return interaction.reply({
          content:
            "❌ Format durasi tidak valid! Gunakan seperti `1h`, `1d`, atau `7d`.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const unbanTimestamp = Date.now() + durationMs;

      const dmEmbed = new EmbedBuilder()
        .setColor("#ED4245")
        .setTitle(`🔨 Kamu Di-ban Sementara dari ${interaction.guild.name}`)
        .addFields(
          { name: "⏱️ Durasi", value: durationStr, inline: true },
          { name: "📝 Alasan", value: reason, inline: true },
          {
            name: "⏰ Otomatis Unban",
            value: `<t:${Math.floor(unbanTimestamp / 1000)}:F>`,
            inline: false,
          },
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] }).catch(() => {});
      await interaction.guild.members.ban(targetUser.id, {
        reason: `[Tempban ${durationStr}] ${reason}`,
      });

      await db.set(`tempban_${interaction.guild.id}_${targetUser.id}`, {
        guildId: interaction.guild.id,
        userId: targetUser.id,
        unbanTimestamp: unbanTimestamp,
      });

      setTimeout(async () => {
        await interaction.guild.members
          .unban(targetUser.id, "Masa Tempban Telah Selesai")
          .catch(() => {});
        await db.delete(`tempban_${interaction.guild.id}_${targetUser.id}`);
      }, durationMs);

      return interaction.reply({
        content: `⏳ <@${targetUser.id}> berhasil di-ban sementara selama **${durationStr}** (Unban: <t:${Math.floor(unbanTimestamp / 1000)}:R>). Alasan: ${reason}`,
      });
    }
  },
};
