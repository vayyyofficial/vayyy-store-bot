// src/commands/moderation.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderation")
    .setDescription("Fitur pengelolaan dan moderasi anggota server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((sub) =>
      sub
        .setName("clear")
        .setDescription("Menghapus sejumlah pesan di channel")
        .addIntegerOption((opt) =>
          opt
            .setName("jumlah")
            .setDescription("Jumlah pesan (1-100)")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("kick")
        .setDescription("Mengeluarkan member dari server")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member yang ingin di-kick")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("alasan").setDescription("Alasan kick"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription("Membanned member dari server")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member yang ingin di-ban")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("alasan").setDescription("Alasan ban"),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("timeout")
        .setDescription("Membungkam (timeout) member untuk durasi tertentu")
        .addUserOption((opt) =>
          opt
            .setName("target")
            .setDescription("Member target")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("menit")
            .setDescription("Durasi timeout dalam menit")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("alasan").setDescription("Alasan timeout"),
        ),
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "clear") {
      const amount = interaction.options.getInteger("jumlah");
      if (amount < 1 || amount > 100) {
        return interaction.reply({
          content: "❌ Masukkan jumlah antara 1 hingga 100!",
          ephemeral: true,
        });
      }

      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({
        content: `🧹 Berhasil menghapus **${deleted.size}** pesan.`,
        ephemeral: true,
      });
    } else if (sub === "kick") {
      const user = interaction.options.getUser("target");
      const reason =
        interaction.options.getString("alasan") || "Tidak ada alasan.";
      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member || !member.kickable) {
        return interaction.reply({
          content: "❌ Saya tidak dapat meng-kick member ini!",
          ephemeral: true,
        });
      }

      await member.kick(reason);
      await interaction.reply({
        content: `👞 **${user.tag}** berhasil di-kick! Alasan: ${reason}`,
      });
    } else if (sub === "ban") {
      const user = interaction.options.getUser("target");
      const reason =
        interaction.options.getString("alasan") || "Tidak ada alasan.";

      await interaction.guild.members.ban(user.id, { reason });
      await interaction.reply({
        content: `🔨 **${user.tag}** berhasil di-banned! Alasan: ${reason}`,
      });
    } else if (sub === "timeout") {
      const user = interaction.options.getUser("target");
      const minutes = interaction.options.getInteger("menit");
      const reason =
        interaction.options.getString("alasan") || "Tidak ada alasan.";
      const member = await interaction.guild.members
        .fetch(user.id)
        .catch(() => null);

      if (!member || !member.moderatable) {
        return interaction.reply({
          content: "❌ Saya tidak dapat memberi timeout pada member ini!",
          ephemeral: true,
        });
      }

      await member.timeout(minutes * 60 * 1000, reason);
      await interaction.reply({
        content: `🤐 **${user.tag}** diberi timeout selama **${minutes} menit**. Alasan: ${reason}`,
      });
    }
  },
};
