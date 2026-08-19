// src/utils/giveawayManager.js
const db = require("./database");
const { getEmbedTemplate } = require("./featureEmbed");

/**
 * Memilih pemenang secara acak dari array peserta
 */
function pickWinners(participants, count) {
  const shuffled = [...participants].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Menyelesaikan Giveaway & Mengumumkan Pemenang
 */
async function endGiveaway(client, giveawayId) {
  const gw = db.get(`giveaway_${giveawayId}`);
  if (!gw || gw.ended) return;

  try {
    const guild = await client.guilds.fetch(gw.guildId);
    const channel = await guild.channels.fetch(gw.channelId);
    const message = await channel.messages.fetch(gw.messageId);

    const winners = pickWinners(gw.participants, gw.winnerCount);
    const winnersMention =
      winners.length > 0
        ? winners.map((id) => `<@${id}>`).join(", ")
        : "Tidak ada peserta yang berpartisipasi.";

    gw.ended = true;
    gw.winners = winners;
    db.set(`giveaway_${giveawayId}`, gw);

    // Siapkan Placeholders
    const placeholders = {
      "{prize}": gw.prize,
      "{winners}": winnersMention,
      "{host}": `<@${gw.hostId}>`,
    };

    const embedPayload = await getEmbedTemplate(
      gw.guildId,
      "giveaway-end",
      placeholders,
    );

    if (embedPayload) {
      embedPayload.components = []; // Hapus tombol setelah selesai
      await message.edit(embedPayload);
    }

    if (winners.length > 0) {
      await channel.send(
        `🎉 Selamat kepada ${winnersMention}! Kamu memenangkan **${gw.prize}**!`,
      );
    } else {
      await channel.send(
        `📢 Giveaway **${gw.prize}** telah berakhir tanpa pemenang.`,
      );
    }
  } catch (err) {
    console.error("[Giveaway End Error]:", err);
  }
}

/**
 * Memeriksa giveaway yang expired saat bot baru menyala
 */
function initGiveawayChecker(client) {
  setInterval(() => {
    const allData = db.all();
    const now = Date.now();

    allData.forEach((item) => {
      if (item.id.startsWith("giveaway_")) {
        const gw = item.value;
        if (!gw.ended && gw.endTime <= now) {
          endGiveaway(client, gw.giveawayId);
        }
      }
    });
  }, 10000); // Cek tiap 10 detik
}

module.exports = { endGiveaway, initGiveawayChecker, pickWinners };
