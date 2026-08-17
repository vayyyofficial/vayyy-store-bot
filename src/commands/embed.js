const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("../utils/database");
const { sendFeatureEmbed } = require("../utils/featureEmbed");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("embed")
    .setDescription("Sistem Manajer Template Embed & Pesan")

    // 1. CREATE
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Buat template pesan/embed baru")
        .addStringOption((opt) =>
          opt
            .setName("nama")
            .setDescription("ID Unik Template (Contoh: welcome, testimoni)")
            .setRequired(true),
        ),
    )

    // 2. EDIT
    .addSubcommand((sub) =>
      sub
        .setName("edit")
        .setDescription(
          "Edit isi teks, embed, button, atau kirim & hapus template",
        )
        .addStringOption((opt) =>
          opt
            .setName("nama")
            .setDescription("Pilih template yang ingin di-edit")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )

    // 3. COPY
    .addSubcommand((sub) =>
      sub
        .setName("copy")
        .setDescription("Duplikasi/salin template yang sudah ada ke nama baru")
        .addStringOption((opt) =>
          opt
            .setName("sumber")
            .setDescription("Pilih template asal yang ingin disalin")
            .setAutocomplete(true)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("target")
            .setDescription("Masukkan nama untuk template baru hasil salinan")
            .setRequired(true),
        ),
    )

    // 4. SEND
    .addSubcommand((sub) =>
      sub
        .setName("send")
        .setDescription("Kirim template ke channel ini")
        .addStringOption((opt) =>
          opt
            .setName("nama")
            .setDescription("Pilih template yang ingin dikirim")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    )

    // 5. LIST
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Tampilkan daftar semua template yang tersimpan"),
    )

    // 6. DELETE
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Hapus template dari database")
        .addStringOption((opt) =>
          opt
            .setName("nama")
            .setDescription("Pilih template yang ingin dihapus")
            .setAutocomplete(true)
            .setRequired(true),
        ),
    ),

  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const focusedValue = focusedOption.value.toLowerCase();
    const guildId = interaction.guildId;
    const prefix = `msg_${guildId}_`;

    const allKeys = await db.all();
    const choices = allKeys
      .filter((item) => item.id && item.id.startsWith(prefix))
      .map((item) => item.id.replace(prefix, ""));

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

    if (
      !interaction.member.permissions.has(PermissionFlagsBits.Administrator)
    ) {
      return interaction.reply({
        content: "❌ Akses ditolak! Khusus Admin.",
        flags: 64,
      });
    }

    // --- 1. CREATE ---
    if (sub === "create") {
      const name = interaction.options.getString("nama").toLowerCase().trim();
      const dbKey = `msg_${guildId}_${name}`;

      const existing = await db.get(dbKey);
      if (existing) {
        return interaction.reply({
          content: `❌ Template \`${name}\` sudah ada. Gunakan \`/embed edit\` untuk mengedit.`,
          flags: 64,
        });
      }

      await db.set(dbKey, {
        content: "",
        title: "",
        description: "",
        authorName: "",
        authorIcon: "",
        footer: "",
        image: "",
        color: "#FAB502",
        showAvatar: false,
        button: null,
        menuPlaceholder: "Pilih Menu...",
        menuOptions: [],
      });

      const editBtnRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`btn_open_edit_menu_${name}`)
          .setLabel("Edit Template")
          .setStyle(ButtonStyle.Primary),
      );

      return interaction.reply({
        content: `✅ Template \`${name}\` berhasil dibuat! Klik tombol di bawah ini untuk langsung mengatur konten.`,
        components: [editBtnRow],
        flags: 64,
      });
    }

    // --- 2. EDIT ---
    if (sub === "edit") {
      const name = interaction.options.getString("nama").toLowerCase().trim();
      const dbKey = `msg_${guildId}_${name}`;
      const data = await db.get(dbKey);

      if (!data) {
        return interaction.reply({
          content: `❌ Template \`${name}\` tidak ditemukan.`,
          flags: 64,
        });
      }

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

      return interaction.reply({
        content: `⚙️ **Pengaturan Template: \`${name}\`**\nPilih aksi yang ingin dilakukan:`,
        components: [row],
        flags: 64,
      });
    }

    // --- 3. COPY ---
    if (sub === "copy") {
      const sourceName = interaction.options
        .getString("sumber")
        .toLowerCase()
        .trim();
      const targetName = interaction.options
        .getString("target")
        .toLowerCase()
        .trim();

      const sourceKey = `msg_${guildId}_${sourceName}`;
      const targetKey = `msg_${guildId}_${targetName}`;

      const sourceData = await db.get(sourceKey);
      if (!sourceData) {
        return interaction.reply({
          content: `❌ Template sumber \`${sourceName}\` tidak ditemukan.`,
          flags: 64,
        });
      }

      const existingTarget = await db.get(targetKey);
      if (existingTarget) {
        return interaction.reply({
          content: `❌ Template target \`${targetName}\` sudah ada. Gunakan nama lain.`,
          flags: 64,
        });
      }

      const copiedData = JSON.parse(JSON.stringify(sourceData));
      await db.set(targetKey, copiedData);

      return interaction.reply({
        content: `📋 Berhasil menyalin template \`${sourceName}\` ke \`${targetName}\`!`,
        flags: 64,
      });
    }

    // --- 4. SEND ---
    if (sub === "send") {
      const name = interaction.options.getString("nama").toLowerCase().trim();
      const data = await db.get(`msg_${guildId}_${name}`);

      if (!data) {
        return interaction.reply({
          content: `❌ Template \`${name}\` tidak ditemukan.`,
          flags: 64,
        });
      }

      await interaction.reply({
        content: `⏳ Mengirim template \`${name}\`...`,
        flags: 64,
      });

      const success = await sendFeatureEmbed({
        guild: interaction.guild,
        channel: interaction.channel,
        templateName: name,
        data: { guild: interaction.guild, user: interaction.user },
      });

      return interaction.editReply({
        content: success
          ? `✅ Template \`${name}\` berhasil dikirim!`
          : `❌ Gagal mengirim template \`${name}\`.`,
      });
    }

    // --- 5. LIST ---
    if (sub === "list") {
      const allKeys = await db.all();
      const prefix = `msg_${guildId}_`;

      const templateKeys = allKeys.filter(
        (item) => item.id && item.id.startsWith(prefix),
      );

      if (templateKeys.length === 0) {
        return interaction.reply({
          content: "ℹ️ Belum ada template yang tersimpan.",
          flags: 64,
        });
      }

      const formattedList = [];

      for (const item of templateKeys) {
        const name = item.id.replace(prefix, "");
        const data = item.value || {};

        const hasContent = data.content && data.content.trim().length > 0;
        const hasEmbed = data.authorName || data.description;

        let typeLabel = "";
        if (hasContent && hasEmbed) {
          typeLabel = "`[Text + Embed]`";
        } else if (hasEmbed) {
          typeLabel = "`[Embed Saja]`";
        } else if (hasContent) {
          typeLabel = "`[Text Saja]`";
        } else {
          typeLabel = "`[Kosong]`";
        }

        formattedList.push(`• **${name}** - ${typeLabel}`);
      }

      return interaction.reply({
        content: `📋 **Daftar Template (${formattedList.length}):**\n\n${formattedList.join("\n")}`,
        flags: 64,
      });
    }

    // --- 6. DELETE ---
    if (sub === "delete") {
      const name = interaction.options.getString("nama").toLowerCase().trim();
      const exists = await db.get(`msg_${guildId}_${name}`);

      if (!exists) {
        return interaction.reply({
          content: `❌ Template \`${name}\` tidak ditemukan.`,
          flags: 64,
        });
      }

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

      return interaction.reply({
        content: `⚠️ **Konfirmasi Penghapusan**\nApakah kamu yakin ingin menghapus template \`${name}\` secara permanen?`,
        components: [confirmRow],
        flags: 64,
      });
    }
  },
};
