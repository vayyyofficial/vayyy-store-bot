module.exports = {
  name: "clientReady",
  once: true,
  execute(client) {
    console.log(`🤖 Bot Berhasil Login Sebagai ${client.user.tag}`);
  },
};
