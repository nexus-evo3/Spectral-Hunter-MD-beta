const fs = require("fs");
const path = require("path");
const logger = require("./logger");

const AUTH_FOLDER = "auth_info";

async function restoreSession(sessionId) {
  try {
    logger.info(`Restauration de la session...`);

    let encoded = sessionId;

    // Supprimer les préfixes connus (levanter_, spectral_, etc.)
    if (sessionId.includes("_")) {
      encoded = sessionId.split("_").slice(1).join("_");
    }

    // Décoder le base64
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const authData = JSON.parse(decoded);

    // Créer le dossier auth
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });

    // Écrire chaque fichier de session
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
  return (
    fs.existsSync(AUTH_FOLDER) &&
    fs.readdirSync(AUTH_FOLDER).length > 0
  );
}

function clearSession() {
  if (fs.existsSync(AUTH_FOLDER)) {
    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
  }
}

module.exports = { restoreSession, hasLocalSession, clearSession, AUTH_FOLDER };

