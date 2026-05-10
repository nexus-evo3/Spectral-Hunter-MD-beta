const http = require("http");
const https = require("https");
const logger = require("./logger");

// État partagé entre le bot et la page web
const state = {
  pairingCode: null,
  connected: false,
  sessionActive: false,
  startedAt: new Date().toLocaleString("fr-FR"),
};

function setPairingCode(code) {
  state.pairingCode = code;
  logger.info("Pairing code disponible sur la page web");
}

function setConnected(val) {
  state.connected = val;
  if (val) state.pairingCode = null; // Effacer le code une fois connecté
}

function setSessionActive(val) {
  state.sessionActive = val;
}

function startServer(renderUrl) {
  const PORT = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {

    // ── Endpoint JSON pour auto-refresh ──
    if (req.url === "/status") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        connected: state.connected,
        code: state.pairingCode,
        session: state.sessionActive,
      }));
      return;
    }

    // ── Page principale ──
    const statusColor = state.connected ? "#25D366" : "#FF9800";
    const statusText = state.connected ? "✅ Connecté et opérationnel" : "⏳ En attente de connexion...";

    const codeSection = state.connected
      ? `<div class="connected">
           <div class="check">✅</div>
           <p>Bot connecté et actif !</p>
           <p class="small">Session sauvegardée — pas besoin de se reconnecter au redémarrage.</p>
         </div>`
      : state.pairingCode
        ? `<div class="code-box">
             <p class="label">Votre code de connexion :</p>
             <div class="code">${state.pairingCode.match(/.{1,4}/g).join(" - ")}</div>
             <p class="instructions">
               📱 WhatsApp → Paramètres<br>
               → Appareils connectés<br>
               → Connecter un appareil<br>
               → Connecter avec un numéro de téléphone<br>
               → Entrez ce code
             </p>
             <p class="small">⏱️ Ce code expire dans quelques minutes. La page se rafraîchit automatiquement.</p>
           </div>`
        : `<div class="waiting">
             <div class="spinner"></div>
             <p>Génération du code en cours...</p>
           </div>`;

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Spectral Hunter</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0D1117;
      color: #E6EDF3;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: #161B22;
      border: 1px solid #30363D;
      border-radius: 16px;
      padding: 40px 30px;
      max-width: 420px;
      width: 100%;
      text-align: center;
    }
    .logo { font-size: 48px; margin-bottom: 10px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 6px; }
    .version { color: #8B949E; font-size: 13px; margin-bottom: 24px; }
    .status {
      display: inline-block;
      background: #21262D;
      border-radius: 20px;
      padding: 6px 16px;
      font-size: 14px;
      color: ${statusColor};
      margin-bottom: 30px;
      font-weight: 600;
    }
    .code-box { margin-top: 10px; }
    .label { color: #8B949E; font-size: 14px; margin-bottom: 16px; }
    .code {
      font-size: 36px;
      font-weight: 800;
      color: #25D366;
      letter-spacing: 4px;
      background: #0D1117;
      border: 2px solid #25D366;
      border-radius: 12px;
      padding: 20px;
      margin: 16px 0;
      font-family: 'Courier New', monospace;
    }
    .instructions {
      background: #21262D;
      border-radius: 10px;
      padding: 16px;
      font-size: 14px;
      line-height: 2;
      color: #C9D1D9;
      margin: 16px 0;
    }
    .small { color: #8B949E; font-size: 12px; margin-top: 12px; }
    .connected { padding: 20px 0; }
    .check { font-size: 64px; margin-bottom: 16px; }
    .waiting { padding: 20px 0; }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid #30363D;
      border-top-color: #25D366;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .footer { margin-top: 24px; color: #8B949E; font-size: 12px; }
  </style>
  <script>
    // Auto-refresh toutes les 8 secondes si pas encore connecté
    ${!state.connected ? "setTimeout(() => location.reload(), 8000);" : ""}
  </script>
</head>
<body>
  <div class="card">
    <div class="logo">🛡️</div>
    <h1>Spectral Hunter</h1>
    <div class="version">WhatsApp Bot v2.0 — Baileys</div>
    <div class="status">${statusText}</div>
    ${codeSection}
    <div class="footer">Démarré le ${state.startedAt}</div>
  </div>
</body>
</html>`);
  });

  server.listen(PORT, () => {
    logger.info(`✅ Interface web disponible sur le port ${PORT}`);
    if (renderUrl) logger.info(`🌐 URL : ${renderUrl}`);
  });

  // Auto-ping toutes les 4 minutes
  if (renderUrl) {
    setInterval(() => {
      const mod = renderUrl.startsWith("https") ? https : http;
      mod.get(renderUrl + "/status", () => {}).on("error", () => {});
    }, 4 * 60 * 1000);
  }
}

module.exports = { startServer, setPairingCode, setConnected, setSessionActive };
