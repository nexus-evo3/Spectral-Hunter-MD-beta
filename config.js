module.exports = {
  OWNER_NUMBER: process.env.OWNER_NUMBER || "",
  PREFIX: process.env.PREFIX || "!",
  BOT_NAME: "Spectral Hunter MD V1",
  SPAM_THRESHOLD: 5,
  SPAM_WINDOW_MS: 5000,
  PURGE_THRESHOLD: 3,
  PURGE_WINDOW_MS: 10000,
  RENDER_URL: process.env.RENDER_URL || "",
};
