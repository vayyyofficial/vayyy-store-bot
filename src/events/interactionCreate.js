const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../utils/database");
const { sendFeatureEmbed } = require("../utils/featureEmbed");

const DEFAULT_YELLOW_COLOR = "#FAB502";

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    const cmd = interaction.client.commands.get(interaction.commandName);
    const guildId = interaction.guildId;

    // 1. SLASH COMMANDS
    if (interaction.isChatInputCommand() && cmd) {
      try {
        await cmd.execute(interaction);
      } catch (err) {
        if (err.code === 10062) return;
        console.error(`Error /${interaction.commandName}:`, err);
        const reply = {
          content: "❌ Terjadi kesalahan saat menjalankan perintah!",
          flags: 64,
        };
        await (
          interaction.replied || interaction.deferred
            ? interaction.followUp(reply)
            : interaction.reply(reply)
        ).catch(() => {});
      }
      return;
    }

    // 2. AUTOCOMPLETE
    if (interaction.isAutocomplete() && cmd?.autocomplete) {
      return await cmd
        .autocomplete(interaction)
        .catch(
          (e) => e.code !== 10062 && console.error("Autocomplete error:", e),
        );
    }

    // 3. BUTTON ACTIONS HANDLER
    if (interaction.isButton()) {
      // --- OPEN EDIT MENU DARI /EMBED CREATE ---
      if (interaction.customId.startsWith("btn_open_edit_menu_")) {
        const name = interaction.customId.replace("btn_open_edit_menu_", "");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_edit_general_${name}`)
            .setLabel("Edit General")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`btn_edit_options_${name}`)
            .setLabel("Edit Options")
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`btn_action_send_${name}`)
            .setLabel("Send Message")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`btn_action_delete_${name}`)
            .setLabel("Delete")
            .setStyle(ButtonStyle.Danger),
        );

        return interaction
          .update({
            content: `⚙️ **Pengaturan Template: \`${name}\`**\nPilih aksi yang ingin dilakukan:`,
            components: [row],
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      // --- EDIT GENERAL ---
      if (interaction.customId.startsWith("btn_edit_general_")) {
        const name = interaction.customId.replace("btn_edit_general_", "");
        const data = (await db.get(`msg_${guildId}_${name}`)) || {};

        const modal = new ModalBuilder()
          .setCustomId(`modal_save_general_${name}`)
          .setTitle(`Edit General: ${name}`);

        const contentInput = new TextInputBuilder()
          .setCustomId("field_content")
          .setLabel("Pesan Teks Biasa (Luar Embed / Ping)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Contoh: @everyone Halo semuanya!")
          .setValue(data.content || "")
          .setRequired(false);

        const descInput = new TextInputBuilder()
          .setCustomId("field_desc")
          .setLabel("Deskripsi Embed (Teks Dalam Embed)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Isi pesan di dalam kotak embed...")
          .setValue(data.description || "")
          .setRequired(false);

        const footerInput = new TextInputBuilder()
          .setCustomId("field_footer")
          .setLabel("Footer Embed (Teks Bagian Bawah)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Terima kasih telah berkunjung!")
          .setValue(data.footer || "")
          .setRequired(false);

        const colorAvatarInput = new TextInputBuilder()
          .setCustomId("field_color_avatar")
          .setLabel("Warna Hex | Banner URL | Avatar (true/false)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("#FAB502 | https://domain.com/banner.png | true")
          .setValue(
            `${data.color || DEFAULT_YELLOW_COLOR} | ${data.image || ""} | ${data.showAvatar ? "true" : "false"}`,
          )
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(contentInput),
          new ActionRowBuilder().addComponents(descInput),
          new ActionRowBuilder().addComponents(footerInput),
          new ActionRowBuilder().addComponents(colorAvatarInput),
        );

        return await interaction
          .showModal(modal)
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      // --- EDIT OPTIONS ---
      if (interaction.customId.startsWith("btn_edit_options_")) {
        const name = interaction.customId.replace("btn_edit_options_", "");
        const data = (await db.get(`msg_${guildId}_${name}`)) || {};

        const modal = new ModalBuilder()
          .setCustomId(`modal_save_options_${name}`)
          .setTitle(`Edit Button / Selection: ${name}`);

        const btnLabelInput = new TextInputBuilder()
          .setCustomId("field_btn_label")
          .setLabel("Button Label & Emoji (Teks | Emoji)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Beli Sekarang | 🛒")
          .setValue(
            data.button
              ? `${data.button.label || ""}${data.button.emoji ? ` | ${data.button.emoji}` : ""}`
              : "",
          )
          .setRequired(false);

        const btnUrlInput = new TextInputBuilder()
          .setCustomId("field_btn_url")
          .setLabel("Button URL Link")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("https://store.domain.com")
          .setValue(data.button?.url || "")
          .setRequired(false);

        let menuString = "";
        if (data.menuOptions && data.menuOptions.length > 0) {
          menuString = data.menuOptions
            .map(
              (o) =>
                `${o.label} | ${o.value} | ${o.description || ""} | ${o.targetTemplate || o.targetUrl || ""} | ${o.emoji || ""}`,
            )
            .join("\n");
        }

        const menuPlaceholderInput = new TextInputBuilder()
          .setCustomId("field_menu_placeholder")
          .setLabel("Selection Menu Placeholder")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Pilih Menu...")
          .setValue(data.menuPlaceholder || "Pilih Menu...")
          .setRequired(false);

        const menuInput = new TextInputBuilder()
          .setCustomId("field_menu")
          .setLabel("Selection Menu Items (1 baris per opsi)")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(
            "Format: Label | Value | Description | Target | Emoji",
          )
          .setValue(menuString)
          .setRequired(false);

        modal.addComponents(
          new ActionRowBuilder().addComponents(btnLabelInput),
          new ActionRowBuilder().addComponents(btnUrlInput),
          new ActionRowBuilder().addComponents(menuPlaceholderInput),
          new ActionRowBuilder().addComponents(menuInput),
        );

        return await interaction
          .showModal(modal)
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      // --- DIRECT ACTION: SEND MESSAGE ---
      if (interaction.customId.startsWith("btn_action_send_")) {
        try {
          await interaction.deferReply({ flags: 64 });
        } catch (e) {
          if (e.code === 10062) return;
        }

        const name = interaction.customId.replace("btn_action_send_", "");
        const data = await db.get(`msg_${guildId}_${name}`);

        if (!data) {
          return interaction.editReply({
            content: `❌ Template \`${name}\` tidak ditemukan.`,
          });
        }

        const success = await sendFeatureEmbed({
          guild: interaction.guild,
          channel: interaction.channel,
          templateName: name,
          data: { guild: interaction.guild, user: interaction.user },
        });

        return interaction.editReply({
          content: success
            ? `✅ Template \`${name}\` berhasil dikirim ke channel ini!`
            : `❌ Gagal mengirim template \`${name}\`.`,
        });
      }

      // --- DIRECT ACTION: TRIGGER DELETE CONFIRMATION ---
      if (interaction.customId.startsWith("btn_action_delete_")) {
        const name = interaction.customId.replace("btn_action_delete_", "");

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`btn_confirm_delete_yes_${name}`)
            .setLabel("Ya, Hapus")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(`btn_confirm_delete_no_${name}`)
            .setLabel("Batal")
            .setStyle(ButtonStyle.Secondary),
        );

        return interaction
          .reply({
            content: `⚠️ **Konfirmasi Penghapusan**\nApakah kamu yakin ingin menghapus template \`${name}\` secara permanen?`,
            components: [confirmRow],
            flags: 64,
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      // --- CONFIRM DELETE: YES ---
      if (interaction.customId.startsWith("btn_confirm_delete_yes_")) {
        const name = interaction.customId.replace(
          "btn_confirm_delete_yes_",
          "",
        );
        await db.delete(`msg_${guildId}_${name}`);

        return interaction
          .update({
            content: `🗑️ Template \`${name}\` berhasil dihapus secara permanen!`,
            components: [],
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      // --- CONFIRM DELETE: NO ---
      if (interaction.customId.startsWith("btn_confirm_delete_no_")) {
        const name = interaction.customId.replace("btn_confirm_delete_no_", "");
        return interaction
          .update({
            content: `❌ Penghapusan template \`${name}\` dibatalkan.`,
            components: [],
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }
    }

    // 4. SUBMIT MODAL GENERAL
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("modal_save_general_")
    ) {
      const name = interaction.customId.replace("modal_save_general_", "");
      const dbKey = `msg_${guildId}_${name}`;
      const data = (await db.get(dbKey)) || {};

      const content = interaction.fields
        .getTextInputValue("field_content")
        .trim();
      const description = interaction.fields
        .getTextInputValue("field_desc")
        .trim();
      const footer = interaction.fields
        .getTextInputValue("field_footer")
        .trim();
      const rawColorAvatar = interaction.fields
        .getTextInputValue("field_color_avatar")
        .trim();

      let color = DEFAULT_YELLOW_COLOR;
      let image = "";
      let showAvatar = false;

      if (rawColorAvatar.includes("|")) {
        const parts = rawColorAvatar.split("|").map((s) => s.trim());
        color = parts[0] || DEFAULT_YELLOW_COLOR;
        image = parts[1] || "";
        showAvatar = parts[2]?.toLowerCase() === "true";
      } else {
        color = rawColorAvatar || DEFAULT_YELLOW_COLOR;
      }

      if (!content && !description) {
        return interaction
          .reply({
            content:
              "❌ **Gagal Menyimpan!** Kamu harus mengisi minimal **Pesan Teks Biasa** atau **Deskripsi Embed**.",
            flags: 64,
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      data.content = content;
      data.description = description;
      data.title = "";
      data.authorName = "";
      data.authorIcon = "";
      data.footer = footer;
      data.color = color;
      data.image = image;
      data.showAvatar = showAvatar;

      await db.set(dbKey, data);

      return interaction
        .reply({
          content: `✅ Pengaturan General untuk template \`${name}\` berhasil diperbarui!`,
          flags: 64,
        })
        .catch((e) => e.code !== 10062 && console.error(e));
    }

    // 5. SUBMIT MODAL OPTIONS
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("modal_save_options_")
    ) {
      const name = interaction.customId.replace("modal_save_options_", "");
      const dbKey = `msg_${guildId}_${name}`;
      const data = (await db.get(dbKey)) || {};

      const rawBtnLabel = interaction.fields
        .getTextInputValue("field_btn_label")
        .trim();
      const btnUrl = interaction.fields
        .getTextInputValue("field_btn_url")
        .trim();
      const menuPlaceholder =
        interaction.fields.getTextInputValue("field_menu_placeholder").trim() ||
        "Pilih Menu...";
      const rawMenu = interaction.fields.getTextInputValue("field_menu") || "";

      if (btnUrl) {
        let label = "Link";
        let emoji = null;
        if (rawBtnLabel.includes("|")) {
          const [l, e] = rawBtnLabel.split("|").map((s) => s.trim());
          label = l || "Link";
          emoji = e || null;
        } else if (rawBtnLabel) {
          label = rawBtnLabel;
        }

        data.button = {
          label: label,
          url: btnUrl,
          emoji: emoji,
        };
      } else {
        data.button = null;
      }

      data.menuPlaceholder = menuPlaceholder;
      if (rawMenu.trim()) {
        const lines = rawMenu
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);

        const parsedOptions = lines.map((line) => {
          const [label, value, description, target, emoji] = line
            .split("|")
            .map((s) => s.trim());

          const isUrl =
            target &&
            (target.startsWith("http://") || target.startsWith("https://"));

          return {
            label: label || "Opsi",
            value: value || `val_${Date.now()}`,
            description: description || "",
            targetTemplate: isUrl ? null : target || null,
            targetUrl: isUrl ? target : null,
            emoji: emoji || null,
          };
        });

        data.menuOptions = parsedOptions;
        data.hasMenu = parsedOptions.length > 0;
      } else {
        data.menuOptions = [];
        data.hasMenu = false;
      }

      await db.set(dbKey, data);
      return interaction
        .reply({
          content: `✅ Button & Selection Menu untuk template \`${name}\` telah diperbarui!`,
          flags: 64,
        })
        .catch((e) => e.code !== 10062 && console.error(e));
    }

    // 6. SELECTION MENU DISPATCHER
    if (
      interaction.isStringSelectMenu() &&
      (interaction.customId.startsWith("select_embed_") ||
        interaction.customId.startsWith("select_menu_"))
    ) {
      const templateName = interaction.customId
        .replace("select_embed_", "")
        .replace("select_menu_", "");

      const parentTemplate = await db.get(`msg_${guildId}_${templateName}`);

      if (!parentTemplate || !parentTemplate.menuOptions) {
        return interaction
          .reply({
            content: "❌ Data template atau opsi tidak ditemukan.",
            flags: 64,
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      const selectedOption = parentTemplate.menuOptions.find(
        (o) => o.value === interaction.values[0],
      );

      if (!selectedOption) {
        return interaction
          .reply({
            content: "❌ Opsi yang dipilih tidak valid.",
            flags: 64,
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      if (selectedOption.targetTemplate) {
        await interaction
          .deferUpdate()
          .catch((e) => e.code !== 10062 && console.error(e));
        return await sendFeatureEmbed({
          guild: interaction.guild,
          channel: interaction.channel,
          templateName: selectedOption.targetTemplate,
          data: { guild: interaction.guild, user: interaction.user },
          editMessage: interaction.message,
        });
      }

      if (selectedOption.targetUrl) {
        return interaction
          .reply({
            content: `🔗 Silakan buka tautan berikut: ${selectedOption.targetUrl}`,
            flags: 64,
          })
          .catch((e) => e.code !== 10062 && console.error(e));
      }

      return interaction
        .reply({
          content: `Kamu memilih: **${selectedOption.label || interaction.values[0]}**`,
          flags: 64,
        })
        .catch((e) => e.code !== 10062 && console.error(e));
    }
  },
};
