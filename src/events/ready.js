// src/events/ready.js
const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[✅] Bot berhasil login sebagai ${client.user.tag}!`);
    console.log(`[✅] Melayani ${client.guilds.cache.size} server.`);

    // Fungsi untuk meng-update status jam secara otomatis
    const updateStatus = () => {
      // Mengambil format jam & menit WIB (Asia/Jakarta)
      const timeString = new Date().toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Atur status STREAMING (Live) dengan placeholder Jam & Server
      client.user.setPresence({
        activities: [
          {
            name: `⏰ ${timeString} WIB`,
            type: ActivityType.Streaming,
            url: "https://www.twitch.tv/discord", // Wajib ada URL agar badge Live (Streaming) muncul
          },
        ],
        status: "online",
      });
    };

    updateStatus();

    setInterval(updateStatus, 60000);
  },
};
