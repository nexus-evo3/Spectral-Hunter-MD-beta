const config = require("../config");

// Tracker en mémoire : { number: { count, firstMsg } }
const tracker = {};

function isSpamming(number) {
  const now = Date.now();

  if (!tracker[number]) {
    tracker[number] = { count: 1, firstMsg: now };
    return false;
  }

  const elapsed = now - tracker[number].firstMsg;

  if (elapsed < config.SPAM_WINDOW_MS) {
    tracker[number].count++;
  } else {
    // Réinitialiser après la fenêtre de temps
    tracker[number] = { count: 1, firstMsg: now };
    return false;
  }

  return tracker[number].count > config.SPAM_THRESHOLD;
}

function reset(number) {
  delete tracker[number];
}

module.exports = { isSpamming, reset };
