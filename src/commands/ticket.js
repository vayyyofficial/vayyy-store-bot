// src/commands/ticket.js
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Perintah manajemen tiket")
    .addSubcommand((sub) =>
      sub
        .setName("proses")
        .setDescription(
          "Ubah status tiket menjadi PROSES dan pindahkan kategori",
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("done")
        .setDescription("Selesaikan tiket, buat transcript, dan hapus channel"),
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const channel = interaction.channel;

    // Cek apakah channel ini adalah channel tiket
    const ticketData = await db.get(`ticket_data_${channel.id}`);
    if (!ticketData) {
      return interaction.reply({
        content:
          "❌ Perintah ini hanya bisa digunakan di dalam **Channel Tiket**!",
        flags: 64,
      });
    }

    // Ambil Role ID dari Database
    const csRoleId = await db.get(`ticket_role_cs_${guildId}`);
    const workerRoleId = await db.get(`ticket_role_worker_${guildId}`);

    // Cek Akses User (Owner / Admin / CS / Worker)
    const isOwner = interaction.user.id === interaction.guild.ownerId;
    const isAdmin = interaction.member.permissions.has(
      PermissionFlagsBits.Administrator,
    );
    const isCS = csRoleId && interaction.member.roles.cache.has(csRoleId);
    const isWorker =
      workerRoleId && interaction.member.roles.cache.has(workerRoleId);

    const subcommand = interaction.options.getSubcommand();

    // ==========================================
    // 1. SUBCOMMAND: /ticket proses (CS & WORKER BISA)
    // ==========================================
    if (subcommand === "proses") {
      if (!isOwner && !isAdmin && !isCS && !isWorker) {
        return interaction.reply({
          content: "❌ Anda tidak memiliki izin untuk memproses tiket ini!",
          flags: 64,
        });
      }

      const categoryProsesId = await db.get(`ticket_cat_proses_${guildId}`);
      const newName = `proses-${channel.name.split("-").slice(1).join("-")}`;

      await channel.setName(newName);
      if (categoryProsesId) {
        await channel.setParent(categoryProsesId, { lockPermissions: false });
      }

      const embedProses = new EmbedBuilder()
        .setTitle("🌀 Status Tiket Diperbarui")
        .setDescription(
          `Tiket ini telah diubah statusnya menjadi **PROSES** oleh <@${interaction.user.id}>.`,
        )
        .setColor("#FEE75C")
        .setTimestamp();

      return interaction.reply({ embeds: [embedProses] });
    }

    // ==========================================
    // 2. SUBCOMMAND: /ticket done (HANYA CS / ADMIN / OWNER - WORKER TIDAK BISA)
    // ==========================================
    if (subcommand === "done") {
      if (!isOwner && !isAdmin && !isCS) {
        return interaction.reply({
          content:
            "❌ **Akses Ditolak!** Hanya Role Customer Service (CS) / Admin yang dapat menutup tiket.",
          flags: 64,
        });
      }

      await interaction.reply(
        "⏳ **Menutup tiket, memproses transcript, dan menghapus channel...**",
      );

      // Fetch seluruh pesan di channel tiket
      const fetchedMessages = await channel.messages.fetch({ limit: 100 });
      const rawMessages = Array.from(fetchedMessages.values()).reverse();

      // Format Transcript Chat
      let transcriptText = `==================================================\n`;
      transcriptText += `TRANSCRIPT TIKET SERVER: ${interaction.guild.name}\n`;
      transcriptText += `Channel Name : ${channel.name}\n`;
      transcriptText += `Closed By    : ${interaction.user.tag} (${interaction.user.id})\n`;
      transcriptText += `Closed At    : ${new Date().toLocaleString("id-ID")}\n`;
      transcriptText += `==================================================\n\n`;

      rawMessages.forEach((msg) => {
        const time = new Date(msg.createdTimestamp).toLocaleString("id-ID");
        const author = `${msg.author.tag} (${msg.author.id})`;
        const content =
          msg.content ||
          (msg.embeds.length > 0 ? "[Embed Message]" : "[Attachment/Media]");
        transcriptText += `[${time}] ${author}:\n${content}\n\n`;
      });

      const buffer = Buffer.from(transcriptText, "utf-8");
      const attachment = new AttachmentBuilder(buffer, {
        name: `transcript-${channel.name}.txt`,
      });

      // Embed Info Transcript
      const embedLog = new EmbedBuilder()
        .setTitle("📜 Transcript Tiket Selesai")
        .addFields(
          {
            name: "📁 Nama Channel",
            value: `\`${channel.name}\``,
            inline: true,
          },
          {
            name: "👤 Pembuat Tiket",
            value: `<@${ticketData.ownerId}>`,
            inline: true,
          },
          {
            name: "🛠️ Ditutup Oleh",
            value: `<@${interaction.user.id}>`,
            inline: true,
          },
        )
        .setColor("#57F287")
        .setTimestamp();

      // A. Kirim Ke Logs Channel Private (Jika di-set)
      const logsChannelId = await db.get(`ticket_logs_channel_${guildId}`);
      if (logsChannelId) {
        const logsChannel = interaction.guild.channels.cache.get(logsChannelId);
        if (logsChannel) {
          await logsChannel.send({ embeds: [embedLog], files: [attachment] });
        }
      }

      // B. Kirim Ke DM Customer Pembuat Tiket
      try {
        const ticketOwner = await interaction.guild.members.fetch(
          ticketData.ownerId,
        );
        if (ticketOwner) {
          await ticketOwner.send({
            content: `Hello <@${ticketData.ownerId}>, tiket Anda di **${interaction.guild.name}** telah selesai/ditutup. Berikut lampiran berkas transcript obrolan Anda:`,
            embeds: [embedLog],
            files: [attachment],
          });
        }
      } catch (dmErr) {
        console.log(
          `Gagal mengirim DM Transcript ke user ${ticketData.ownerId}:`,
          dmErr.message,
        );
      }

      // Hapus data tiket di DB & hapus channel setelah 5 detik
      await db.delete(`ticket_data_${channel.id}`);
      setTimeout(async () => {
        try {
          await channel.delete();
        } catch (err) {
          console.error("Gagal menghapus channel tiket:", err);
        }
      }, 5000);
    }
  },
};
