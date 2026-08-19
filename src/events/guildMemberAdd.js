// src/events/guildMemberAdd.js
const { Events } = require("discord.js");
const { trackInviter } = require("../utils/inviteTracker");
const { getEmbedTemplate } = require("../utils/featureEmbed");
const db = require("../utils/database"); // Sesuaikan jika ada utilitas DB milikmu

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    try {
      // 1. Lacak siapa pengundangnya
      const inviteData = await trackInviter(member);
      const inviterUser = inviteData.inviter;

      // 2. Ambil ID Channel Welcome dari Database/Config
      const welcomeChannelId = db.get(
        `config_${member.guild.id}.welcomeChannel`,
      );
      if (!welcomeChannelId) return;

      const channel = member.guild.channels.cache.get(welcomeChannelId);
      if (!channel) return;

      // 3. Siapkan data Placeholders
      const placeholders = {
        "{user}": member.toString(),
        "{user.name}": member.user.username,
        "{user.tag}": member.user.tag,
        "{user.id}": member.id,
        "{user.avatar}": member.user.displayAvatarURL({ dynamic: true }),
        "{server.name}": member.guild.name,
        "{server.total_members}": member.guild.memberCount.toString(),
        "{inviter}": inviterUser
          ? inviterUser.toString()
          : "Tidak Diketahui / Direct",
        "{inviter.name}": inviterUser ? inviterUser.username : "N/A",
        "{inviter.count}": inviteData.uses.toString(),
      };

      // 4. Ambil template embed "welcome" dan kirim
      const embedPayload = await getEmbedTemplate(
        member.guild.id,
        "welcome",
        placeholders,
      );
      if (embedPayload) {
        await channel.send(embedPayload);
      }
    } catch (error) {
      console.error("[Event: guildMemberAdd] Error:", error);
    }
  },
};
