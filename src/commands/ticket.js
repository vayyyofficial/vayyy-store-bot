// src/commands/ticket.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { moveTicketStatus, closeTicket } = require("../utils/ticketManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manajemen status dan penutupan tiket toko")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand((sub) =>
      sub
        .setName("proses")
        .setDescription(
          "Tandai tiket sedang diproses & pindahkan ke kategori proses",
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("order")
        .setDescription(
          "Ubah status tiket ke order & pindahkan ke kategori order",
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("done")
        .setDescription(
          "Selesaikan & tutup tiket (Kirim transcript ke DM & Log)",
        ),
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "proses") {
      await moveTicketStatus(interaction, "proses", "ticketCategoryProses");
    } else if (subcommand === "order") {
      await moveTicketStatus(interaction, "order", "ticketCategoryOrder");
    } else if (subcommand === "done") {
      await closeTicket(interaction);
    }
  },
};
