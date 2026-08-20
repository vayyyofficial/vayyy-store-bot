require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");

if (fs.existsSync(commandsPath)) {
  function readCommands(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        readCommands(filePath);
      } else if (file.endsWith(".js")) {
        const command = require(filePath);

        if ("data" in command && "execute" in command) {
          commands.push(command.data.toJSON());
        }
      }
    }
  }

  readCommands(commandsPath);
}

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error(
    "❌ ERROR: DISCORD_TOKEN atau CLIENT_ID tidak ditemukan di file .env!",
  );
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`🚀 Menendaftarkan ${commands.length} slash commands...`);

    if (guildId) {
      // 1. Bersihkan command Global agar tidak duplikat
      await rest.put(Routes.applicationCommands(clientId), { body: [] });

      // 2. Daftarkan hanya ke Guild/Server tertentu
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
      console.log(
        "✅ Slash commands berhasil didaftarkan secara Guild-specific!",
      );
    } else {
      // Jika GUILD_ID kosong, daftarkan secara Global
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
      console.log("✅ Slash commands berhasil didaftarkan secara Global!");
    }
  } catch (error) {
    console.error("❌ Gagal mendaftarkan slash commands:", error);
  }
})();
