function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

module.exports = { slugify, toMoney };
