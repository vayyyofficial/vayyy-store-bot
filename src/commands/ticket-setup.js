// src/commands/ticket-setup.js
const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-setup")
    .setDescription("Panel Pengaturan Tiket (Khusus Server Owner)"),

  async execute(interaction) {
    // Validasi Khusus Server Owner
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        content: "❌ Perintah ini hanya dapat digunakan oleh **Server Owner**!",
        flags: 64,
      });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("ticket_setup_menu")
      .setPlaceholder("⚙️ Pilih Opsi Konfigurasi Tiket...")
      .addOptions([
        {
          label: "Set Categories ID",
          description: "Atur ID Kategori untuk Order, Ask, Other, dan Proses",
          value: "setup_categories",
          emoji: "📁",
        },
        {
          label: "Set Roles (CS & Worker)",
          description: "Atur Role Customer Service dan Role Worker",
          value: "setup_roles",
          emoji: "👥",
        },
        {
          label: "Set Logs Channel",
          description: "Atur Channel Private untuk Menyimpan Transcript",
          value: "setup_logs",
          emoji: "📜",
        },
        {
          label: "Send Panel Ticket",
          description: "Kirim Panel Tiket dengan Dropdown ke Channel Ini",
          value: "send_panel",
          emoji: "📩",
        },
        {
          label: "Reset Counter ID",
          description: "Reset Urutan Nomor Tiket (All atau Satuan)",
          value: "reset_counter",
          emoji: "🔄",
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
      content:
        "🛠️ **PANEL KONFIGURASI TIKET (KHUSUS OWNER)**\nSilakan pilih menu di bawah untuk melakukan pengaturan:",
      components: [row],
      flags: 64,
    });
  },
};
