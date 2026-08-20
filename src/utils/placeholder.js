// src/utils/placeholder.js
const db = require("./database");
const config = require("../config/config");

/**
 * Helper membuat tampilan progress bar teks ulasan toko
 */
function createProgressBar(count, totalReviews) {
  if (!totalReviews || totalReviews === 0) return "░░░░░░░░░░ 0% (0)";
  const percentage = Math.round((count / totalReviews) * 100);
  const filledBlocks = Math.round(percentage / 10);
  const emptyBlocks = 10 - filledBlocks;
  return `${"▓".repeat(filledBlocks)}${"░".repeat(emptyBlocks)} ${percentage}% (${count})`;
}

/**
 * Helper membuat progress bar visual untuk Leveling System
 */
function generateProgressBar(currentXp = 0, requiredXp = 100, size = 10) {
  if (requiredXp <= 0) requiredXp = 100;
  const percentage = Math.min(Math.max(currentXp / requiredXp, 0), 1);
  const progress = Math.round(size * percentage);
  const emptyProgress = size - progress;

  const progressText = "🟩".repeat(progress);
  const emptyProgressText = "⬛".repeat(emptyProgress);
  const percentageText = Math.round(percentage * 100) + "%";

  return `[${progressText}${emptyProgressText}] ${percentageText}`;
}

/**
 * Format angka ke mata uang Rupiah
 */
function formatRupiah(number) {
  if (typeof number === "string") {
    if (number.includes("Rp") || isNaN(Number(number))) return number;
    number = Number(number);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number || 0);
}

/**
 * Membangun objek Placeholders khusus untuk Giveaway
 */
function buildGiveawayPlaceholders(gw, winners = []) {
  const participants = Array.isArray(gw.participants) ? gw.participants : [];
  const winnersList = Array.isArray(winners) ? winners : [];

  const winnersMention =
    winnersList.length > 0
      ? winnersList.map((id) => `<@${id}>`).join(", ")
      : "Tidak ada pemenang.";

  const participantListMention =
    participants.length > 0
      ? participants.map((id) => `<@${id}>`).join(", ")
      : "Belum ada peserta.";

  const placeholders = {
    "{prize}": gw.prize || "Tanpa Hadiah",
    "{hadiah}": gw.prize || "Tanpa Hadiah",
    "{winners_count}": (gw.winnerCount || 1).toString(),
    "{end_time}": `<t:${Math.floor((gw.endTime || Date.now()) / 1000)}:R>`,
    "{end_date}": `<t:${Math.floor((gw.endTime || Date.now()) / 1000)}:F>`,
    "{host}": `<@${gw.hostId}>`,
    "{participant_count}": participants.length.toString(),
    "{participant_list}": participantListMention,
    "{winners}": winnersMention,
    "{winners_mention}": winnersMention,
  };

  for (let i = 1; i <= 10; i++) {
    const winnerId = winnersList[i - 1];
    placeholders[`{winner${i}}`] = winnerId ? `<@${winnerId}>` : "N/A";
  }

  return placeholders;
}

/**
 * Parser Placeholder Dinamis untuk Seluruh Fitur Bot
 */
async function parsePlaceholders(text, data = {}) {
  if (!text || typeof text !== "string") return "";

  const guild = data.guild || null;

  // Customer / User Utama
  const user = data.user || data.customer || data.member?.user || null;
  const userId = user ? user.id : null;
  const userMentionStr = userId ? `<@${userId}>` : "@User";

  // Seller / Admin Exec
  const seller = data.seller || data.executor || null;
  const sellerId = seller
    ? typeof seller === "string"
      ? seller
      : seller.id
    : null;
  const sellerMentionStr = sellerId
    ? `<@${sellerId}>`
    : data.seller_name || "@Seller";

  // --- LOGIKA WAKTU, BULAN & TAHUN ---
  const now = new Date();

  const monthNamesId = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const monthShortId = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ];
  const monthNamesEn = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthShortEn = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const currentMonthIndex = now.getMonth();
  const currentMonthId = monthNamesId[currentMonthIndex];
  const currentMonthShortId = monthShortId[currentMonthIndex];
  const currentMonthEn = monthNamesEn[currentMonthIndex];
  const currentMonthShortEn = monthShortEn[currentMonthIndex];

  const currentMonthNum = (currentMonthIndex + 1).toString().padStart(2, "0");
  const currentDay = now.getDate().toString().padStart(2, "0");
  const currentYear = now.getFullYear().toString();
  const currentYearShort = currentYear.slice(-2);

  const currentDateFull = `${currentDay} ${currentMonthId} ${currentYear}`;

  const unixTimestamp = Math.floor(now.getTime() / 1000);
  const discordTimestampShort = `<t:${unixTimestamp}:f>`;
  const discordTimestampRelative = `<t:${unixTimestamp}:R>`;

  // Inisialisasi Variable Leveling & Store Data
  let storeRating = "0.0";
  let totalReviews = 0;
  let stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let totalTransaksi = 0;
  let totalNominal = 0;
  let totalBuyerCount = 0;
  let topLevelStr = "Belum Ada";

  if (guild) {
    const buyerRoleId =
      (await db.get(`buyer_role_${guild.id}`)) ||
      (config.roles && config.roles.buyer) ||
      config.buyerRoleId;

    if (buyerRoleId) {
      const buyerRole = guild.roles.cache.get(buyerRoleId);
      if (buyerRole) totalBuyerCount = buyerRole.members.size;
    }

    const dbStats = await db.get(`feedback_stats_${guild.id}`);
    if (dbStats) stats = dbStats;

    totalReviews =
      (stats[1] || 0) +
      (stats[2] || 0) +
      (stats[3] || 0) +
      (stats[4] || 0) +
      (stats[5] || 0);

    if (totalReviews > 0) {
      const totalPoints =
        (stats[5] || 0) * 5 +
        (stats[4] || 0) * 4 +
        (stats[3] || 0) * 3 +
        (stats[2] || 0) * 2 +
        (stats[1] || 0) * 1;
      storeRating = (totalPoints / totalReviews).toFixed(1);
    }

    // Ambil User dengan Level Tertinggi ({top_level})
    const allDbData = (await db.all()) || [];
    const levelPrefix = `level_${guild.id}_`;

    const topUserObj = allDbData
      .filter((entry) => entry.id.startsWith(levelPrefix))
      .map((entry) => ({
        userId: entry.id.replace(levelPrefix, ""),
        level: entry.value.level || 1,
        xp: entry.value.xp || 0,
      }))
      .sort((a, b) => b.level - a.level || b.xp - a.xp)[0];

    if (topUserObj) {
      topLevelStr = `<@${topUserObj.userId}> (Level ${topUserObj.level})`;
    }
  }

  // Parameter Leveling Individual User
  const userLevel = data.level || 1;
  const userXp = data.xp || 0;
  const userXpNeeded = data.xp_needed || userLevel * 100;
  const userProgressBar =
    data.progressbar || generateProgressBar(userXp, userXpNeeded);

  const starEmoji = config.customStarEmoji || "<:emoji_20:1509016228717531256>";
  const userRatingNum = Number(data.rating) || 5;
  const ratingStars = starEmoji.repeat(userRatingNum);

  // Daftar Seluruh Replacements Placeholder
  const replacements = {
    // --- LEVELING SYSTEM ---
    "{level}": userLevel.toString(),
    "{xp}": userXp.toString(),
    "{xp_needed}": userXpNeeded.toString(),
    "{progressbar}": userProgressBar,
    "{top_level}": topLevelStr,

    // --- TRANSAKSI ---
    "{transaction_id}":
      data.transaction_id || data.order_id || data.trxId || "-",
    "{order_id}": data.order_id || data.transaction_id || data.trxId || "-",
    "{product}": data.product || data.service || data.layanan || "-",
    "{service}": data.service || data.product || data.layanan || "-",
    "{payment}": data.payment || data.metode || "-",
    "{price}": data.price ? formatRupiah(data.price) : "Rp 0",
    "{harga}": data.price ? formatRupiah(data.price) : "Rp 0",
    "{seller}": sellerMentionStr,

    // --- BULAN & TAHUN ---
    "{bulan}": currentMonthId,
    "{month}": currentMonthId,
    "{bulan_singkat}": currentMonthShortId,
    "{month_short}": currentMonthShortEn,
    "{month_en}": currentMonthEn,
    "{month_num}": currentMonthNum,

    "{tahun}": currentYear,
    "{year}": currentYear,
    "{year_short}": currentYearShort,

    "{day}": currentDay,
    "{hari}": currentDay,
    "{date}": currentDateFull,
    "{tanggal}": currentDateFull,
    "{timestamp}": discordTimestampShort,
    "{timestamp_relative}": discordTimestampRelative,

    // --- USER MENTION ---
    "{user}": userMentionStr,
    "{user_mention}": userMentionStr,
    "{customer}": userMentionStr,
    "{customer_mention}": userMentionStr,
    "{user_tag}": user ? user.tag : "User#0000",
    "{user_name}": user ? user.username : "User",
    "{user_id}": userId || "000000000000000000",
    "{user_avatar}": user ? user.displayAvatarURL({ forceStatic: false }) : "",

    // --- SERVER & STORE DATA ---
    "{server_name}": guild ? guild.name : "Server Toko",
    "{guild_name}": guild ? guild.name : "Server Toko",
    "{server_icon}": guild ? guild.iconURL({ forceStatic: false }) || "" : "",
    "{member_count}": guild ? guild.memberCount.toString() : "0",

    // --- TRANSAKSI & STORE ---
    "{total_buyer}": totalBuyerCount.toString(),
    "{total_transaksi}": totalTransaksi.toString(),
    "{total_nominal}": formatRupiah(totalNominal),

    // --- RATING SUMMARY & PROGRESS BAR ---
    "{store_rating}": storeRating,
    "{total_reviews}": totalReviews.toString(),
    "{bar_star5}": createProgressBar(stats[5] || 0, totalReviews),
    "{bar_star4}": createProgressBar(stats[4] || 0, totalReviews),
    "{bar_star3}": createProgressBar(stats[3] || 0, totalReviews),
    "{bar_star2}": createProgressBar(stats[2] || 0, totalReviews),
    "{bar_star1}": createProgressBar(stats[1] || 0, totalReviews),

    // --- COUNT RATING INDIVIDUAL ---
    "{count_star5}": (stats[5] || 0).toString(),
    "{count_star4}": (stats[4] || 0).toString(),
    "{count_star3}": (stats[3] || 0).toString(),
    "{count_star2}": (stats[2] || 0).toString(),
    "{count_star1}": (stats[1] || 0).toString(),

    // --- PERCENT RATING INDIVIDUAL ---
    "{percent_star5}": totalReviews
      ? `${Math.round(((stats[5] || 0) / totalReviews) * 100)}%`
      : "0%",
    "{percent_star4}": totalReviews
      ? `${Math.round(((stats[4] || 0) / totalReviews) * 100)}%`
      : "0%",
    "{percent_star3}": totalReviews
      ? `${Math.round(((stats[3] || 0) / totalReviews) * 100)}%`
      : "0%",
    "{percent_star2}": totalReviews
      ? `${Math.round(((stats[2] || 0) / totalReviews) * 100)}%`
      : "0%",
    "{percent_star1}": totalReviews
      ? `${Math.round(((stats[1] || 0) / totalReviews) * 100)}%`
      : "0%",

    // --- ULASAN INDIVIDUAL ---
    "{rating}": ratingStars,
    "{rating_stars}": ratingStars,
    "{rating_num}": userRatingNum.toString(),
    "{ulasan}": data.ulasan || data.note || "No Reason",
    "{note}": data.note || data.ulasan || "No Reason",
  };

  let parsedText = text;
  for (const [placeholder, value] of Object.entries(replacements)) {
    parsedText = parsedText.split(placeholder).join(value);
  }

  return parsedText;
}

module.exports = {
  parsePlaceholders,
  buildGiveawayPlaceholders,
  createProgressBar,
  generateProgressBar,
  formatRupiah,
};
