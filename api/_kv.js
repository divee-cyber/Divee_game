// Shared helpers for the guest/progress/leaderboard API routes.

let kvClient = null;
try {
  // Lazily tolerate this being unavailable (e.g. running a plain Node
  // script locally against a hand-rolled mock instead of a real deploy).
  kvClient = require('@vercel/kv').kv;
} catch (e) {
  kvClient = null;
}

const NAME_MIN = 1;
const NAME_MAX = 20;
const ROSTER_KEY = 'guestIds';

function guestKey(id) {
  return 'guest:' + id;
}

function nameKey(normalizedLowercaseName) {
  return 'name:' + normalizedLowercaseName;
}

// Trim/collapse whitespace, enforce length. Returns null if invalid.
function normalizeName(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) return null;
  return trimmed;
}

// The index key is case-insensitive so "Alex" and "alex" collide on purpose.
function nameIndexKeyFrom(displayName) {
  return nameKey(displayName.toLowerCase());
}

function isValidGuestId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(id);
}

function isValidLevelMoves(level, moves) {
  return Number.isInteger(level) && level >= 1 && level <= 1000 &&
    Number.isInteger(moves) && moves >= 0 && moves <= 10000000;
}

module.exports = {
  kv: kvClient,
  guestKey,
  nameKey,
  ROSTER_KEY,
  normalizeName,
  nameIndexKeyFrom,
  isValidGuestId,
  isValidLevelMoves
};
