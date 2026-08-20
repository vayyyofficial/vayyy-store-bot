// src/events/guildMemberRemove.js
const { Events, EmbedBuilder } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      // 1. Ambil ID Channel dari Config Database
      const config = await db.get(`config_${member.guild.id}`);
      if (!config || !config.goodbyeChannel) {
        console.log("[Goodbye] Channel goodbye belum di-config!");
        return;
      }

      const channel = await member.guild.channels
        .fetch(config.goodbyeChannel)
        .catch(() => null);
      if (!channel) {
        console.log("[Goodbye] Channel tidak ditemukan!");
        return;
      }

      const userMention = `<@${member.id}>`;
      const bannerUrl =
        "https://media.discordapp.net/attachments/1393531450720256030/1538436016690429963/Desain_tanpa_judul.png?ex=6a8748f1&is=6a85f771&hm=e705d3ae29dbbc3d0452c99b6be0b57523d02a8927233cb33e6564918a6c3908&=&format=webp&quality=lossless";

      // 2. Rakit Embed Goodbye
      const goodbyeEmbed = new EmbedBuilder()
        .setColor("#FAB502")
        .setTitle("`👋` Goodbye `👋`")
        .setDescription(
          `Terima Kasih sudah pernah menjadi bagian kita.\n\n` +
            `Sampai berjumpa kembali **${userMention}** <:emoji_11:1509015817105182760>`,
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            extension: "png",
            dynamic: true,
            size: 512,
          }),
        )
        .setFooter({ text: "© Vayyy Store, All rights reserved" });

      if (bannerUrl) goodbyeEmbed.setImage(bannerUrl);

      // 3. Kirim Pesan
      await channel.send({
        content: `Sampai Jumpa ${userMention}, semoga kamu menikmati waktumu di sini! \`👋\``,
        embeds: [goodbyeEmbed],
      });
    } catch (error) {
      console.error("[Event: guildMemberRemove] Error:", error);
    }
  },
};
