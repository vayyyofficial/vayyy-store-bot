// src/events/ticketAutoClose.js
const { AttachmentBuilder, EmbedBuilder } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    console.log("⏰ Auto-Done Ticket System Started!");

    // Tangkap aktivitas chat terbaru di channel tiket untuk update timer
    client.on("messageCreate", async (message) => {
      if (message.author.bot || !message.guild) return;

      const ticketData = await db.get(`ticket_data_${message.channel.id}`);
      if (ticketData) {
        ticketData.lastActivity = Date.now();
        ticketData.warned12h = false;
        ticketData.warned24h = false;
        await db.set(`ticket_data_${message.channel.id}`, ticketData);
      }
    });

    // Jalankan pengecekan interval setiap 5 menit (300.000 ms)
    setInterval(async () => {
      const allKeys = await db.all(); // Ambil seluruh data DB
      const now = Date.now();

      const hour12 = 12 * 60 * 60 * 1000;
      const hour24 = 24 * 60 * 60 * 1000;
      const hour48 = 48 * 60 * 60 * 1000;

      for (const item of allKeys) {
        if (item.id.startsWith("ticket_data_")) {
          const channelId = item.id.replace("ticket_data_", "");
          const ticketData = item.value;
          if (!ticketData || !ticketData.lastActivity) continue;

          const channel = client.channels.cache.get(channelId);
          if (!channel) {
            // Hapus data sampah dari DB jika channel fisik sudah di-delete
            await db.delete(item.id);
            continue;
          }

          const inactivity = now - ticketData.lastActivity;
          const guildId = channel.guild.id;

          // ==========================================
          // 1. WARNING 12 JAM (TAG CUSTOMER)
          // ==========================================
          if (
            inactivity >= hour12 &&
            inactivity < hour24 &&
            !ticketData.warned12h
          ) {
            ticketData.warned12h = true;
            await db.set(item.id, ticketData);

            await channel.send({
              content: `🔔 Halo <@${ticketData.ownerId}>, tidak ada aktivitas di tiket ini selama **12 Jam**. Apakah masih membutuhkan bantuan?`,
            });
          }

          // ==========================================
          // 2. WARNING 24 JAM (TAG CUSTOMER + CS ROLE)
          // ==========================================
          if (
            inactivity >= hour24 &&
            inactivity < hour48 &&
            !ticketData.warned24h
          ) {
            ticketData.warned24h = true;
            await db.set(item.id, ticketData);

            const csRoleId = await db.get(`ticket_role_cs_${guildId}`);
            let mention = `<@${ticketData.ownerId}>`;
            if (csRoleId) mention += ` <@&${csRoleId}>`;

            await channel.send({
              content: `⚠️ Perhatian ${mention}, tiket ini tidak aktif selama **24 Jam**. Jika tidak ada respon dalam 24 jam ke depan, tiket akan ditutup secara otomatis oleh sistem.`,
            });
          }

          // ==========================================
          // 3. AUTO CLOSE 48 JAM
          // ==========================================
          if (inactivity >= hour48) {
            try {
              await channel.send(
                "🛑 **Tiket ditutup secara otomatis karena tidak ada aktivitas selama 48 Jam.**",
              );

              // Generate Transcript Chat
              const fetchedMessages = await channel.messages.fetch({
                limit: 100,
              });
              const rawMessages = Array.from(
                fetchedMessages.values(),
              ).reverse();

              let transcriptText = `==================================================\n`;
              transcriptText += `TRANSCRIPT AUTO-CLOSE TIKET\n`;
              transcriptText += `Channel Name : ${channel.name}\n`;
              transcriptText += `Reason       : Inaktif 48 Jam\n`;
              transcriptText += `Closed At    : ${new Date().toLocaleString("id-ID")}\n`;
              transcriptText += `==================================================\n\n`;

              rawMessages.forEach((msg) => {
                const time = new Date(msg.createdTimestamp).toLocaleString(
                  "id-ID",
                );
                const author = `${msg.author.tag} (${msg.author.id})`;
                const content =
                  msg.content ||
                  (msg.embeds.length > 0
                    ? "[Embed Message]"
                    : "[Attachment/Media]");
                transcriptText += `[${time}] ${author}:\n${content}\n\n`;
              });

              const buffer = Buffer.from(transcriptText, "utf-8");
              const attachment = new AttachmentBuilder(buffer, {
                name: `transcript-autoclose-${channel.name}.txt`,
              });

              const embedLog = new EmbedBuilder()
                .setTitle("📜 Transcript Tiket (Auto Closed - Inaktif 48 Jam)")
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
                )
                .setColor("#ED4245")
                .setTimestamp();

              // Kirim ke Channel Logs
              const logsChannelId = await db.get(
                `ticket_logs_channel_${guildId}`,
              );
              if (logsChannelId) {
                const logsChannel =
                  channel.guild.channels.cache.get(logsChannelId);
                if (logsChannel) {
                  await logsChannel.send({
                    embeds: [embedLog],
                    files: [attachment],
                  });
                }
              }

              // Kirim ke DM Member
              try {
                const ticketOwner = await channel.guild.members.fetch(
                  ticketData.ownerId,
                );
                if (ticketOwner) {
                  await ticketOwner.send({
                    content: `Hello <@${ticketData.ownerId}>, tiket Anda telah ditutup otomatis karena tidak ada aktivitas selama 48 jam. Berikut lampiran transcript percakapan:`,
                    embeds: [embedLog],
                    files: [attachment],
                  });
                }
              } catch (dmErr) {
                console.log(
                  `Gagal DM user ${ticketData.ownerId}:`,
                  dmErr.message,
                );
              }

              // Hapus Data & Channel
              await db.delete(item.id);
              await channel.delete();
            } catch (err) {
              console.error("Error pada proses auto close ticket:", err);
            }
          }
        }
      }
    }, 300000); // Check interval 5 menit
  },
};
