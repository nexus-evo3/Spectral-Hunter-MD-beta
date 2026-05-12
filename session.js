const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const AUTH_FOLDER = "auth_info";

async function restoreSession(sessionId) {
  try {
    logger.info(`Restauration de la session...`);

    // Extraire la partie après le préfixe (levanter_, spectral_, etc.)
    let encoded = sessionId;
    if (sessionId.includes("_")) {
      encoded = sessionId.substring(sessionId.indexOf("_") + 1);
    }

    let authData;

    // Tentative 1 : base64 standard
    try {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      authData = JSON.parse(decoded);
      logger.info("Session décodée en base64 standard");
    } catch (_) {}

    // Tentative 2 : base64url
    if (!authData) {
      try {
        const base64url = encoded.replace(/-/g, "+").replace(/_/g, "/");
        const decoded = Buffer.from(base64url, "base64").toString("utf8");
        authData = JSON.parse(decoded);
        logger.info("Session décodée en base64url");
      } catch (_) {}
    }

    // Tentative 3 : la session est directement un JSON stringifié
    if (!authData) {
      try {
        authData = JSON.parse(encoded);
        logger.info("Session décodée en JSON direct");
      } catch (_) {}
    }

    if (!authData) {
      throw new Error("Format de session non reconnu");
    }

    fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    for (const [file, content] of Object.entries(authData)) {
      const filePath = path.join(AUTH_FOLDER, file);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(
        filePath,
        typeof content === "string" ? content : JSON.stringify(content),
        "utf8"
      );
    }

    logger.info(`✅ Session restaurée (${Object.keys(authData).length} fichiers)`);
    return true;
  } catch (e) {
    logger.warn(`Erreur restauration session : ${e.message}`);
    return false;
  }
}

function hasLocalSession() {
  return fs.existsSync(AUTH_FOLDER) && fs.readdirSync(AUTH_FOLDER).length > 0;
}

function clearSession() {
  if (fs.existsSync(AUTH_FOLDER)) {
    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
  }
}

module.exports = { restoreSession, hasLocalSession, clearSession, AUTH_FOLDER };
      
