module.exports = {
  // ⚠️ Remplacez par votre numéro WhatsApp (format international, sans +)
  OWNER_NUMBER: process.env.OWNER_NUMBER || "",

  // URL de votre service Render (pour le keep-alive)
  // Ex : "https://spectral-hunter.onrender.com"
  RENDER_URL: process.env.RENDER_URL || "",

  // Préfixe des commandes
  PREFIX: "!",

  // Nom du bot
  BOT_NAME: "Spectral Hunter",

  // Anti-spam : nombre de messages max dans la fenêtre de temps
  SPAM_THRESHOLD: 5,
  SPAM_WINDOW_MS: 5000, // 5 secondes

  // Détection de purge : expulsions max dans la fenêtre de temps
  PURGE_THRESHOLD: 3,
  PURGE_WINDOW_MS: 10000, // 10 secondes
};
