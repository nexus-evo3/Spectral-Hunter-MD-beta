const fs = require("fs");
const path = require("path");

const WHITELIST_FILE = path.join(__dirname, "whitelist.json");

function init() {
  if (!fs.existsSync(WHITELIST_FILE)) {
    fs.writeFileSync(WHITELIST_FILE, JSON.stringify({ whitelist: [] }, null, 2));
  }
}

function load() {
  init();
  return JSON.parse(fs.readFileSync(WHITELIST_FILE, "utf-8"));
}

function save(data) {
  fs.writeFileSync(WHITELIST_FILE, JSON.stringify(data, null, 2));
}

function isWhitelisted(number) {
  return load().whitelist.some((e) => e.number === number);
}

function add(number, addedBy = "admin") {
  const data = load();
  if (isWhitelisted(number)) return false;
  data.whitelist.push({ number, date: new Date().toISOString(), addedBy });
  save(data);
  return true;
}

function remove(number) {
  const data = load();
  const before = data.whitelist.length;
  data.whitelist = data.whitelist.filter((e) => e.number !== number);
  save(data);
  return data.whitelist.length < before;
}

function getAll() {
  return load().whitelist;
}

function exportList() {
  const list = getAll();
  if (list.length === 0) return "✅ La whitelist est vide.";
  return list
    .map(
      (e, i) =>
        `${i + 1}. ✅ ${e.number}\n   Date : ${new Date(e.date).toLocaleDateString("fr-FR")}\n   Ajouté par : ${e.addedBy}`
    )
    .join("\n\n");
}

module.exports = { init, isWhitelisted, add, remove, getAll, exportList };
