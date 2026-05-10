const fs = require("fs");
const path = require("path");

const LOG_FILE = path.join(__dirname, "spectral.log");

function timestamp() {
  return new Date().toLocaleString("fr-FR");
}

function log(level, message) {
  const line = `[${timestamp()}] [${level}] ${message}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + "\n");
}

const logger = {
  info: (msg) => log("INFO", msg),
  warn: (msg) => log("WARN", msg),
  alert: (msg) => log("🚨 ALERTE", msg),
  defense: (msg) => log("🛡️ DÉFENSE", msg),
  ban: (msg) => log("🚫 BAN", msg),
};

module.exports = logger;
