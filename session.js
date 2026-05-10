const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const AUTH_FOLDER = "auth_info";

// Décoder la SESSION_ID et restaurer les fichiers d'auth
function restoreSession(sessionId) {
  try {
    // Format : Spectral-H-XXXXXXXXXX-Beta:BASE64_DATA
    const colonIndex = sessionId.indexOf(":");
    if (colonIndex === -1) throw new Error("Format SESSION_ID invalide");

    const label = sessionId.substring(0, colonIndex);
    const encoded = sessionId.substring(colonIndex + 1);

    logger.info(`Restauration de la session : ${label}`);

    const authData = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));

    fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    for (const [file, content] of Object.entries(authData)) {
      fs.writeFileSync(path.join(AUTH_FOLDER, file), content, "utf8");
    }

    logger.info(`✅ Session restaurée avec succès (${Object.keys(authData).length} fichiers)`);
    return true;
  } catch (e) {
    logger.warn(`Erreur restauration session : ${e.message}`);
    return false;
  }
}

function hasLocalSession() {
  return fs.existsSync(AUTH_FOLDER) && fs.readdirSync(AUTH_FOLDER).length > 0;
}

module.exports = { restoreSession, hasLocalSession, AUTH_FOLDER };
