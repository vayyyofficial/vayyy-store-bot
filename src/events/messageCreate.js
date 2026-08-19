// src/events/messageCreate.js
const db = require("../utils/database");
const { handleAIChat } = require("../utils/aiHandler");
const { handleLeveling } = require("../utils/levelSystem");
const { getEmbedTemplate } = require("../utils/featureEmbed");

module.exports = {
  name: "messageCreate",
  async execute(message) {
    // Abaikan pesan dari bot atau pesan di luar guild (DM)
    if (!message.guild || message.author.bot) return;

    const guildId = message.guild.id;
    const guildConfig = db.get(`config_${guildId}`) || {};

    // -------------------------------------------------------------
    // 🚨 1. FITUR HONEYPOT TRAP (AUTO-KICK SPAMMER/BOT HACKED)
    // -------------------------------------------------------------
    if (
      guildConfig.honeypotChannel &&
      message.channel.id === guildConfig.honeypotChannel
    ) {
      try {
        // Hapus pesan pelanggar
        await message.delete().catch(() => {});

        // Kirim DM peringatan jika memungkinkan
        const placeholders = {
          "{user.name}": message.author.username,
          "{server.name}": message.guild.name,
        };
        const dmPayload = await getEmbedTemplate(
          guildId,
          "honeypot-kick-dm",
          placeholders,
        );

        if (dmPayload) {
          await message.author.send(dmPayload).catch(() => {});
        } else {
          await message.author
            .send(
              `⚠️ Kamu dikeluarkan otomatis dari **${message.guild.name}** karena mengetik di Channel Honeypot!`,
            )
            .catch(() => {});
        }

        // Kick user dari server
        const member = await message.guild.members.fetch(message.author.id);
        if (member && member.kickable) {
          await member.kick(
            "Honeypot Trap: Mengetik di channel terlarang (Terindikasi Bot/Hacked).",
          );
        }
        return; // Hentikan eksekusi script agar tidak dapat XP/dibalas AI
      } catch (err) {
        console.error("[Honeypot Trap Error]:", err);
      }
    }

    // -------------------------------------------------------------
    // 🤖 2. FITUR AI CHATBOT (AUTO REPLY DI CHANNEL AI)
    // -------------------------------------------------------------
    if (guildConfig.aiChannel && message.channel.id === guildConfig.aiChannel) {
      await handleAIChat(message);
      return;
    }

    // -------------------------------------------------------------
    // 📊 3. FITUR LEVELING SYSTEM (ARCANE STYLE)
    // -------------------------------------------------------------
    await handleLeveling(message);
  },
};
