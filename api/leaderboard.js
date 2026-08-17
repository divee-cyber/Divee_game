// GET -> public sorted roster: level desc, tiebreak = whoever reached that
// level first (earlier levelReachedAt). Fetch-all-and-sort in plain JS
// rather than a scored sorted set — simplest correct approach at
// friends-and-family scale, and trivially unit-testable as array logic.

const { kv, guestKey, ROSTER_KEY } = require('./_kv.js');

const LIMIT = 100;

async function getLeaderboard(kvClient, limit) {
  const ids = (await kvClient.smembers(ROSTER_KEY)) || [];
  if (!ids.length) return [];

  const keys = ids.map(guestKey);
  const records = await kvClient.mget.apply(kvClient, keys);

  const players = records
    .filter(Boolean)
    .sort((a, b) => b.level - a.level || a.levelReachedAt - b.levelReachedAt)
    .slice(0, limit || LIMIT)
    .map((g) => ({ name: g.name, level: g.level, moves: g.moves, levelReachedAt: g.levelReachedAt }));

  return players;
}

module.exports = async function handler(req, res) {
  if (!kv) {
    res.status(500).json({ error: 'kv_unavailable' });
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }
  try {
    const players = await getLeaderboard(kv, LIMIT);
    res.status(200).json({ players });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
};

module.exports.getLeaderboard = getLeaderboard;
