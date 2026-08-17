const { EmbedBuilder } = require("discord.js");
const db = require("./database");

/**
 * Mengubah status toko (OPEN / CLOSE)
 * @param {Object} options
 * @param {import('discord.js').Guild} options.guild
 * @param {import('discord.js').TextChannel} options.channel
 * @param {'OPEN' | 'CLOSE'} options.status
 */
async function setStoreStatus({ guild, channel, status }) {
  const guildId = guild.id;
  const dbKeyMessage = `store_status_msg_${guildId}`;
  const dbKeyChannel = `store_status_channel_${guildId}`;

  // 1. Simpan / Update Channel ID status toko
  await db.set(dbKeyChannel, channel.id);

  // 2. Ambil ID pesan status sebelumnya & hapus jika ada
  const lastMsgId = await db.get(dbKeyMessage);
  if (lastMsgId) {
    try {
      const oldMsg = await channel.messages.fetch(lastMsgId).catch(() => null);
      if (oldMsg) {
        await oldMsg.delete().catch(() => {});
      }
    } catch (err) {
      console.error("Gagal menghapus pesan status lama:", err);
    }
  }

  // 3. Buat Tampilan Embed Baru
  const isOpen = status === "OPEN";
  const embed = new EmbedBuilder()
    .setTitle(
      isOpen ? "🟢 VAYYY STORE IS NOW OPEN!" : "🔴 VAYYY STORE IS NOW CLOSED!",
    )
    .setDescription(
      isOpen
        ? "Halo! Toko kami sudah **DIBUKA**. Silakan lakukan pemesanan atau cek menu yang tersedia!"
        : "Mohon maaf, toko kami saat ini **DITUTUP**. Pemesanan akan diproses pada jam operasional berikutnya.",
    )
    .setColor(isOpen ? "#57F287" : "#ED4245")
    .setTimestamp()
    .setFooter({
      text: "Vayyy Store • Status Toko",
      iconURL: guild.iconURL() || undefined,
    });

  // 4. Kirim Pesan Baru ke Channel
  const newMsg = await channel.send({ embeds: [embed] });

  // 5. Simpan ID Pesan Baru ke Database
  await db.set(dbKeyMessage, newMsg.id);

  return newMsg;
}

module.exports = { setStoreStatus };
