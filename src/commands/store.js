const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../utils/database");
const { sendFeatureEmbed } = require("../utils/featureEmbed");

// Object untuk menyimpan interval scheduler di memory
if (!global.storeSchedulers) {
  global.storeSchedulers = {};
}

/**
 * Fungsi untuk mengeksekusi pengiriman status toko dengan sistem 1 pesan tunggal
 */
async function triggerStoreStatus(guild, state, isScheduled = false) {
  const guildId = guild.id;
  const configStore = await db.get(`config_store_${guildId}`);

  if (
    !configStore ||
    !configStore.channelId ||
    !configStore.templates ||
    !configStore.templates[state]
  ) {
    return { success: false, reason: "CONFIG_NOT_SET" };
  }

  // --- CEK JIKA DI-TRIGGER OLEH SCHEDULER: Jangan kirim ulang jika status saat ini sudah sama ---
  if (isScheduled) {
    const currentState = await db.get(`store_current_state_${guildId}`);
    if (currentState === state) {
      return { success: false, reason: "ALREADY_IN_THIS_STATE" };
    }
  }

  const targetChannel = await guild.channels
    .fetch(configStore.channelId)
    .catch(() => null);
  if (!targetChannel) return { success: false, reason: "CHANNEL_NOT_FOUND" };

  // --- HAPUS PESAN STATUS SEBELUMNYA (JIKA ADA) ---
  const lastMsgKey = `last_store_msg_id_${guildId}`;
  const lastMsgId = await db.get(lastMsgKey);

  if (lastMsgId) {
    try {
      const oldMsg = await targetChannel.messages
        .fetch(lastMsgId)
        .catch(() => null);
      if (oldMsg) {
        await oldMsg.delete().catch(() => {});
      }
    } catch (err) {
      console.error("Gagal menghapus pesan status store lama:", err);
    }
  }

  // Kirim Embed Status Baru
  const sentMsg = await sendFeatureEmbed({
    guild,
    channel: targetChannel,
    templateName: configStore.templates[state],
    data: { guild },
  });

  if (!sentMsg) return { success: false, reason: "SEND_FAILED" };

  // Simpan ID pesan status terbaru & catat status aktif saat ini
  await db.set(lastMsgKey, sentMsg.id);
  await db.set(`store_current_state_${guildId}`, state);

  return { success: true, channelId: targetChannel.id };
}

/**
 * Fungsi untuk mendaftarkan / memperbarui pengecekan jadwal (Interval per 30 Detik)
 */
function setupGuildScheduler(client, guildId, scheduleConfig) {
  if (global.storeSchedulers[guildId]) {
    clearInterval(global.storeSchedulers[guildId]);
  }

  if (
    !scheduleConfig ||
    (!scheduleConfig.openTime && !scheduleConfig.closeTime)
  )
    return;

  global.storeSchedulers[guildId] = setInterval(async () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const currentTimeStr = `${hours}:${minutes}`;

    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return;

    // Cek Jadwal Open
    if (scheduleConfig.openTime === currentTimeStr) {
      await triggerStoreStatus(guild, "open", true);
    }

    // Cek Jadwal Close
    if (scheduleConfig.closeTime === currentTimeStr) {
      await triggerStoreStatus(guild, "close", true);
    }
  }, 30000);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("store")
    .setDescription("Sistem Status Operasional Store")
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("Ubah status operasional toko secara manual")
        .addStringOption((opt) =>
          opt
            .setName("state")
            .setDescription("Pilih status toko")
            .setRequired(true)
            .addChoices(
              { name: "Open (Toko Buka)", value: "open" },
              { name: "Close (Toko Tutup)", value: "close" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("schedule")
        .setDescription("Atur jadwal otomatis status toko (Admin Only)")
        .addStringOption((opt) =>
          opt
            .setName("state")
            .setDescription("Pilih status yang ingin dijadwalkan")
            .setRequired(true)
            .addChoices(
              { name: "Open Schedule", value: "open" },
              { name: "Close Schedule", value: "close" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("time")
            .setDescription(
              "Jam eksekusi format HH:MM (Contoh: 06:00 atau 22:00)",
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set Channel & Template Status Store (Admin Only)")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Target channel pengumuman store")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("state")
            .setDescription("Pilih status yang ingin di-set template-nya")
            .setRequired(true)
            .addChoices(
              { name: "Open Template", value: "open" },
              { name: "Close Template", value: "close" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("template")
            .setDescription("Nama ID template dari /embed")
            .setAutocomplete(true)
            .setRequired(true),
        ),
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
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    // --- SUBCOMMAND: SET (ADMIN ONLY) ---
    if (sub === "set") {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({ content: "❌ Khusus Admin.", flags: 64 });
      }

      const channel = interaction.options.getChannel("channel");
      const state = interaction.options.getString("state");
      const template = interaction.options.getString("template");

      let cfg = (await db.get(`config_store_${guildId}`)) || { templates: {} };
      cfg.channelId = channel.id;
      if (!cfg.templates) cfg.templates = {};
      cfg.templates[state] = template;

      await db.set(`config_store_${guildId}`, cfg);
      return interaction.reply({
        content: `✅ Template store status **${state.toUpperCase()}** diset ke \`${template}\` di <#${channel.id}>!`,
        flags: 64,
      });
    }

    // --- SUBCOMMAND: SCHEDULE (ADMIN ONLY) ---
    if (sub === "schedule") {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({ content: "❌ Khusus Admin.", flags: 64 });
      }

      const state = interaction.options.getString("state");
      const timeInput = interaction.options.getString("time").trim();

      // Validasi Format HH:MM
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(timeInput)) {
        return interaction.reply({
          content:
            "❌ Format jam salah! Gunakan format HH:MM (Contoh: `06:00` atau `21:30`).",
          flags: 64,
        });
      }

      let scheduleCfg = (await db.get(`schedule_store_${guildId}`)) || {};
      if (state === "open") scheduleCfg.openTime = timeInput;
      if (state === "close") scheduleCfg.closeTime = timeInput;

      await db.set(`schedule_store_${guildId}`, scheduleCfg);

      // Jalankan Runner Scheduler
      setupGuildScheduler(interaction.client, guildId, scheduleCfg);

      return interaction.reply({
        content: `⏰ Jadwal otomatis **[${state.toUpperCase()}]** diset ke jam **${timeInput}**.\n*Pesan status terdahulu akan otomatis dihapus saat pesan baru dikirim.*`,
        flags: 64,
      });
    }

    // --- SUBCOMMAND: STATUS (MANUAL) ---
    if (sub === "status") {
      // Tahan respon agar tidak timeout 3 detik
      try {
        await interaction.deferReply({ flags: 64 });
      } catch (e) {
        if (e.code === 10062) return;
      }

      const state = interaction.options.getString("state");
      const result = await triggerStoreStatus(interaction.guild, state, false);

      if (!result.success) {
        if (result.reason === "CONFIG_NOT_SET") {
          return interaction.editReply({
            content: `⚠️ Template store untuk status \`${state}\` belum diset via \`/store set\`.`,
          });
        }
        return interaction.editReply({
          content: "❌ Gagal mengirim pengumuman status toko.",
        });
      }

      return interaction.editReply({
        content: `✅ Pengumuman toko **[${state.toUpperCase()}]** berhasil dikirim ke <#${result.channelId}>! (Pesan lama telah dibersihkan)`,
      });
    }
  },
};
