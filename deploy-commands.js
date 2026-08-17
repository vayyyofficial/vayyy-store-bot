require("dotenv").config(); // Wajib paling atas
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");

// Pastikan folder commands ada sebelum dibaca
if (fs.existsSync(commandsPath)) {
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
}

// Ambil token dan clientId langsung dari .env untuk keamanan penuh
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// Validasi token dan clientId sebelum eksekusi ke Discord API
if (!token) {
  console.error("❌ ERROR: DISCORD_TOKEN tidak ditemukan di file .env!");
  process.exit(1);
}

if (!clientId) {
  console.error("❌ ERROR: CLIENT_ID tidak ditemukan di file .env!");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`🚀 Menendaftarkan ${commands.length} slash commands...`);

    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });

    console.log("✅ Slash commands berhasil didaftarkan ke Discord API!");
  } catch (error) {
    console.error("❌ Gagal mendaftarkan slash commands:", error);
  }
})();
