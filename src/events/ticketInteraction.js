// src/events/ticketInteraction.js
const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const db = require("../utils/database");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    const guildId = interaction.guild?.id;
    if (!guildId) return;

    // ==========================================
    // 1. MANAGE SETUP MENU (KHUSUS OWNER)
    // ==========================================
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "ticket_setup_menu"
    ) {
      if (interaction.user.id !== interaction.guild.ownerId) {
        return interaction.reply({
          content: "❌ Khusus Server Owner!",
          flags: 64,
        });
      }

      const value = interaction.values[0];

      // A. Setup Category ID (Modal Input ID)
      if (value === "setup_categories") {
        const modal = new ModalBuilder()
          .setCustomId("modal_setup_categories")
          .setTitle("Set Category IDs");

        const orderInput = new TextInputBuilder()
          .setCustomId("cat_order")
          .setLabel("ID Kategori Order")
          .setPlaceholder("Paste Category ID Order")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const askInput = new TextInputBuilder()
          .setCustomId("cat_ask")
          .setLabel("ID Kategori Ask")
          .setPlaceholder("Paste Category ID Ask")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const otherInput = new TextInputBuilder()
          .setCustomId("cat_other")
          .setLabel("ID Kategori Other")
          .setPlaceholder("Paste Category ID Other")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const prosesInput = new TextInputBuilder()
          .setCustomId("cat_proses")
          .setLabel("ID Kategori Proses")
          .setPlaceholder("Paste Category ID Proses")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(orderInput),
          new ActionRowBuilder().addComponents(askInput),
          new ActionRowBuilder().addComponents(otherInput),
          new ActionRowBuilder().addComponents(prosesInput),
        );

        return await interaction.showModal(modal);
      }

      // B. Setup Roles (Modal Input ID Role CS & Worker)
      if (value === "setup_roles") {
        const modal = new ModalBuilder()
          .setCustomId("modal_setup_roles")
          .setTitle("Set Role CS & Worker");

        const csInput = new TextInputBuilder()
          .setCustomId("role_cs")
          .setLabel("ID Role Customer Service (CS)")
          .setPlaceholder("Paste Role ID CS")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const workerInput = new TextInputBuilder()
          .setCustomId("role_worker")
          .setLabel("ID Role Worker")
          .setPlaceholder("Paste Role ID Worker")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(csInput),
          new ActionRowBuilder().addComponents(workerInput),
        );

        return await interaction.showModal(modal);
      }

      // C. Setup Logs Channel (Modal Input ID Channel Logs)
      if (value === "setup_logs") {
        const modal = new ModalBuilder()
          .setCustomId("modal_setup_logs")
          .setTitle("Set Logs Transcript Channel");

        const logsInput = new TextInputBuilder()
          .setCustomId("channel_logs")
          .setLabel("ID Channel Transcript Logs (Private)")
          .setPlaceholder("Paste Channel ID Logs")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(logsInput));
        return await interaction.showModal(modal);
      }

      // D. Send Panel Ticket (Meminta Nama Template Embed dari /embed)
      if (value === "send_panel") {
        const modal = new ModalBuilder()
          .setCustomId("modal_setup_panel_template")
          .setTitle("Send Panel Ticket via Template");

        const templateInput = new TextInputBuilder()
          .setCustomId("embed_template_name")
          .setLabel("Nama Template Embed")
          .setPlaceholder("Contoh: panel-ticket")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(templateInput),
        );
        return await interaction.showModal(modal);
      }

      // E. Reset Counter ID Menu
      if (value === "reset_counter") {
        const selectReset = new StringSelectMenuBuilder()
          .setCustomId("select_reset_target")
          .setPlaceholder("⚠️ Pilih Nomor ID Tiket yang Ingin Direset...")
          .addOptions([
            { label: "Reset Semua Tiket (ALL)", value: "all" },
            { label: "Reset Counter Order", value: "order" },
            { label: "Reset Counter Ask", value: "ask" },
            { label: "Reset Counter Other", value: "other" },
          ]);

        return await interaction.reply({
          content: "Silakan pilih ID yang akan direset ke `0000`:",
          components: [new ActionRowBuilder().addComponents(selectReset)],
          flags: 64,
        });
      }
    }

    // ==========================================
    // 2. MODAL SUBMIT HANDLER
    // ==========================================
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "modal_setup_categories") {
        await db.set(
          `ticket_cat_order_${guildId}`,
          interaction.fields.getTextInputValue("cat_order"),
        );
        await db.set(
          `ticket_cat_ask_${guildId}`,
          interaction.fields.getTextInputValue("cat_ask"),
        );
        await db.set(
          `ticket_cat_other_${guildId}`,
          interaction.fields.getTextInputValue("cat_other"),
        );
        await db.set(
          `ticket_cat_proses_${guildId}`,
          interaction.fields.getTextInputValue("cat_proses"),
        );
        return interaction.reply({
          content: "✅ ID Kategori berhasil disimpan!",
          flags: 64,
        });
      }

      if (interaction.customId === "modal_setup_roles") {
        await db.set(
          `ticket_role_cs_${guildId}`,
          interaction.fields.getTextInputValue("role_cs"),
        );
        await db.set(
          `ticket_role_worker_${guildId}`,
          interaction.fields.getTextInputValue("role_worker"),
        );
        return interaction.reply({
          content: "✅ ID Role CS & Worker berhasil disimpan!",
          flags: 64,
        });
      }

      if (interaction.customId === "modal_setup_logs") {
        await db.set(
          `ticket_logs_channel_${guildId}`,
          interaction.fields.getTextInputValue("channel_logs"),
        );
        return interaction.reply({
          content: "✅ Channel Logs Transcript berhasil disimpan!",
          flags: 64,
        });
      }

      // Handle Submit Nama Template Embed untuk Send Panel Ticket
      if (interaction.customId === "modal_setup_panel_template") {
        const templateName = interaction.fields
          .getTextInputValue("embed_template_name")
          .toLowerCase()
          .trim();

        // Ambil data template embed dari database sesuai format key /embed kamu
        const savedData = await db.get(`msg_${guildId}_${templateName}`);

        if (!savedData) {
          return interaction.reply({
            content: `❌ Template embed dengan nama \`${templateName}\` tidak ditemukan! Buat template terlebih dahulu via \`/embed\`.`,
            flags: 64,
          });
        }

        // Rakit kembali objek EmbedBuilder dari data template /embed
        const embed = new EmbedBuilder();

        if (savedData.title) embed.setTitle(savedData.title);
        if (savedData.description) embed.setDescription(savedData.description);
        if (savedData.color) embed.setColor(savedData.color);
        if (savedData.image) embed.setImage(savedData.image);
        if (savedData.footer) embed.setFooter({ text: savedData.footer });

        if (savedData.authorName) {
          embed.setAuthor({
            name: savedData.authorName,
            iconURL: savedData.authorIcon || undefined,
          });
        }

        // Buat Dropdown Tiket Bawaan
        const ticketDropdown = new StringSelectMenuBuilder()
          .setCustomId("user_ticket_create")
          .setPlaceholder("📩 Pilih Kategori Tiket untuk Bantuan...")
          .addOptions([
            {
              label: "Order / Beli",
              value: "order",
              emoji: "🛒",
              description: "Buka tiket untuk order produk/layanan",
            },
            {
              label: "Ask / Bertanya",
              value: "ask",
              emoji: "❓",
              description: "Buka tiket untuk bertanya seputar produk",
            },
            {
              label: "Other / Lainnya",
              value: "other",
              emoji: "🌀",
              description: "Buka tiket untuk kendala atau keperluan lain",
            },
          ]);

        const row = new ActionRowBuilder().addComponents(ticketDropdown);

        // Kirim Embed Template + Dropdown ke Channel
        await interaction.channel.send({
          content: savedData.content || null,
          embeds: [embed],
          components: [row],
        });

        return interaction.reply({
          content: `✅ Panel Tiket menggunakan template \`${templateName}\` berhasil dikirim ke channel ini!`,
          flags: 64,
        });
      }

      // Handle Submit Form Kuesioner Pembuatan Tiket oleh Customer
      if (interaction.customId.startsWith("modal_ticket_form_")) {
        const type = interaction.customId.replace("modal_ticket_form_", "");
        const judul = interaction.fields.getTextInputValue("input_judul");
        const deskripsi =
          interaction.fields.getTextInputValue("input_deskripsi");
        const info =
          interaction.fields.getTextInputValue("input_info") || "Tidak ada";

        await interaction.deferReply({ flags: 64 });

        // Hitung Auto Increment ID Nomor
        const currentCount =
          ((await db.get(`ticket_counter_${guildId}_${type}`)) || 0) + 1;
        await db.set(`ticket_counter_${guildId}_${type}`, currentCount);
        const formattedNum = String(currentCount).padStart(4, "0");

        const channelName = `${type}-${interaction.user.username}-${formattedNum}`;
        const catId = await db.get(`ticket_cat_${type}_${guildId}`);
        const csRoleId = await db.get(`ticket_role_cs_${guildId}`);
        const workerRoleId = await db.get(`ticket_role_worker_${guildId}`);

        // Setup Permission Channel Tiket
        const permissionOverwrites = [
          { id: guildId, deny: [PermissionFlagsBits.ViewChannel] },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ];

        if (csRoleId)
          permissionOverwrites.push({
            id: csRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          });
        if (workerRoleId)
          permissionOverwrites.push({
            id: workerRoleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
            ],
          });

        // Buat Channel Tiket Baru
        const ticketChannel = await interaction.guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: catId || null,
          permissionOverwrites,
        });

        // Simpan metadata tiket di database
        await db.set(`ticket_data_${ticketChannel.id}`, {
          ownerId: interaction.user.id,
          type: type,
          number: formattedNum,
          lastActivity: Date.now(),
          warned12h: false,
          warned24h: false,
        });

        // Embed Hasil Kuesioner Tiket Pertama
        const ticketEmbed = new EmbedBuilder()
          .setTitle(
            `<:Ticket:1524643794455101483> Ticket ${type.toUpperCase()} (#${formattedNum})`,
          )
          .addFields(
            { name: "`📌` Title", value: judul },
            { name: "`📝` Description", value: deskripsi },
            { name: "`ℹ️` Notes", value: info },
            { name: "`👤` Created by", value: `<@${interaction.user.id}>` },
          )
          .setColor("#FAB502")
          .setTimestamp();

        let pings = `<@${interaction.user.id}>`;
        if (csRoleId) pings += ` <@&${csRoleId}>`;
        if (workerRoleId) pings += ` <@&${workerRoleId}>`;

        await ticketChannel.send({ content: pings, embeds: [ticketEmbed] });

        return interaction.editReply({
          content: `✅ Tiket Anda berhasil dibuat di ${ticketChannel}!`,
        });
      }
    }

    // ==========================================
    // 3. SELECTION MENU HANDLER
    // ==========================================
    if (interaction.isStringSelectMenu()) {
      // Menu Verifikasi Reset ID
      if (interaction.customId === "select_reset_target") {
        const target = interaction.values[0];
        const btnRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`confirm_reset_${target}`)
            .setLabel("Ya, Reset")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel_reset")
            .setLabel("Batal")
            .setStyle(ButtonStyle.Secondary),
        );

        return interaction.reply({
          content: `⚠️ **Konfirmasi:** Apakah Anda yakin ingin mereset counter nomor tiket \`${target.toUpperCase()}\`?`,
          components: [btnRow],
          flags: 64,
        });
      }

      // Customer Memilih Jenis Tiket di Dropdown Panel Utama
      if (interaction.customId === "user_ticket_create") {
        const type = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`modal_ticket_form_${type}`)
          .setTitle(`Form Tiket ${type.toUpperCase()}`);

        const judulInput = new TextInputBuilder()
          .setCustomId("input_judul")
          .setLabel("Judul Kebutuhan")
          .setPlaceholder("Masukkan judul singkat kebutuhan Anda")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const deskripsiInput = new TextInputBuilder()
          .setCustomId("input_deskripsi")
          .setLabel("Deskripsi Detail")
          .setPlaceholder("Jelaskan secara rinci kebutuhan Anda")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const infoInput = new TextInputBuilder()
          .setCustomId("input_info")
          .setLabel("Informasi Tambahan (Optional)")
          .setPlaceholder("Tambahkan info pendukung jika ada")
          .setStyle(TextInputStyle.Short)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(judulInput),
          new ActionRowBuilder().addComponents(deskripsiInput),
          new ActionRowBuilder().addComponents(infoInput),
        );

        return await interaction.showModal(modal);
      }
    }

    // ==========================================
    // 4. BUTTON HANDLER (KONFIRMASI RESET)
    // ==========================================
    if (interaction.isButton()) {
      if (interaction.customId.startsWith("confirm_reset_")) {
        const target = interaction.customId.replace("confirm_reset_", "");
        if (target === "all") {
          await db.delete(`ticket_counter_${guildId}_order`);
          await db.delete(`ticket_counter_${guildId}_ask`);
          await db.delete(`ticket_counter_${guildId}_other`);
        } else {
          await db.delete(`ticket_counter_${guildId}_${target}`);
        }
        return interaction.update({
          content: `✅ Counter ID tiket **${target.toUpperCase()}** telah direset ke 0!`,
          components: [],
        });
      }

      if (interaction.customId === "cancel_reset") {
        return interaction.update({
          content: "❌ Proses reset dibatalkan.",
          components: [],
        });
      }
    }
  },
};
