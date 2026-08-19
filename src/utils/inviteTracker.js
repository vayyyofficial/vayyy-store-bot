// src/utils/inviteTracker.js
const inviteCache = new Map();

/**
 * Menginisialisasi cache invite saat bot online
 * @param {import('discord.js').Client} client
 */
async function initInviteTracker(client) {
  client.guilds.cache.forEach(async (guild) => {
    try {
      const invites = await guild.invites.fetch();
      const codeUses = new Map();
      invites.forEach((inv) => codeUses.set(inv.code, inv.uses));
      inviteCache.set(guild.id, codeUses);
    } catch (err) {
      console.error(
        `[InviteTracker] Gagal mengambil invite di guild ${guild.name}:`,
        err.message,
      );
    }
  });
}

/**
 * Melacak siapa yang mengundang member baru
 * @param {import('discord.js').GuildMember} member
 */
async function trackInviter(member) {
  const guild = member.guild;
  const cachedInvites = inviteCache.get(guild.id) || new Map();

  try {
    const newInvites = await guild.invites.fetch();
    let inviter = null;
    let usedInvite = null;

    for (const [code, invite] of newInvites) {
      const previousUses = cachedInvites.get(code) || 0;
      if (invite.uses > previousUses) {
        inviter = invite.inviter;
        usedInvite = invite;
        break;
      }
    }

    // Update cache
    const updatedCodeUses = new Map();
    newInvites.forEach((inv) => updatedCodeUses.set(inv.code, inv.uses));
    inviteCache.set(guild.id, updatedCodeUses);

    return {
      inviter: inviter || null,
      uses: usedInvite ? usedInvite.uses : 0,
      code: usedInvite ? usedInvite.code : "Unknown",
    };
  } catch (err) {
    console.error(
      `[InviteTracker] Gagal melacak inviter untuk ${member.user.tag}:`,
      err.message,
    );
    return { inviter: null, uses: 0, code: "Unknown" };
  }
}

module.exports = { initInviteTracker, trackInviter };
