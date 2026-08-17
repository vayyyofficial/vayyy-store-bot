const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const db = require("../utils/database");
const { sendFeatureEmbed } = require("../utils/featureEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Sistem Papan Leaderboard & Rating Store")
    .addSubcommand((sub) =>
      sub
        .setName("show")
        .setDescription("Tampilkan pesan gabungan leaderboard & rating store"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set Channel & Template Leaderboard (Admin Only)")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Target channel leaderboard")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("template")
            .setDescription("Nama ID template dari /embed")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("reset")
        .setDescription(
          "Reset seluruh data transaksi & statistik rating toko (Admin Only)",
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

    // --- SUBCOMMAND: SET ---
    if (sub === "set") {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({ content: "❌ Khusus Admin.", flags: 64 });
      }

      const channel = interaction.options.getChannel("channel");
      const template = interaction.options.getString("template");

      const existingConfig =
        (await db.get(`config_leaderboard_${guildId}`)) || {};

      await db.set(`config_leaderboard_${guildId}`, {
        ...existingConfig,
        channelId: channel.id,
        template: template,
      });

      return interaction.reply({
        content: `✅ Leaderboard & Rating Store diset ke channel <#${channel.id}> menggunakan template \`${template}\`!\nGunakan \`/leaderboard show\` untuk memunculkan pesannya.`,
        flags: 64,
      });
    }

    // --- SUBCOMMAND: SHOW ---
    if (sub === "show") {
      const configLb = await db.get(`config_leaderboard_${guildId}`);
      if (!configLb || !configLb.channelId || !configLb.template) {
        return interaction.reply({
          content:
            "⚠️ Konfigurasi leaderboard belum diset. Gunakan `/leaderboard set` terlebih dahulu.",
          flags: 64,
        });
      }

      const targetChannel = await interaction.guild.channels
        .fetch(configLb.channelId)
        .catch(() => null);

      if (!targetChannel) {
        return interaction.reply({
          content:
            "❌ Channel target leaderboard tidak ditemukan atau telah dihapus.",
          flags: 64,
        });
      }

      // Kirim embed leaderboard pertama kali & simpan message ID-nya
      const sentMsg = await sendFeatureEmbed({
        guild: interaction.guild,
        channel: targetChannel,
        templateName: configLb.template,
        data: { guild: interaction.guild, user: interaction.user },
      });

      if (sentMsg && sentMsg.id) {
        await db.set(`config_leaderboard_${guildId}`, {
          ...configLb,
          messageId: sentMsg.id,
        });
      }

      return interaction.reply({
        content: `✅ Papan Leaderboard berhasil ditampilkan di <#${configLb.channelId}> dan akan **otomatis ter-edit** setiap ada transaksi / ulasan baru!`,
        flags: 64,
      });
    }

    // --- SUBCOMMAND: RESET ---
    if (sub === "reset") {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({ content: "❌ Khusus Admin.", flags: 64 });
      }

      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_reset_lb")
          .setLabel("Ya, Reset Semua Data")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("cancel_reset_lb")
          .setLabel("Batal")
          .setStyle(ButtonStyle.Secondary),
      );

      const response = await interaction.reply({
        content: `⚠️ **KONFIRMASI RESET LEADERBOARD & RATING**\nApakah kamu yakin ingin menghapus seluruh data transaksi, nominal buyer, serta akumulasi rating toko? Action ini **tidak dapat dibatalkan**!`,
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

        if (btn.customId === "confirm_reset_lb") {
          // 1. Reset data transaksi & nominal
          await db.delete(`leaderboard_testi_${guildId}`);
          await db.delete(`testi_count_${guildId}`);

          // 2. Reset statistik rating (bintang 1-5)
          const defaultStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          await db.set(`feedback_stats_${guildId}`, defaultStats);

          // 3. Auto-edit pesan leaderboard jika sudah aktif
          const configLb = await db.get(`config_leaderboard_${guildId}`);
          if (
            configLb &&
            configLb.channelId &&
            configLb.template &&
            configLb.messageId
          ) {
            try {
              const lbChannel = await interaction.guild.channels
                .fetch(configLb.channelId)
                .catch(() => null);

              if (lbChannel) {
                const lbMessage = await lbChannel.messages
                  .fetch(configLb.messageId)
                  .catch(() => null);

                if (lbMessage) {
                  await sendFeatureEmbed({
                    guild: interaction.guild,
                    channel: lbChannel,
                    editMessage: lbMessage,
                    templateName: configLb.template,
                    data: { guild: interaction.guild, user: interaction.user },
                  });
                } else {
                  // Jika pesan sudah terhapus di Discord (Error 10008), bersihkan messageId di database
                  console.warn(
                    `[Leaderboard Reset] Pesan ID ${configLb.messageId} tidak ditemukan. Menghapus messageId usang dari DB.`,
                  );
                  delete configLb.messageId;
                  await db.set(`config_leaderboard_${guildId}`, configLb);
                }
              }
            } catch (e) {
              console.error("Gagal memperbarui leaderboard setelah reset:", e);
            }
          }

          await btn.update({
            content:
              "🔄 **Berhasil Reset!** Seluruh data transaksi, Top Buyer, dan rating toko telah dikosongkan.",
            components: [],
          });
        } else {
          await btn.update({
            content: "❌ Proses reset leaderboard dibatalkan.",
            components: [],
          });
        }
      });

      collector.on("end", (collected, reason) => {
        if (reason === "time" && collected.size === 0) {
          interaction
            .editReply({
              content: "⏰ Waktu konfirmasi habis.",
              components: [],
            })
            .catch(() => {});
        }
      });
    }
  },
};
