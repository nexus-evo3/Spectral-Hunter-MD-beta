const fs = require("fs");
const path = require("path");

const BLACKLIST_FILE = path.join(__dirname, "blacklist.json");

// Initialiser le fichier blacklist s'il n'existe pas
function init() {
  if (!fs.existsSync(BLACKLIST_FILE)) {
    fs.writeFileSync(BLACKLIST_FILE, JSON.stringify({ blacklist: [] }, null, 2));
  }
}

// Lire la blacklist
function load() {
  init();
  const data = fs.readFileSync(BLACKLIST_FILE, "utf-8");
  return JSON.parse(data);
}

// Sauvegarder la blacklist
function save(data) {
  fs.writeFileSync(BLACKLIST_FILE, JSON.stringify(data, null, 2));
}

// Vérifier si un numéro est blacklisté
function isBlacklisted(number) {
  const data = load();
  return data.blacklist.some((entry) => entry.number === number);
}

// Ajouter un numéro à la blacklist
function add(number, reason = "Non spécifié", addedBy = "auto") {
  const data = load();
  if (isBlacklisted(number)) return false;

  data.blacklist.push({
    number,
    reason,
    date: new Date().toISOString(),
    addedBy,
  });

  save(data);
  return true;
}

// Retirer un numéro de la blacklist
function remove(number) {
  const data = load();
  const before = data.blacklist.length;
  data.blacklist = data.blacklist.filter((e) => e.number !== number);
  save(data);
  return data.blacklist.length < before;
}

// Vider la blacklist
function clear() {
  save({ blacklist: [] });
}

// Obtenir toute la blacklist
function getAll() {
  return load().blacklist;
}

// Exporter la blacklist en texte lisible
function exportList() {
  const list = getAll();
  if (list.length === 0) return "✅ La blacklist est vide.";
  return list
    .map(
      (e, i) =>
        `${i + 1}. 📵 ${e.number}\n   Raison : ${e.reason}\n   Date : ${new Date(e.date).toLocaleDateString("fr-FR")}\n   Ajouté par : ${e.addedBy}`
    )
    .join("\n\n");
}

module.exports = { init, isBlacklisted, add, remove, clear, getAll, exportList };
