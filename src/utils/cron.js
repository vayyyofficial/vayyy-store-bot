const cron = require("node-cron");
const db = require("./database");
const { EmbedBuilder } = require("discord.js");
const config = require("../config/config");

function initCronJobs(client) {
  // Menjalankan pengecekan setiap menit
  cron.schedule("* * * * *", async () => {
    const guilds = client.guilds.cache;

    // Konversi waktu saat ini secara tepat ke format HH:MM (WIB)
    const now = new Date();
    const timeWIB = now.toLocaleTimeString("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const currentTime = timeWIB.replace(".", ":");

    for (const [guildId] of guilds) {
      try {
        const openTime = await db.get(`store_schedule_${guildId}.open`);
        const closeTime = await db.get(`store_schedule_${guildId}.close`);
        const channelId = await db.get(`config_${guildId}.storeChannel`);

        if (!channelId) continue;

        const channel =
          client.channels.cache.get(channelId) ||
          (await client.channels.fetch(channelId).catch(() => null));
        if (!channel) continue;

        if (currentTime === openTime) {
          const embed = new EmbedBuilder()
            .setTitle("🟢 STORE IS NOW OPEN!")
            .setDescription(
              "Toko telah dibuka kembali. Silakan buat tiket / order untuk transaksi.",
            )
            .setColor(config.successColor || "#57F287")
            .setTimestamp();
          await channel.send({ embeds: [embed] });
        } else if (currentTime === closeTime) {
          const embed = new EmbedBuilder()
            .setTitle("🔴 STORE IS CLOSED")
            .setDescription(
              "Toko telah tutup. Transaksi baru akan diproses pada jam operasional besok.",
            )
            .setColor(config.errorColor || "#ED4245")
            .setTimestamp();
          await channel.send({ embeds: [embed] });
        }
      } catch (err) {
        console.error(`Error pada cron job guild ${guildId}:`, err);
      }
    }
  });
}

module.exports = { initCronJobs };
