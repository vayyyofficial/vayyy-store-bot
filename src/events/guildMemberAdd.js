// src/events/guildMemberAdd.js
const { Events, EmbedBuilder } = require("discord.js");
const db = require("../utils/database");

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // 1. Ambil ID Channel dari Config Database
      const config = await db.get(`config_${member.guild.id}`);
      if (!config || !config.welcomeChannel) {
        console.log("[Welcome] Channel welcome belum di-config!");
        return;
      }

      const channel = await member.guild.channels
        .fetch(config.welcomeChannel)
        .catch(() => null);
      if (!channel) {
        console.log("[Welcome] Channel tidak ditemukan!");
        return;
      }

      const userMention = `<@${member.id}>`;
      const bannerUrl =
        "https://media.discordapp.net/attachments/1393531450720256030/1538436016690429963/Desain_tanpa_judul.png?ex=6a8748f1&is=6a85f771&hm=e705d3ae29dbbc3d0452c99b6be0b57523d02a8927233cb33e6564918a6c3908&=&format=webp&quality=lossless";

      // 2. Rakit Embed Welcome
      const welcomeEmbed = new EmbedBuilder()
        .setColor("#FAB502")
        .setTitle("`👋` Welcome `👋`")
        .setDescription(
          `Halo ${userMention}, Selamat Datang di **Vayyy Store**!\n\n` +
            `Semoga kamu betah disini <:emoji_11:1509015817105182760>\n\n` +
            `<:Mark_Check:1508957493064106064> Kamu Member ke-**${member.guild.memberCount}**`,
        )
        .setThumbnail(
          member.user.displayAvatarURL({
            extension: "png",
            dynamic: true,
            size: 512,
          }),
        )
        .setFooter({ text: "© Vayyy Store, All rights reserved" });

      if (bannerUrl) welcomeEmbed.setImage(bannerUrl);

      // 3. Kirim Pesan
      await channel.send({
        content: `Selamat Datang ${userMention} di **Vayyy Store**! \`👋\``,
        embeds: [welcomeEmbed],
      });
    } catch (error) {
      console.error("[Event: guildMemberAdd] Error:", error);
    }
  },
};
