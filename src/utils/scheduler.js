const db = require("./database");
const { sendFeatureEmbed } = require("./featureEmbed");

function initScheduler(client) {
  // Pengecekan rutin setiap 60 detik
  setInterval(async () => {
    try {
      const now = new Date();
      const timeWIB = now.toLocaleTimeString("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      const currentTime = timeWIB.replace(".", ":");

      const allKeys = await db.all();
      const scheduleKeys = allKeys.filter(
        (item) => item.id && item.id.startsWith("schedules_"),
      );

      for (const item of scheduleKeys) {
        const guildId = item.id.replace("schedules_", "");
        const guild = await client.guilds.fetch(guildId).catch(() => null);
        if (!guild) continue;

        let schedules = item.value || [];
        let updated = false;

        for (let i = 0; i < schedules.length; i++) {
          const sched = schedules[i];

          if (sched.time === currentTime) {
            try {
              const channel = await guild.channels
                .fetch(sched.channelId)
                .catch(() => null);
              if (!channel) continue;

              let oldMsg = null;
              if (sched.lastMessageId) {
                oldMsg = await channel.messages
                  .fetch(sched.lastMessageId)
                  .catch(() => null);
              }

              const newMsg = await sendFeatureEmbed({
                guild,
                channel,
                templateName: sched.template,
                targetMessage: oldMsg,
                data: { guild },
              });

              if (newMsg) {
                schedules[i].lastMessageId = newMsg.id;
                updated = true;
              }
            } catch (err) {
              console.error(`Error executing schedule ${sched.id}:`, err);
            }
          }
        }

        if (updated) {
          await db.set(`schedules_${guildId}`, schedules);
        }
      }
    } catch (err) {
      console.error("Scheduler Loop Error:", err);
    }
  }, 60000);
}

module.exports = { initScheduler };
