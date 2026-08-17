const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const db = require("../utils/database");
const { sendFeatureEmbed } = require("../utils/featureEmbed");

// ID Role Seller Wajib
const SELLER_ROLE_ID = "1390635206050058311";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("testi")
    .setDescription("Sistem Testimoni Store")
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription(
          "Kirim / update testimoni transaksi baru (Khusus Seller)",
        )
        .addStringOption((opt) =>
          opt
            .setName("product")
            .setDescription("Nama produk")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("payment")
            .setDescription("Metode pembayaran")
            .setRequired(true),
        )
        .addNumberOption((opt) =>
          opt
            .setName("price")
            .setDescription("Harga mentah (Contoh: 15000)")
            .setRequired(true),
        )
        .addUserOption((opt) =>
          opt.setName("customer").setDescription("Pembeli").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set Channel & Template Testimoni (Admin Only)")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("Target channel log testimoni")
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
        .setName("show")
        .setDescription(
          "Munculkan pesan utama testimoni yang akan di-edit otomatis (Admin Only)",
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
        return interaction.reply({
          content: "❌ Akses ditolak! Khusus Admin.",
          flags: 64,
        });
      }

      const channel = interaction.options.getChannel("channel");
      const template = interaction.options.getString("template");

      const existingConfig = (await db.get(`config_testi_${guildId}`)) || {};

      await db.set(`config_testi_${guildId}`, {
        ...existingConfig,
        channelId: channel.id,
        template,
      });

      return interaction.reply({
        content: `✅ Testimoni diset ke channel <#${channel.id}> dengan template \`${template}\`!\nGunakan \`/testi show\` di channel tersebut untuk memunculkan pesan utama.`,
        flags: 64,
      });
    }

    // --- SUBCOMMAND: SHOW (ADMIN ONLY) ---
    if (sub === "show") {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({
          content: "❌ Akses ditolak! Khusus Admin.",
          flags: 64,
        });
      }

      const configTesti = await db.get(`config_testi_${guildId}`);
      if (!configTesti || !configTesti.channelId || !configTesti.template) {
        return interaction.reply({
          content: "⚠️ Konfigurasi testimoni belum diset via `/testi set`.",
          flags: 64,
        });
      }

      const targetChannel = await interaction.guild.channels
        .fetch(configTesti.channelId)
        .catch(() => null);

      if (!targetChannel) {
        return interaction.reply({
          content: "❌ Channel target testimoni tidak ditemukan.",
          flags: 64,
        });
      }

      // Kirim pesan pertama kali sebagai Embed Utama
      const sentMsg = await sendFeatureEmbed({
        guild: interaction.guild,
        channel: targetChannel,
        templateName: configTesti.template,
        data: { guild: interaction.guild, user: interaction.user },
      });

      if (sentMsg && sentMsg.id) {
        await db.set(`config_testi_${guildId}`, {
          ...configTesti,
          messageId: sentMsg.id,
        });
      }

      return interaction.reply({
        content: `✅ Embed utama testimoni berhasil ditampilkan di <#${configTesti.channelId}>! Setiap kali seller menjalankan \`/testi send\`, embed ini akan **otomatis di-edit**.`,
        flags: 64,
      });
    }

    // --- SUBCOMMAND: SEND (KHUSUS SELLER ROLE) ---
    if (sub === "send") {
      // 1. VALIDASI ROLE SELLER
      if (!interaction.member.roles.cache.has(SELLER_ROLE_ID)) {
        return interaction.reply({
          content: `❌ Akses ditolak! Kamu harus memiliki role <@&${SELLER_ROLE_ID}> untuk menjalankan perintah ini.`,
          flags: 64,
        });
      }

      const configTesti = await db.get(`config_testi_${guildId}`);
      if (!configTesti || !configTesti.channelId || !configTesti.template) {
        return interaction.reply({
          content: "⚠️ Konfigurasi testimoni belum diset via `/testi set`.",
          flags: 64,
        });
      }

      const product = interaction.options.getString("product");
      const payment = interaction.options.getString("payment");
      const rawPrice = interaction.options.getNumber("price");
      const price = Number(rawPrice) || 0;
      const customer = interaction.options.getUser("customer");

      // 2. UPDATE DATABASE LEADERBOARD (Object Map Format)
      let lbData = (await db.get(`leaderboard_testi_${guildId}`)) || {};
      if (Array.isArray(lbData)) {
        const newObj = {};
        for (const item of lbData) {
          if (item && item.id) {
            newObj[item.id] = {
              count: item.count || 0,
              totalAmount: item.spent || item.totalAmount || 0,
            };
          }
        }
        lbData = newObj;
      }

      if (!lbData[customer.id]) {
        lbData[customer.id] = { count: 0, totalAmount: 0 };
      }

      lbData[customer.id].count += 1;
      lbData[customer.id].totalAmount += price;
      await db.set(`leaderboard_testi_${guildId}`, lbData);

      // 3. GENERATE ID TESTIMONI
      const count = ((await db.get(`testi_count_${guildId}`)) || 0) + 1;
      await db.set(`testi_count_${guildId}`, count);
      const trxId = `TESTI-${count.toString().padStart(3, "0")}`;

      const dataPayload = {
        customer,
        user: customer,
        seller: interaction.user,
        product,
        service: product,
        price,
        payment,
        trx_id: trxId,
        transaction_id: trxId,
        order_id: trxId,
        guild: interaction.guild,
      };

      // 4. EDIT EMBED UTAMA TESTIMONI
      const targetChannel = await interaction.guild.channels
        .fetch(configTesti.channelId)
        .catch(() => null);

      if (targetChannel) {
        let testMsg = null;
        if (configTesti.messageId) {
          testMsg = await targetChannel.messages
            .fetch(configTesti.messageId)
            .catch(() => null);
        }

        if (testMsg) {
          // Edit pesan yang sudah ada
          await sendFeatureEmbed({
            guild: interaction.guild,
            channel: targetChannel,
            editMessage: testMsg,
            templateName: configTesti.template,
            data: dataPayload,
          });
        } else {
          // Jika pesan terhapus/belum ada, buat pesan baru dan simpan messageId-nya
          const newMsg = await sendFeatureEmbed({
            guild: interaction.guild,
            channel: targetChannel,
            templateName: configTesti.template,
            data: dataPayload,
          });
          if (newMsg) {
            await db.set(`config_testi_${guildId}`, {
              ...configTesti,
              messageId: newMsg.id,
            });
          }
        }
      }

      // 5. EDIT EMBED UTAMA LEADERBOARD
      const configLb = await db.get(`config_leaderboard_${guildId}`);
      if (configLb && configLb.channelId && configLb.template) {
        try {
          const lbChannel = await interaction.guild.channels
            .fetch(configLb.channelId)
            .catch(() => null);

          if (lbChannel && configLb.messageId) {
            const lbMessage = await lbChannel.messages
              .fetch(configLb.messageId)
              .catch(() => null);

            if (lbMessage) {
              await sendFeatureEmbed({
                guild: interaction.guild,
                channel: lbChannel,
                editMessage: lbMessage,
                templateName: configLb.template,
                data: {
                  guild: interaction.guild,
                  user: interaction.user,
                },
              });
            }
          }
        } catch (err) {
          console.error("[Testi] Gagal memperbarui embed leaderboard:", err);
        }
      }

      return interaction.reply({
        content: `✅ Transaksi **${trxId}** tercatat! Embed Testimoni & Leaderboard berhasil **di-edit secara otomatis**.`,
        flags: 64,
      });
    }
  },
};
