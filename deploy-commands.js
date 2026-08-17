require("dotenv").config(); // 👈 Tambahkan baris ini di paling atas
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("./src/config/config");

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    commands.push(command.data.toJSON());
  }
}

// Cek apakah token terbaca sebelum mengirim request
if (!config.token || config.token === "YOUR_BOT_TOKEN_HERE") {
  console.error("❌ ERROR: Bot Token belum diisi di config.js atau file .env!");
  process.exit(1);
}

const rest = new REST().setToken(config.token);

(async () => {
  try {
    console.log(`Menendaftarkan ${commands.length} slash commands...`);
    await rest.put(Routes.applicationCommands(config.clientId), {
      body: commands,
    });
    console.log("✅ Slash commands berhasil didaftarkan ke Discord API!");
  } catch (error) {
    console.error("Gagal mendaftarkan slash commands:", error);
  }
})();
