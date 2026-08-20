// src/utils/aiHandler.js
require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");
const db = require("./database");
const { getEmbedTemplate } = require("./featureEmbed");

const aiCooldowns = new Set();
let aiClient = null;

/**
 * Mengambil / Inisialisasi GoogleGenAI Instance secara Lazy
 */
function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY tidak ditemukan di file .env");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Memproses auto-reply Gemini AI di channel khusus AI
 * @param {import('discord.js').Message} message
 */
async function handleAIChat(message) {
  if (message.author.bot || !message.guild) return;

  const guildId = message.guild.id;
  const userId = message.author.id;
  const aiChannelId = db.get(`config_${guildId}.aiChannel`);

  // Hanya merespon di Channel AI yang sudah di-set
  if (!aiChannelId || message.channel.id !== aiChannelId) return;

  // 1. Cek Cooldown Anti-Spam (5 Detik)
  if (aiCooldowns.has(userId)) {
    return message
      .reply(
        "⏳ Mohon tunggu 5 detik sebelum mengajukan pertanyaan berikutnya.",
      )
      .then((msg) => setTimeout(() => msg.delete().catch(() => {}), 3000));
  }

  // 2. Cek Role Buyer & Limit Harian
  const buyerRoleId = db.get(`config_${guildId}.buyerRole`);
  const isBuyer = buyerRoleId && message.member.roles.cache.has(buyerRoleId);

  const today = new Date().toISOString().slice(0, 10);
  const limitKey = `ai_limit_${guildId}_${userId}_${today}`;
  let dailyCount = db.get(limitKey) || 0;

  // Member biasa dibatasi 15 pertanyaan / hari (Buyer = Unlimited)
  if (!isBuyer && dailyCount >= 15) {
    return message.reply(
      "❌ Kamu telah mencapai batas 15 pesan AI per hari. Dapatkan **Role Buyer** untuk akses Unlimited!",
    );
  }

  // Pasang Cooldown
  aiCooldowns.add(userId);
  setTimeout(() => aiCooldowns.delete(userId), 5000);

  // Kirim indikator mengetik
  await message.channel.sendTyping();

  try {
    const ai = getAIClient();

    // Panggil Model Gemini (gemini-2.5-flash)
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.content,
      config: {
        systemInstruction:
          "Kamu adalah asisten AI toko online Discord yang ramah, profesional, dan membantu.",
      },
    });

    const replyText =
      response.text || "Maaf, AI tidak dapat memproses jawaban saat ini.";

    // Update Kuota Harian jika bukan Buyer
    if (!isBuyer) {
      db.set(limitKey, dailyCount + 1);
    }

    // Siapkan Placeholders & Kirim Embed
    const placeholders = {
      "{user}": message.author.toString(),
      "{question}": message.content,
      "{ai_response}": replyText,
    };

    const embedPayload = await getEmbedTemplate(
      guildId,
      "ai_response",
      placeholders,
    );

    if (embedPayload) {
      await message.reply(embedPayload);
    } else {
      await message.reply(replyText);
    }
  } catch (error) {
    console.error("[AI Handler Error]:", error);
    await message.reply(
      "⚠️ Terjadi kesalahan saat menghubungkan ke Gemini AI.",
    );
  }
}

module.exports = { handleAIChat };
