# 🛒 Vayyy Store Bot 1.0

Bot Discord multifungsi berbasis Node.js dan Discord.js v14 yang dirancang khusus untuk mengelola operasional digital store, jadwal pesan otomatis, template embed kustom, dan status toko secara modular.

---

## 🌟 Fitur Utama

- **Custom Embed Builder**: Buat, edit, dan kelola template embed interaktif lengkap dengan tombol link (_Button_) dan _Selection Menu_.
- **Otomatisasi Status Store**: Fitur buka/tutup toko otomatis berdasarkan jadwal waktu (_Cron Job_) maupun kontrol manual.
- **Advanced Scheduler**: Penjadwalan pengiriman pesan/embed otomatis berbasis zona waktu WIB (Asia/Jakarta / GMT+7).
- **Dynamic Placeholders**: Dukungan variabel dinamis pada teks embed/pesan (misal: nama user, server, dll).
- **Konfigurasi Terpusat**: Kemudahan pengaturan channel log order, testimoni, feedback, dan status store via slash command `/setup`.

---

## 📁 Struktur Proyek

```text
├── .env
├── deploy-commands.js
├── index.js
├── json.sqlite
├── package-lock.json
├── package.json
├── README.md
└── src/
    ├── commands/
    │   ├── embed.js
    │   ├── feedback-set.js
    │   ├── feedback.js
    │   ├── leaderboard.js
    │   ├── order.js
    │   ├── placeholder.js
    │   ├── reset.js
    │   ├── schedule.js
    │   ├── setup.js
    │   ├── store.js
    │   └── testi.js
    ├── config/
    │   └── config.js
    ├── events/
    │   ├── interactionCreate.js
    │   ├── messageCreate.js
    │   └── ready.js
    └── utils/
        ├── cron.js
        ├── database.js
        ├── embedSync.js
        ├── featureEmbed.js
        ├── placeholder.js
        ├── scheduler.js
        └── storeStatus.js
```
