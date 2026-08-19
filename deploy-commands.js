require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const commands = [];
const commandsPath = path.join(__dirname, "src", "commands");

if (fs.existsSync(commandsPath)) {
  const commandFolders = fs.readdirSync(commandsPath);

  for (const folder of commandFolders) {
    const subFolderPath = path.join(commandsPath, folder);

    if (fs.statSync(subFolderPath).isDirectory()) {
      const commandFiles = fs
        .readdirSync(subFolderPath)
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const filePath = path.join(subFolderPath, file);
        const command = require(filePath);

        if ("data" in command && "execute" in command) {
          commands.push(command.data.toJSON());
        }
      }
    }
  }
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
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body: commands,
      });
    }

    console.log("✅ Slash commands berhasil didaftarkan ke Discord API!");
  } catch (error) {
    console.error("❌ Gagal mendaftarkan slash commands:", error);
  }
})();
