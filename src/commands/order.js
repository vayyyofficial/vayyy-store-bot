const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");
const { parsePlaceholders } = require("../utils/placeholder");
const config = require("../config/config");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("order")
    .setDescription("Sistem Transaksi Order Store")
    .addSubcommand((sub) =>
      sub
        .setName("proses")
        .setDescription("Buat transaksi order baru (Process)")
        .addUserOption((opt) =>
          opt
            .setName("customer")
            .setDescription("Target pembeli")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("product")
            .setDescription("Nama produk/layanan")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("estimate")
            .setDescription("Estimasi pengerjaan")
            .setRequired(true)
            .addChoices(
              { name: "< 1 Jam", value: "Kurang dari 1 Jam" },
              { name: "1 - 4 Jam", value: "1-4 Jam" },
              { name: "4 - 8 Jam", value: "4-8 Jam" },
              { name: "8 - 12 Jam", value: "8-12 Jam" },
              { name: "< 1 Hari", value: "Kurang dari 1 Hari" },
              { name: "> 1 Hari", value: "Lebih dari 1 Hari" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("done")
        .setDescription("Selesaikan transaksi order (Edit Pesan Aktif)")
        .addStringOption((opt) =>
          opt
            .setName("order_id")
            .setDescription("Pilih Order ID")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("cancel")
        .setDescription("Batalkan transaksi order (Edit Pesan Aktif)")
        .addStringOption((opt) =>
          opt
            .setName("order_id")
            .setDescription("Pilih Order ID")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )
    .addSubcommandGroup((group) =>
      group
        .setName("set")
        .setDescription("Pengaturan Channel & Template Order (Admin Only)")
        .addSubcommand((sub) =>
          sub
            .setName("channel")
            .setDescription("Set Channel target Log Order")
            .addChannelOption((opt) =>
              opt
                .setName("target")
                .setDescription("Channel log order")
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          sub
            .setName("template")
            .setDescription("Set Template untuk status Order")
            .addStringOption((opt) =>
              opt
                .setName("status")
                .setDescription("Pilih status order")
                .setRequired(true)
                .addChoices(
                  { name: "Process", value: "process" },
                  { name: "Done", value: "done" },
                  { name: "Cancel", value: "cancel" },
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
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value.toLowerCase();
    const allKeys = await db.all();

    if (focusedOption.name === "template") {
      const choices = allKeys
        .filter(
          (item) =>
            item.id && item.id.startsWith(`msg_${interaction.guildId}_`),
        )
        .map((item) => item.id.replace(`msg_${interaction.guildId}_`, ""));
      const filtered = choices
        .filter((c) => c.toLowerCase().includes(focusedValue))
        .slice(0, 25);
      return await interaction.respond(
        filtered.map((c) => ({ name: c, value: c })),
      );
    }

    if (focusedOption.name === "order_id") {
      const activeOrders = allKeys
        .filter(
          (item) =>
            item.id &&
            item.id.startsWith(`active_order_${interaction.guildId}_`),
        )
        .map((item) => item.value);

      const filtered = activeOrders
        .filter(
          (ord) =>
            ord.order_id.toLowerCase().includes(focusedValue) ||
            ord.customer_tag.toLowerCase().includes(focusedValue),
        )
        .slice(0, 25);

      return await interaction.respond(
        filtered.map((ord) => ({
          name: `${ord.order_id} - ${ord.product} (${ord.customer_tag})`,
          value: ord.order_id,
        })),
      );
    }
  },

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const sub = interaction.options.getSubcommand();

    // 🟢 1. SETUP COMMANDS (/order set channel & /order set template)
    if (group === "set") {
      if (
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
      ) {
        return interaction.reply({
          content: "❌ Khusus Administrator.",
          flags: 64,
        });
      }

      let cfg = (await db.get(`config_order_${interaction.guildId}`)) || {
        templates: {},
      };

      if (sub === "channel") {
        const targetChannel = interaction.options.getChannel("target");
        cfg.channelId = targetChannel.id;
        await db.set(`config_order_${interaction.guildId}`, cfg);
        return interaction.reply({
          content: `✅ Channel log order diset ke <#${targetChannel.id}>!`,
          flags: 64,
        });
      }

      if (sub === "template") {
        const status = interaction.options.getString("status");
        const template = interaction.options.getString("template");
        if (!cfg.templates) cfg.templates = {};
        cfg.templates[status] = template;
        await db.set(`config_order_${interaction.guildId}`, cfg);
        return interaction.reply({
          content: `✅ Template status **${status.toUpperCase()}** diset ke \`${template}\`!`,
          flags: 64,
        });
      }
    }

    const configOrder = await db.get(`config_order_${interaction.guildId}`);
    if (!configOrder || !configOrder.channelId) {
      return interaction.reply({
        content:
          "⚠️ Konfigurasi channel order belum diset. Gunakan `/order set channel`.",
        flags: 64,
      });
    }

    const targetChannel = await interaction.guild.channels
      .fetch(configOrder.channelId)
      .catch(() => null);
    if (!targetChannel) {
      return interaction.reply({
        content: "❌ Channel log order tidak ditemukan!",
        flags: 64,
      });
    }

    // Helper untuk merender payload dari template embed
    const renderPayload = async (templateName, dataPayload) => {
      const templateData = await db.get(
        `msg_${interaction.guildId}_${templateName}`,
      );
      if (!templateData) return null;

      let payload = {};
      if (templateData.type === "text") {
        payload.content = await parsePlaceholders(
          templateData.description,
          dataPayload,
        );
      } else {
        const parsedContent = await parsePlaceholders(
          templateData.content,
          dataPayload,
        );
        const parsedTitle = await parsePlaceholders(
          templateData.title,
          dataPayload,
        );
        const parsedDesc = await parsePlaceholders(
          templateData.description,
          dataPayload,
        );
        const parsedFooter = await parsePlaceholders(
          templateData.footer || "{date}",
          dataPayload,
        );

        const embed = new EmbedBuilder().setColor(config.embedColor);
        if (parsedTitle) embed.setTitle(parsedTitle);
        if (parsedDesc) embed.setDescription(parsedDesc);
        if (templateData.avatar) embed.setThumbnail(templateData.avatar);
        if (templateData.image) embed.setImage(templateData.image);
        if (parsedFooter) embed.setFooter({ text: parsedFooter });

        payload.content = parsedContent || null;
        payload.embeds = [embed];
      }
      return payload;
    };

    // 🔵 2. SUBCOMMAND PROSES
    if (sub === "proses") {
      const customer = interaction.options.getUser("customer");
      const product = interaction.options.getString("product");
      const estimate = interaction.options.getString("estimate");

      const count =
        ((await db.get(`order_count_${interaction.guildId}`)) || 0) + 1;
      await db.set(`order_count_${interaction.guildId}`, count);
      const orderId = `ORD-${count.toString().padStart(3, "0")}`;

      const templateName = configOrder.templates
        ? configOrder.templates["process"]
        : null;
      if (!templateName) {
        return interaction.reply({
          content:
            "⚠️ Template untuk status `process` belum diset via `/order set template`.",
          flags: 64,
        });
      }

      const dataPayload = {
        customer,
        seller: interaction.user,
        product,
        estimate,
        order_id: orderId,
        guild: interaction.guild,
      };
      const payload = await renderPayload(templateName, dataPayload);

      if (!payload) {
        return interaction.reply({
          content: `❌ Template \`${templateName}\` tidak ditemukan di database!`,
          flags: 64,
        });
      }

      // Kirim pesan ke channel log order
      const sentMsg = await targetChannel.send(payload);

      // Simpan detail order beserta messageId ke database
      const orderData = {
        order_id: orderId,
        customer_id: customer.id,
        customer_tag: customer.username,
        seller_id: interaction.user.id,
        product,
        estimate,
        message_id: sentMsg.id,
        channel_id: targetChannel.id,
      };

      await db.set(`active_order_${interaction.guildId}_${orderId}`, orderData);

      return interaction.reply({
        content: `✅ Order **${orderId}** berhasil dibuat & dikirim ke <#${targetChannel.id}>!`,
        flags: 64,
      });
    }

    // 🟠 3. SUBCOMMAND DONE & CANCEL (EDIT PESAN LAMA)
    if (sub === "done" || sub === "cancel") {
      const orderId = interaction.options.getString("order_id");
      const orderData = await db.get(
        `active_order_${interaction.guildId}_${orderId}`,
      );

      if (!orderData) {
        return interaction.reply({
          content: `❌ Order ID \`${orderId}\` tidak ditemukan atau sudah selesai!`,
          flags: 64,
        });
      }

      const templateName = configOrder.templates
        ? configOrder.templates[sub]
        : null;
      if (!templateName) {
        return interaction.reply({
          content: `⚠️ Template untuk status \`${sub}\` belum diset via \`/order set template\`.`,
          flags: 64,
        });
      }

      const customer = await interaction.client.users
        .fetch(orderData.customer_id)
        .catch(() => null);
      const seller = await interaction.client.users
        .fetch(orderData.seller_id)
        .catch(() => null);

      const dataPayload = {
        customer: customer || {
          id: orderData.customer_id,
          username: orderData.customer_tag,
        },
        seller: seller || interaction.user,
        product: orderData.product,
        estimate: orderData.estimate,
        order_id: orderId,
        guild: interaction.guild,
      };

      const payload = await renderPayload(templateName, dataPayload);
      if (!payload) {
        return interaction.reply({
          content: `❌ Template \`${templateName}\` tidak ditemukan!`,
          flags: 64,
        });
      }

      // Cari pesan fisik di Discord dan EDIT pesan tersebut
      let edited = false;
      try {
        const msgChannel = await interaction.guild.channels.fetch(
          orderData.channel_id,
        );
        const targetMsg = await msgChannel.messages.fetch(orderData.message_id);
        if (targetMsg) {
          await targetMsg.edit(payload);
          edited = true;
        }
      } catch (err) {
        edited = false;
      }

      // Hapus order dari daftar aktif
      await db.delete(`active_order_${interaction.guildId}_${orderId}`);

      if (edited) {
        return interaction.reply({
          content: `✅ Pesan fisik Order **${orderId}** berhasil di-edit menjadi status **[${sub.toUpperCase()}]**!`,
          flags: 64,
        });
      } else {
        // Jika pesan fisik terhapus, kirim pesan baru sebagai bukti
        await targetChannel.send(payload);
        return interaction.reply({
          content: `⚠️ Pesan awal terhapus. Pesan status **[${sub.toUpperCase()}]** untuk **${orderId}** dikirim sebagai pesan baru!`,
          flags: 64,
        });
      }
    }
  },
};
