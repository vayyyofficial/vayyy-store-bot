// src/utils/ticketManager.js
const {
  ChannelType,
  PermissionFlagsBits,
  AttachmentBuilder,
  MessageFlags,
} = require("discord.js");
const discordTranscripts = require("discord-html-transcripts");
const db = require("./database");
const { getEmbedTemplate } = require("./featureEmbed");

/**
 * Mengubah status & kategori tiket (/ticket proses atau /ticket order)
 */
async function moveTicketStatus(interaction, newStatus, categoryConfigKey) {
  const guild = interaction.guild;
  const channel = interaction.channel;
  const guildConfig = db.get(`config_${guild.id}`) || {};
  const targetCategoryId = guildConfig[categoryConfigKey];

  // Cek apakah channel adalah tiket
  const ticketData = db.get(`ticket_${channel.id}`);
  if (!ticketData) {
    return interaction.reply({
      content: "❌ Command ini hanya dapat digunakan di dalam channel tiket!",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply();

  // Dapatkan nomor/ID unik tiket dari nama channel lama
  const nameParts = channel.name.split("-");
  const ticketIndex = nameParts[nameParts.length - 1]; // misal "001"
  const ownerName = ticketData.ownerName || "user";

  // Format nama channel baru: misal "proses-vayyy-001"
  const newChannelName = `${newStatus}-${ownerName}-${ticketIndex}`;

  // Pindahkan Kategori dan Ubah Nama Channel
  try {
    if (targetCategoryId) {
      await channel.setParent(targetCategoryId, { lockPermissions: false });
    }
    await channel.setName(newChannelName);

    // Update DB Status
    ticketData.status = newStatus;
    db.set(`ticket_${channel.id}`, ticketData);

    // Kirim Embed Notifikasi Status Baru
    const placeholders = {
      "{user}": interaction.user.toString(),
      "{ticket.status}": newStatus.toUpperCase(),
      "{ticket.owner}": `<@${ticketData.ownerId}>`,
    };

    const embedPayload = await getEmbedTemplate(
      guild.id,
      `ticket_${newStatus}`,
      placeholders,
    );
    if (embedPayload) {
      await interaction.editReply(embedPayload);
    } else {
      await interaction.editReply(
        `✅ Tiket berhasil diubah statusnya menjadi **${newStatus.toUpperCase()}**.`,
      );
    }
  } catch (err) {
    console.error("[Ticket Move Error]:", err);
    await interaction.editReply(
      "⚠️ Gagal memindahkan status/kategori channel tiket.",
    );
  }
}

/**
 * Menutup tiket, meng-generate transcript HTML, kirim ke DM & Log, lalu hapus channel
 */
async function closeTicket(interaction) {
  const channel = interaction.channel;
  const guild = interaction.guild;
  const ticketData = db.get(`ticket_${channel.id}`);

  if (!ticketData) {
    return interaction.reply({
      content: "❌ Command ini hanya dapat digunakan di dalam channel tiket!",
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply(
    "🔒 Memproses penutupan tiket dan pembuatan transcript...",
  );

  try {
    // 1. Generate Transcript HTML
    const attachment = await discordTranscripts.createTranscript(channel, {
      limit: -1,
      returnNodeStream: false,
      fileName: `transcript-${channel.name}.html`,
      poweredBy: false,
    });

    const guildConfig = db.get(`config_${guild.id}`) || {};
    const transcriptChannelId = guildConfig.transcriptChannel;
    const ownerMember = await guild.members
      .fetch(ticketData.ownerId)
      .catch(() => null);

    // 2. Kirim Transcript ke DM Customer
    if (ownerMember) {
      try {
        await ownerMember.send({
          content: `📄 Berikut adalah transcript dari tiket kamu di **${guild.name}** (${channel.name}):`,
          files: [attachment],
        });
      } catch (err) {
        console.log(
          `[Ticket Close] Tidak bisa mengikat DM ke ${ownerMember.user.tag}`,
        );
      }
    }

    // 3. Kirim Transcript ke Channel Log Transcript khusus Admin
    if (transcriptChannelId) {
      const transcriptChannel = guild.channels.cache.get(transcriptChannelId);
      if (transcriptChannel) {
        await transcriptChannel.send({
          content: `📁 **Transcript Tiket Selesai**\n- **Channel:** ${channel.name}\n- **Pemilik:** <@${ticketData.ownerId}>\n- **Ditutup Oleh:** ${interaction.user.tag}`,
          files: [attachment],
        });
      }
    }

    // 4. Hapus Data dari DB & Hapus Channel setelah 5 detik
    db.delete(`ticket_${channel.id}`);
    setTimeout(() => {
      channel.delete().catch(console.error);
    }, 5000);
  } catch (err) {
    console.error("[Ticket Close Error]:", err);
    await interaction.followUp(
      "⚠️ Terjadi kesalahan saat memproses transcript tiket.",
    );
  }
}

module.exports = { moveTicketStatus, closeTicket };
