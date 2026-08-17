const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("placeholder")
    .setDescription(
      "Menampilkan daftar semua tag/placeholder yang dapat digunakan pada template /embed",
    ),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("📋 DAFTAR PLACEHOLDER / TAG EMBED")
      .setDescription(
        "Berikut adalah tag dinamis yang bisa kamu sisipkan di template embed (`/embed`). Tag ini akan otomatis digantikan dengan data asli saat sistem berjalan.",
      )
      .setColor(config.embedColor || "#FAB502")
      .addFields(
        {
          name: "🌐 System & Server",
          value:
            "`{date}` — Tanggal hari ini\n" +
            "`{time}` — Waktu/jam saat ini\n" +
            "`{month}` — Bulan & tahun saat ini\n" +
            "`{guild_name}` — Nama server Discord\n" +
            "`{server_name}` — Nama server Discord\n" +
            "`{server_icon}` — URL ikon server Discord\n" +
            "`{member_count}` — Total jumlah member server",
        },
        {
          name: "👤 User Generic & Mention",
          value:
            "`{user}` — Mention pengguna (`@User`)\n" +
            "`{user_tag}` — Tag lengkap pengguna (`User#0000` / `username`)\n" +
            "`{user_name}` — Display name / Username pengguna\n" +
            "`{user_id}` — ID Discord pengguna\n" +
            "`{mention}` — Mention pengguna (`@User`)\n" +
            "`{avatar}` — URL foto profil pengguna\n" +
            "`{user_avatar}` — URL foto profil khusus user pemicu",
        },
        {
          name: "🛍️ Customer & Seller (Store)",
          value:
            "`{customer}` — Mention pembeli (`@Buyer`)\n" +
            "`{customer_user}` — Username pembeli\n" +
            "`{customer_id}` — ID Discord pembeli\n" +
            "`{seller}` — Mention penjual/admin (`@Seller`)\n" +
            "`{seller_user}` — Username penjual/admin\n" +
            "`{seller_id}` — ID Discord penjual/admin",
        },
        {
          name: "💳 Transaksi & Order",
          value:
            "`{transaction_id}` / `{order_id}` — ID unik transaksi/order\n" +
            "`{product}` — Nama produk yang dibeli\n" +
            "`{payment}` — Metode pembayaran yang digunakan\n" +
            "`{price}` — Harga transaksi (Format otomatis Rp)\n" +
            "`{estimate}` — Estimasi waktu pengerjaan",
        },
        {
          name: "⭐ Rating, Feedback & Store Summary",
          value:
            "**Stats Store Utama:**\n" +
            "`{store_rating}` — Rata-rata rating toko (Contoh: `4.8`)\n" +
            "`{total_reviews}` — Total akumulasi ulasan masuk (Contoh: `125`)\n\n" +
            "**Rating & Ulasan Buyer:**\n" +
            "`{rating}` / `{rating_stars}` — Emoji bintang buyer (`⭐⭐⭐⭐⭐`)\n" +
            "`{rating_num}` — Angka murni rating buyer (Contoh: `5`)\n" +
            "`{note}` / `{ulasan}` — Catatan atau ulasan dari pembeli\n\n" +
            "**Progress Bar Visual (Leaderboard):**\n" +
            "`{bar_star5}` — Bar visual bintang 5 (`▓▓▓▓▓▓▓▓▓░ 90% (112)`)\n" +
            "`{bar_star4}` — Bar visual bintang 4 (`▓░░░░░░░░░ 8% (10)`)\n" +
            "`{bar_star3}` — Bar visual bintang 3 (`░░░░░░░░░░ 2% (3)`)\n" +
            "`{bar_star2}` — Bar visual bintang 2 (`░░░░░░░░░░ 0% (0)`)\n" +
            "`{bar_star1}` — Bar visual bintang 1 (`░░░░░░░░░░ 0% (0)`)\n\n" +
            "**Detail Angka Total & Persentase Per Bintang:**\n" +
            "`{count_star5}` s/d `{count_star1}` — Total jumlah ulasan per bintang (Contoh: `112`)\n" +
            "`{percent_star5}` s/d `{percent_star1}` — Angka persentase per bintang (Contoh: `90%`)",
        },
        {
          name: "📊 General Store Statistics",
          value:
            "`{total_transaksi}` — Total akumulasi seluruh transaksi toko\n" +
            "`{total_nominal}` — Total akumulasi pemasukan toko (Rp)\n" +
            "`{top_buyer_transaksi}` — Top buyer berdasarkan frekuensi transaksi terbanyak\n" +
            "`{top_buyer_nominal}` — Top buyer berdasarkan total pengeluaran uang terbanyak",
        },
      )
      .setFooter({
        text: `Vayyy Store • Diperbarui`,
        iconURL: interaction.guild
          ? interaction.guild.iconURL({ forceStatic: false })
          : null,
      });

    return interaction.reply({ embeds: [embed], flags: 64 });
  },
};
