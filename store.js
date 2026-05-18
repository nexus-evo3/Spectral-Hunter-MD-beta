const fs = require("fs");
const path = require("path");

const STORE_FILE = path.join(__dirname, "store.json");

const DEFAULTS = {
  fortress: false,
  antilink: false,
  antispam: false,
  adminwatch: true,
  welcome: { enabled: false, message: "👋 Bienvenue {name} dans le groupe !" },
  goodbye: { enabled: false, message: "👋 Au revoir {name} !" },
  mutedUsers: [],
  attackLog: [],
  membersBackup: {},
  stickerBindings: {},
};

function load() {
  if (!fs.existsSync(STORE_FILE)) {
    fs.writeFileSync(STORE_FILE, JSON.stringify(DEFAULTS, null, 2));
    return { ...DEFAULTS };
  }
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STORE_FILE, "utf-8")) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(data) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

function get(key) { return load()[key]; }

function set(key, value) {
  const data = load();
  data[key] = value;
  save(data);
}

function push(key, item) {
  const data = load();
  if (!Array.isArray(data[key])) data[key] = [];
  data[key].push(item);
  save(data);
}

module.exports = { get, set, push, load, save };
