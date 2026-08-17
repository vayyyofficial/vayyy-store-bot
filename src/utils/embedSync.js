const { EmbedBuilder } = require("discord.js");
const db = require("./database");
const { parsePlaceholders } = require("./placeholder");
const config = require("../config/config");

/**
 * Mengirim instance embed BARU dari template yang di-sync
 * @param {object} options
 * @param {import('discord.js').Guild} options.guild - Guild Discord
 * @param {import('discord.js').TextChannel} options.channel - Target Channel
 * @param {string} options.templateName - ID Template yang di-set di /embed
 * @param {object} options.data - Data dynamic untuk parse Placeholders
 */
async function sendSyncedEmbed({ guild, channel, templateName, data }) {
  if (!channel) throw new Error("Target channel tidak ditemukan.");

  // 1. Ambil data template dari database
  const template = await db.get(`msg_${guild.id}_${templateName}`);

  // 2. Jika template tidak ditemukan, gunakan fallback embed bawaan
  if (!template) {
    const fallbackEmbed = new EmbedBuilder()
      .setTitle(
        await parsePlaceholders(data?.title || "Notifikasi Sistem", data),
      )
      .setDescription(
        await parsePlaceholders(
          data?.description || "Transaksi/Aktivitas berhasil diproses.",
          data,
        ),
      )
      .setColor(config.embedColor || "#FAB502")
      .setTimestamp();

    return await channel.send({
      content: data?.content || null,
      embeds: [fallbackEmbed],
    });
  }

  // 3. Render isi template dengan parsePlaceholders
  const parsedTitle = await parsePlaceholders(template.title || "", data);
  const parsedDesc = await parsePlaceholders(template.description || "", data);
  const parsedContent = await parsePlaceholders(template.content || "", data);

  const embed = new EmbedBuilder().setColor(
    template.color || config.embedColor || "#FAB502",
  );

  if (parsedTitle) embed.setTitle(parsedTitle);
  if (parsedDesc) embed.setDescription(parsedDesc);
  if (template.image) embed.setImage(template.image);
  if (template.footer) embed.setFooter({ text: template.footer });

  // 4. Kirim sebagai PESAN BARU
  return await channel.send({
    content: parsedContent || null,
    embeds: [embed],
  });
}

module.exports = { sendSyncedEmbed };
