const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset")
    .setDescription("Reset penomoran ID transaksi/order store (Admin Only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("id")
        .setDescription("Reset ID konter spesifik (Order / Testimoni)")
        .addStringOption((opt) =>
          opt
            .setName("tipe")
            .setDescription("Pilih ID yang ingin di-reset")
            .setRequired(true)
            .addChoices(
              { name: "Order ID (order_count)", value: "order" },
              {
                name: "Testimoni / Transaction ID (testi_count)",
                value: "testi",
              },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("all")
        .setDescription("Reset SEMUA penomoran ID (Order & Testi sekaligus)"),
    ),

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "❌ Khusus Administrator!",
        flags: 64,
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // --- 1. SUBCOMMAND: RESET ID SPESIFIK ---
    if (sub === "id") {
      const tipe = interaction.options.getString("tipe");
      const idName = tipe === "order" ? "Order ID" : "Transaction/Testi ID";

      // Buat Tombol Konfirmasi
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_reset_id")
          .setLabel(`Ya, Reset ${idName}`)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel_reset_id")
          .setLabel("Batal")
          .setStyle(ButtonStyle.Secondary),
      );

      const response = await interaction.reply({
        content: `⚠️ **KONFIRMASI RESET ${idName.toUpperCase()}**\nApakah kamu yakin ingin mereset penomoran **${idName}** kembali ke \`0\`?`,
        components: [confirmRow],
        flags: 64,
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
      });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) {
          return btn.reply({ content: "❌ Akses ditolak.", flags: 64 });
        }

        if (btn.customId === "confirm_reset_id") {
          if (tipe === "order") {
            await db.set(`order_count_${guildId}`, 0);
            await btn.update({
              content:
                "🔄 **Order ID** berhasil di-reset! Transaksi berikutnya akan dimulai dari **ORD-001**.",
              components: [],
            });
          } else if (tipe === "testi") {
            await db.set(`testi_count_${guildId}`, 0);
            await btn.update({
              content:
                "🔄 **Transaction/Testi ID** berhasil di-reset! Testimoni berikutnya akan dimulai dari **TESTI-001**.",
              components: [],
            });
          }
        } else {
          await btn.update({
            content: `❌ Proses reset ${idName} dibatalkan.`,
            components: [],
          });
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
          interaction
            .editReply({
              content: "⏰ Waktu konfirmasi habis. Reset dibatalkan.",
              components: [],
            })
            .catch(() => {});
        }
      });
    }

    // --- 2. SUBCOMMAND: RESET ALL ---
    if (sub === "all") {
      // Buat Tombol Konfirmasi Reset All
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_reset_all")
          .setLabel("Ya, Reset Semua ID")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel_reset_all")
          .setLabel("Batal")
          .setStyle(ButtonStyle.Secondary),
      );

      const response = await interaction.reply({
        content: `⚠️ **KONFIRMASI RESET SEMUA ID**\nApakah kamu yakin ingin mereset **SEMUA penomoran ID** (Order & Testimoni) kembali ke \`0\`?`,
        components: [confirmRow],
        flags: 64,
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000,
      });

      collector.on("collect", async (btn) => {
        if (btn.user.id !== interaction.user.id) {
          return btn.reply({ content: "❌ Akses ditolak.", flags: 64 });
        }

        if (btn.customId === "confirm_reset_all") {
          await db.set(`order_count_${guildId}`, 0);
          await db.set(`testi_count_${guildId}`, 0);

          await btn.update({
            content:
              "🔄 **SEMUA Penomoran ID** (Order & Testimoni) telah di-reset ke `0`! Transaksi berikutnya akan dimulai dari `001`.",
            components: [],
          });
        } else {
          await btn.update({
            content: "❌ Proses reset semua ID dibatalkan.",
            components: [],
          });
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
          interaction
            .editReply({
              content: "⏰ Waktu konfirmasi habis. Reset dibatalkan.",
              components: [],
            })
            .catch(() => {});
        }
      });
    }
  },
};
