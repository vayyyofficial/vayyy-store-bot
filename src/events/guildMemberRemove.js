// src/events/guildMemberRemove.js
const { Events } = require("discord.js");
const { getEmbedTemplate } = require("../utils/featureEmbed");
const db = require("../utils/database");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    try {
      // 1. Ambil ID Channel Goodbye dari Database/Config
      const goodbyeChannelId = db.get(
        `config_${member.guild.id}.goodbyeChannel`,
      );
      if (!goodbyeChannelId) return;

      const channel = member.guild.channels.cache.get(goodbyeChannelId);
      if (!channel) return;

      // 2. Siapkan data Placeholders
      const placeholders = {
        "{user}": member.user.username,
        "{user.name}": member.user.username,
        "{user.tag}": member.user.tag,
        "{user.id}": member.id,
        "{user.avatar}": member.user.displayAvatarURL({ dynamic: true }),
        "{server.name}": member.guild.name,
        "{server.total_members}": member.guild.memberCount.toString(),
      };

      // 3. Ambil template embed "goodbye" dan kirim
      const embedPayload = await getEmbedTemplate(
        member.guild.id,
        "goodbye",
        placeholders,
      );
      if (embedPayload) {
        await channel.send(embedPayload);
      }
    } catch (error) {
      console.error("[Event: guildMemberRemove] Error:", error);
    }
  },
};
