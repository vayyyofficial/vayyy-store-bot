const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const db = require("./database");
const config = require("../config/config");
const { parsePlaceholders } = require("./placeholder");

/**
 * Mengirim atau memperbarui pesan/embed berbasis template
 */
async function sendFeatureEmbed({
  channel,
  templateName,
  guild,
  data = {},
  editMessage = null,
  attachment = null,
}) {
  if (!channel || !templateName || !guild) return false;

  const templateData = await db.get(`msg_${guild.id}_${templateName}`);
  if (!templateData) return false;

  const payloadData = {
    guild: guild,
    ...data,
  };

  const payload = {
    content: null,
    embeds: [],
    components: [],
  };

  // 1. Teks Content (Luar Embed / Ping)
  if (templateData.content && templateData.content.trim().length > 0) {
    payload.content = await parsePlaceholders(
      templateData.content,
      payloadData,
    );
  }

  // 2. Embed Builder (Tanpa syarat Title/Header)
  const hasEmbedContent =
    templateData.description ||
    templateData.footer ||
    templateData.image ||
    templateData.showAvatar ||
    templateData.avatar ||
    templateData.thumbnail ||
    attachment;

  if (hasEmbedContent) {
    const embed = new EmbedBuilder();

    // Set Description
    if (templateData.description) {
      embed.setDescription(
        await parsePlaceholders(templateData.description, payloadData),
      );
    }

    // Set Footer
    if (templateData.footer) {
      embed.setFooter({
        text: await parsePlaceholders(templateData.footer, payloadData),
      });
    }

    // Set Warna Embed
    const embedColor = templateData.color || config.embedColor || "#FAB502";
    try {
      embed.setColor(embedColor);
    } catch {
      embed.setColor("#FAB502");
    }

    // Avatar Target / User / Thumbnail
    if (templateData.showAvatar) {
      const targetUser = data.user || data.member?.user;
      if (targetUser) {
        embed.setThumbnail(
          targetUser.displayAvatarURL({ forceStatic: false, size: 512 }),
        );
      }
    } else {
      const avatarTarget = templateData.avatar || templateData.thumbnail;
      if (avatarTarget) {
        const parsedAvatar = await parsePlaceholders(avatarTarget, payloadData);
        if (parsedAvatar.startsWith("http")) {
          embed.setThumbnail(parsedAvatar);
        }
      }
    }

    // Gambar Embed (Prioritas: Gambar Attachment > Template Default)
    if (attachment && attachment.url) {
      embed.setImage(attachment.url);
    } else if (templateData.image) {
      const parsedImage = await parsePlaceholders(
        templateData.image,
        payloadData,
      );
      if (parsedImage.startsWith("http")) {
        embed.setImage(parsedImage);
      }
    }

    payload.embeds = [embed];
  }

  // 3. Components (Dropdown / Button)
  const components = [];

  // Dropdown Menu
  if (
    templateData.hasMenu &&
    templateData.menuOptions &&
    templateData.menuOptions.length > 0
  ) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`select_menu_${templateName}`)
      .setPlaceholder(templateData.menuPlaceholder || "Pilih Menu...");

    const options = templateData.menuOptions.map((opt) => {
      const item = {
        label: opt.label,
        value: opt.value,
        description: opt.description || undefined,
      };
      if (opt.emoji) item.emoji = opt.emoji;
      return item;
    });

    selectMenu.addOptions(options);
    components.push(new ActionRowBuilder().addComponents(selectMenu));
  }

  // Link Button
  if (templateData.button && templateData.button.url) {
    const parsedBtnUrl = await parsePlaceholders(
      templateData.button.url,
      payloadData,
    );
    const parsedBtnLabel = await parsePlaceholders(
      templateData.button.label || "Kunjungi",
      payloadData,
    );

    if (parsedBtnUrl.startsWith("http")) {
      const button = new ButtonBuilder()
        .setLabel(parsedBtnLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(parsedBtnUrl);

      if (templateData.button.emoji) {
        button.setEmoji(templateData.button.emoji);
      }

      components.push(new ActionRowBuilder().addComponents(button));
    }
  }

  payload.components = components;

  // 4. Send or Edit Message Target
  try {
    if (editMessage) {
      return await editMessage.edit(payload);
    }

    const newMsg = await channel.send(payload);
    return newMsg;
  } catch (error) {
    console.error(`❌ Error sending template [${templateName}]:`, error);
    return false;
  }
}

module.exports = {
  sendFeatureEmbed,
};
