// src/events/ready.js
const { initInviteTracker } = require("../utils/inviteTracker");
const { initGiveawayChecker } = require("../utils/giveawayManager");

module.exports = {
  name: "clientReady",
  once: true,
  async execute(client) {
    console.log(`🤖 Bot Berhasil Login Sebagai ${client.user.tag}`);

    // 1. Inisialisasi tracker link invite untuk fitur Welcome & Inviter Log
    await initInviteTracker(client);

    // 2. Inisialisasi pengecekan timer giveaway otomatis
    initGiveawayChecker(client);

    console.log("✅ Sistem Invite Tracker & Giveaway Checker siap digunakan!");
  },
};
