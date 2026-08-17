const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("feedback-set")
    .setDescription("Set Channel & Template Ulasan Buyer (Admin Only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel tempat ulasan buyer dikirim")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("template")
        .setDescription("Nama ID template dari /embed")
        .setAutocomplete(true)
        .setRequired(true),
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const allKeys = await db.all();
    const choices = allKeys
      .filter(
        (item) => item.id && item.id.startsWith(`msg_${interaction.guildId}_`),
      )
      .map((item) => item.id.replace(`msg_${interaction.guildId}_`, ""));

    const filtered = choices
      .filter((choice) => choice.toLowerCase().includes(focusedValue))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((choice) => ({ name: choice, value: choice })),
    );
  },

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({ content: "❌ Khusus Admin.", flags: 64 });
    }

    const channel = interaction.options.getChannel("channel");
    const template = interaction.options.getString("template");
    const guildId = interaction.guildId;

    await db.set(`feedback_channel_${guildId}`, channel.id);
    await db.set(`feedback_template_${guildId}`, template);

    return interaction.reply({
      content: `✅ Channel ulasan diset ke <#${channel.id}> dengan template \`${template}\`!`,
      flags: 64,
    });
  },
};
