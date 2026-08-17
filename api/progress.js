// GET  ?guestId=<id>                          -> current stored progress
// POST {guestId, level, moves}                -> monotonic upsert
//
// Progress can only be synced for an already-registered guest (one that
// went through /api/guest register|claim) — a player who skipped naming
// never calls this at all, so single-player play never depends on it.

const { kv, guestKey, isValidGuestId, isValidLevelMoves } = require('./_kv.js');

async function getProgress(kvClient, guestId) {
  if (!isValidGuestId(guestId)) return { error: 'invalid_guest_id' };
  const guest = await kvClient.get(guestKey(guestId));
  if (!guest) return { error: 'not_found' };
  return { ok: true, guest };
}

async function upsertProgress(kvClient, body) {
  const guestId = body && body.guestId;
  const level = body && body.level;
  const moves = body && body.moves;
  if (!isValidGuestId(guestId)) return { error: 'invalid_guest_id' };
  if (!isValidLevelMoves(level, moves)) return { error: 'invalid_progress' };

  const existing = await kvClient.get(guestKey(guestId));
  if (!existing) return { error: 'not_found' };

  const newLevel = Math.max(existing.level, level);
  const newMoves = Math.max(existing.moves, moves);
  const now = Date.now();
  const updated = Object.assign({}, existing, {
    level: newLevel,
    moves: newMoves,
    levelReachedAt: newLevel > existing.level ? now : existing.levelReachedAt,
    updatedAt: now
  });

  await kvClient.set(guestKey(guestId), updated);
  return { ok: true, guest: updated };
}

module.exports = async function handler(req, res) {
  if (!kv) {
    res.status(500).json({ error: 'kv_unavailable' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const result = await getProgress(kv, req.query.guestId);
      if (result.error === 'not_found') { res.status(404).json(result); return; }
      if (result.error) { res.status(400).json(result); return; }
      res.status(200).json(result);
      return;
    }
    if (req.method === 'POST') {
      const result = await upsertProgress(kv, req.body || {});
      if (result.error === 'not_found') { res.status(404).json(result); return; }
      if (result.error) { res.status(400).json(result); return; }
      res.status(200).json(result);
      return;
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
};

module.exports.getProgress = getProgress;
module.exports.upsertProgress = upsertProgress;
