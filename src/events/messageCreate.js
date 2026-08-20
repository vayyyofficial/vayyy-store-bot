// src/events/messageCreate.js
const { Events, EmbedBuilder } = require("discord.js");
const db = require("../utils/database");
const { handleAIChat } = require("../utils/aiHandler");
const { handleLeveling } = require("../utils/levelSystem");
const { sendFeatureEmbed } = require("../utils/featureEmbed");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // 🛡️ Proteksi Utama: Abaikan jika pesan berasal dari bot (mencegah bot kick dirinya sendiri) atau DM
    if (!message.guild || message.author.bot) return;

    try {
      const guildId = message.guild.id;
      const guildConfig = (await db.get(`config_${guildId}`)) || {};

      // -------------------------------------------------------------
      // 🚨 1. FITUR HONEYPOT TRAP (AUTO-KICK SPAMMER/BOT HACKED)
      // -------------------------------------------------------------
      if (
        guildConfig.honeypotChannel &&
        message.channel.id === guildConfig.honeypotChannel
      ) {
        // Hapus pesan pelanggar
        await message.delete().catch(() => {});

        const member = await message.guild.members
          .fetch(message.author.id)
          .catch(() => null);

        // Abaikan jika member tidak ada atau bertindak sebagai Admin/Role lebih tinggi dari bot
        if (!member || !member.kickable) {
          console.log(
            `[Honeypot Trap] ${message.author.tag} memicu perangkap tapi tidak dapat di-kick (Admin/Role Tinggi).`,
          );
          return;
        }

        const placeholders = {
          "{user}": message.author.toString(),
          "{user.name}": message.author.username,
          "{user.id}": message.author.id,
          "{server.name}": message.guild.name,
        };

        // 1. Kirim DM Peringatan ke Akun Pelanggar (Template: honeypot-kick-dm)
        const dmSent = await sendFeatureEmbed({
          guild: message.guild,
          channel: message.author,
          templateName: "honeypot-kick-dm",
          data: placeholders,
        });

        if (!dmSent) {
          const fallbackEmbed = new EmbedBuilder()
            .setColor("#FF0000")
            .setTitle(`⚠️ Dikeluarkan dari ${message.guild.name}`)
            .setDescription(
              `Akun kamu terdeteksi mengirim pesan di channel terlarang (**Honeypot Channel**).\n\n` +
                `**Alasan:** Terindikasi spamming / akun terkena hack.`,
            )
            .setTimestamp();

          await message.author
            .send({ embeds: [fallbackEmbed] })
            .catch(() => {});
        }

        // 2. Kick Member dari Server
        await member.kick(
          "Honeypot Trap: Mengetik di channel terlarang (Terindikasi Bot/Hacked).",
        );

        // 3. Kirim Pesan Peringatan Sementara di Channel Honeypot (Template: honeypot-warning)
        const warningSent = await sendFeatureEmbed({
          guild: message.guild,
          channel: message.channel,
          templateName: "honeypot-warning",
          data: placeholders,
        });

        // Fallback jika template warning di channel belum dibuat
        if (!warningSent) {
          const channelWarning = await message.channel.send({
            content: `🚨 **${message.author.username}** telah di-kick otomatis karena mengetik di channel ini! (Channel Khusus Perangkap)`,
          });
          // Hapus pesan peringatan di channel setelah 10 detik agar channel tetap bersih
          setTimeout(() => channelWarning.delete().catch(() => {}), 10000);
        }

        console.log(
          `[Honeypot Trap] Berhasil meng-kick ${message.author.tag} dari ${message.guild.name}.`,
        );

        return;
      }

      // -------------------------------------------------------------
      // 🤖 2. FITUR AI CHATBOT
      // -------------------------------------------------------------
      if (
        guildConfig.aiChannel &&
        message.channel.id === guildConfig.aiChannel
      ) {
        await handleAIChat(message);
        return;
      }

      // -------------------------------------------------------------
      // 📊 3. FITUR LEVELING SYSTEM
      // -------------------------------------------------------------
      await handleLeveling(message);
    } catch (err) {
      console.error("[Event: messageCreate Error]:", err);
    }
  },
};
