const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../utils/database");
const { startSchedule } = require("../utils/scheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Kelola jadwal pengiriman embed otomatis (Admin Only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Tambah jadwal pengiriman pesan otomatis")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Channel tujuan embed")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("template")
            .setDescription("Nama ID template embed")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("interval")
            .setDescription(
              "Interval pengiriman dalam Menit (cth: 60 untuk 1 jam)",
            )
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Lihat semua daftar pengiriman terjadwal"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Hapus jadwal pengiriman otomatis")
        .addStringOption((opt) =>
          opt
            .setName("id")
            .setDescription("ID Jadwal yang ingin dihapus")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value.toLowerCase();
    const guildId = interaction.guildId;

    if (focusedOption.name === "template") {
      const allKeys = await db.all();
      const choices = allKeys
        .filter((item) => item.id && item.id.startsWith(`msg_${guildId}_`))
        .map((item) => item.id.replace(`msg_${guildId}_`, ""));
      const filtered = choices
        .filter((c) => c.toLowerCase().includes(focusedValue))
        .slice(0, 25);
      return interaction.respond(filtered.map((c) => ({ name: c, value: c })));
    }

    if (focusedOption.name === "id") {
      const schedules = (await db.get(`schedules_${guildId}`)) || [];
      const filtered = schedules
        .filter((s) => s.id.toLowerCase().includes(focusedValue))
        .slice(0, 25);
      return interaction.respond(
        filtered.map((s) => ({
          name: `ID: ${s.id} | Template: ${s.template} (${s.interval} menit)`,
          value: s.id,
        })),
      );
    }
  },

  async execute(interaction) {
    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({ content: "❌ Khusus Admin.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (sub === "add") {
      const channel = interaction.options.getChannel("channel");
      const template = interaction.options.getString("template");
      const interval = interaction.options.getInteger("interval");

      // Cek apakah template ada
      const templateData = await db.get(`msg_${guildId}_${template}`);
      if (!templateData) {
        return interaction.reply({
          content: `❌ Template \`${template}\` tidak ditemukan!`,
          flags: 64,
        });
      }

      const scheduleId = `sched_${Date.now().toString().slice(-6)}`;
      const newSchedule = {
        id: scheduleId,
        channelId: channel.id,
        template,
        interval, // Dalam menit
        createdAt: Date.now(),
      };

      let schedules = (await db.get(`schedules_${guildId}`)) || [];
      schedules.push(newSchedule);
      await db.set(`schedules_${guildId}`, schedules);

      // Jalankan task scheduler secara instant di background
      startSchedule(interaction.client, guildId, newSchedule);

      return interaction.reply({
        content: `✅ Jadwal berhasil dibuat!\n• **ID**: \`${scheduleId}\`\n• **Channel**: <#${channel.id}>\n• **Template**: \`${template}\`\n• **Interval**: Setiap \`${interval}\` menit`,
        flags: 64,
      });
    }

    if (sub === "list") {
      const schedules = (await db.get(`schedules_${guildId}`)) || [];
      if (schedules.length === 0) {
        return interaction.reply({
          content: "❌ Belum ada jadwal pengiriman otomatis yang aktif.",
          flags: 64,
        });
      }

      const listText = schedules
        .map(
          (s, i) =>
            `**${i + 1}. ID:** \`${s.id}\` | <#${s.channelId}> | Template: \`${s.template}\` | Interval: \`${s.interval}m\``,
        )
        .join("\n");

      return interaction.reply({
        content: `📅 **DAFTAR JADWAL EMBED AKTIF**\n\n${listText}`,
        flags: 64,
      });
    }

    if (sub === "remove") {
      const id = interaction.options.getString("id");
      let schedules = (await db.get(`schedules_${guildId}`)) || [];
      const updated = schedules.filter((s) => s.id !== id);

      if (schedules.length === updated.length) {
        return interaction.reply({
          content: `❌ Jadwal dengan ID \`${id}\` tidak ditemukan!`,
          flags: 64,
        });
      }

      await db.set(`schedules_${guildId}`, updated);
      return interaction.reply({
        content: `✅ Jadwal dengan ID \`${id}\` berhasil dihapus! (Restart bot untuk menghentikan timer aktif jika perlu)`,
        flags: 64,
      });
    }
  },
};
