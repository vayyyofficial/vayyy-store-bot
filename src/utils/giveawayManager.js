// src/utils/giveawayManager.js
const db = require("./database");
const { sendFeatureEmbed } = require("./featureEmbed");
const { buildGiveawayPlaceholders } = require("./placeholder");

/**
 * Memilih pemenang secara acak dari array peserta
 */
function pickWinners(participants, count) {
  if (!Array.isArray(participants) || participants.length === 0) return [];
  const shuffled = [...participants].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, 10)); // Batas maksimum 10 pemenang
}

/**
 * Menyelesaikan Giveaway & Mengumumkan Pemenang
 */
async function endGiveaway(client, giveawayId) {
  const gw = await db.get(`giveaway_${giveawayId}`);
  if (!gw || gw.ended) return;

  gw.ended = true;
  await db.set(`giveaway_${giveawayId}`, gw);

  try {
    if (!client || !client.guilds) return;

    const guild = await client.guilds.fetch(gw.guildId).catch(() => null);
    if (!guild) return;

    const channel = await guild.channels.fetch(gw.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages
      .fetch(gw.messageId)
      .catch(() => null);

    const winners = pickWinners(gw.participants, gw.winnerCount);
    gw.winners = winners;
    await db.set(`giveaway_${giveawayId}`, gw);

    const placeholders = buildGiveawayPlaceholders(gw, winners);

    // Kustom/Template Embed untuk Giveaway End
    const hasCustomEndEmbed = await sendFeatureEmbed({
      guild: guild,
      channel: channel,
      templateName: "giveaway-end",
      data: placeholders,
    });

    // Fallback jika tidak ada template khusus /embed "giveaway-end"
    if (!hasCustomEndEmbed) {
      if (winners.length > 0) {
        await channel.send(
          `🎉 **GIVEAWAY SELESAI!**\n🎁 **Hadiah:** ${gw.prize}\n🏆 **Pemenang:** ${placeholders["{winners}"]}\n👑 **Host:** <@${gw.hostId}>`,
        );
      } else {
        await channel.send(
          `📢 Giveaway **${gw.prize}** telah berakhir tanpa pemenang.`,
        );
      }
    }

    // Matikan tombol partisipasi di pesan lama
    if (message && message.components && message.components.length > 0) {
      const row = message.components[0];
      row.components.forEach((btn) => (btn.data.disabled = true));
      await message.edit({ components: [row] }).catch(() => {});
    }
  } catch (err) {
    console.error("[Giveaway End Error]:", err);
  }
}

/**
 * Memeriksa giveaway yang expired secara berkala
 */
function initGiveawayChecker(client) {
  setInterval(async () => {
    try {
      const allData = await db.all();
      if (!Array.isArray(allData)) return;

      const now = Date.now();

      for (const item of allData) {
        if (item && item.id && item.id.startsWith("giveaway_")) {
          const gw = item.value;
          if (gw && !gw.ended && gw.endTime <= now) {
            await endGiveaway(
              client,
              gw.giveawayId || item.id.replace("giveaway_", ""),
            );
          }
        }
      }
    } catch (err) {
      console.error("[Giveaway Checker Error]:", err);
    }
  }, 10000);
}

module.exports = {
  endGiveaway,
  initGiveawayChecker,
  pickWinners,
};
