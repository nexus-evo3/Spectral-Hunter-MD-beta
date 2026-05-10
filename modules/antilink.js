const LINK_PATTERNS = [
  /https?:\/\//i,
  /chat\.whatsapp\.com\//i,
  /wa\.me\//i,
  /bit\.ly\//i,
  /t\.me\//i,
  /www\./i,
  /\.(com|net|org|io|gg|xyz|link)\b/i,
];

function containsLink(text) {
  if (!text) return false;
  return LINK_PATTERNS.some((pattern) => pattern.test(text));
}

module.exports = { containsLink };
