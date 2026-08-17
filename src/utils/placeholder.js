const db = require("./database");
const config = require("../config/config");

/**
 * Helper membuat tampilan progress bar teks ulasan
 */
function createProgressBar(count, totalReviews) {
  if (!totalReviews || totalReviews === 0) return "░░░░░░░░░░ 0% (0)";
  const percentage = Math.round((count / totalReviews) * 100);
  const filledBlocks = Math.round(percentage / 10);
  const emptyBlocks = 10 - filledBlocks;
  return `${"▓".repeat(filledBlocks)}${"░".repeat(emptyBlocks)} ${percentage}% (${count})`;
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
 * Parser Placeholder Dinamis untuk Embed & Pesan Toko
 */
async function parsePlaceholders(text, data = {}) {
  if (!text || typeof text !== "string") return "";

  const guild = data.guild || null;

  // Customer / Buyer
  const user = data.user || data.customer || data.member?.user || null;
  const userId = user ? user.id : null;
  const userMentionStr = userId ? `<@${userId}>` : "@User";

  // Seller (User yang RUN Command / Admin / Staff)
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

  // Inisialisasi Variable Stats & Rating Toko
  let storeRating = "0.0";
  let totalReviews = 0;
  let stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  let totalTransaksi = 0;
  let totalNominal = 0;
  let totalBuyerCount = 0;
  let topBuyerTransaksiStr = "Belum Ada";
  let topBuyerNominalStr = "Belum Ada";

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

    const leaderboardData =
      (await db.get(`leaderboard_testi_${guild.id}`)) || {};
    let maxCount = 0;
    let maxCountUser = null;
    let maxAmount = 0;
    let maxAmountUser = null;

    for (const [uId, uData] of Object.entries(leaderboardData)) {
      const uCount = uData.count || 0;
      const uAmount = uData.totalAmount || 0;

      totalTransaksi += uCount;
      totalNominal += uAmount;

      if (uCount > maxCount) {
        maxCount = uCount;
        maxCountUser = uId;
      }
      if (uAmount > maxAmount) {
        maxAmount = uAmount;
        maxAmountUser = uId;
      }
    }

    if (maxCountUser)
      topBuyerTransaksiStr = `<@${maxCountUser}> (${maxCount} Order)`;
    if (maxAmountUser)
      topBuyerNominalStr = `<@${maxAmountUser}> (${formatRupiah(maxAmount)})`;
  }

  const starEmoji = config.customStarEmoji || "<:emoji_20:1509016228717531256>";
  const userRatingNum = Number(data.rating) || 5;
  const ratingStars = starEmoji.repeat(userRatingNum);

  // Daftar Seluruh Replacements Placeholder
  const replacements = {
    // --- PLACEHOLDER TRANSAKSI ---
    "{transaction_id}":
      data.transaction_id || data.order_id || data.trxId || "-",
    "{order_id}": data.order_id || data.transaction_id || data.trxId || "-",
    "{product}": data.product || data.service || data.layanan || "-",
    "{service}": data.service || data.product || data.layanan || "-",
    "{payment}": data.payment || data.metode || "-",
    "{price}": data.price ? formatRupiah(data.price) : "Rp 0",
    "{harga}": data.price ? formatRupiah(data.price) : "Rp 0",
    "{seller}": sellerMentionStr,

    // --- PLACEHOLDER BULAN & TAHUN ---
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

    // --- TRANSAKSI & LEADERBOARD STORE ---
    "{total_buyer}": totalBuyerCount.toString(),
    "{total_transaksi}": totalTransaksi.toString(),
    "{total_nominal}": formatRupiah(totalNominal),
    "{top_buyer_transaksi}": topBuyerTransaksiStr,
    "{top_buyer_nominal}": topBuyerNominalStr,

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

module.exports = { parsePlaceholders };
