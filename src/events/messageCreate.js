module.exports = {
  name: "messageCreate",
  async execute(message) {
    // Abaikan pesan dari bot atau pesan di luar guild (DM)
    if (!message.guild || message.author.bot) return;

    // Logika AI sudah dipindahkan ke Vayyy Bot - AI.
    // Tempatkan penanganan pesan masuk umum jika dibutuhkan di sini.
  },
};
