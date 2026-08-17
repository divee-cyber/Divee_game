// GET  ?name=<name>              -> availability / lookup by display name
// POST {action:'register', guestId, name, level, moves}
// POST {action:'claim',    guestId, name}   -> adopt an existing named guest's identity
//
// Core logic is exported separately from the req/res handler so it can be
// exercised directly (against a real @vercel/kv client OR a hand-rolled
// mock) from a plain Node script, without needing `vercel dev`.

const {
  kv,
  guestKey,
  ROSTER_KEY,
  normalizeName,
  nameIndexKeyFrom,
  isValidGuestId,
  isValidLevelMoves
} = require('./_kv.js');

async function lookupByName(kvClient, rawName) {
  const name = normalizeName(rawName);
  if (!name) return { error: 'invalid_name' };

  const nameIdxKey = nameIndexKeyFrom(name);
  const existingGuestId = await kvClient.get(nameIdxKey);
  if (!existingGuestId) return { available: true };

  const guest = await kvClient.get(guestKey(existingGuestId));
  if (!guest) return { available: true }; // stale index entry — treat as free

  return { available: false, guestId: guest.guestId, name: guest.name, level: guest.level, moves: guest.moves };
}

async function registerOrClaim(kvClient, body) {
  const action = body && body.action;
  if (action !== 'register' && action !== 'claim') return { error: 'invalid_action' };

  const name = normalizeName(body.name);
  if (!name) return { error: 'invalid_name' };

  const nameIdxKey = nameIndexKeyFrom(name);
  const existingGuestId = await kvClient.get(nameIdxKey);

  if (action === 'claim') {
    if (!existingGuestId) return { error: 'name_not_found' };
    const guest = await kvClient.get(guestKey(existingGuestId));
    if (!guest) return { error: 'name_not_found' };
    return { ok: true, guest };
  }

  // action === 'register'
  if (!isValidGuestId(body.guestId)) return { error: 'invalid_guest_id' };
  const level = Number.isInteger(body.level) ? body.level : 1;
  const moves = Number.isInteger(body.moves) ? body.moves : 0;
  if (!isValidLevelMoves(level, moves)) return { error: 'invalid_progress' };

  if (existingGuestId && existingGuestId !== body.guestId) {
    const existingGuest = await kvClient.get(guestKey(existingGuestId));
    return { error: 'name_taken', existing: existingGuest || null };
  }

  const now = Date.now();
  const previous = await kvClient.get(guestKey(body.guestId));
  const guest = {
    guestId: body.guestId,
    name,
    level,
    moves,
    levelReachedAt: (previous && previous.levelReachedAt) || now,
    createdAt: (previous && previous.createdAt) || now,
    updatedAt: now
  };

  await kvClient.set(guestKey(body.guestId), guest);
  await kvClient.set(nameIdxKey, body.guestId);
  await kvClient.sadd(ROSTER_KEY, body.guestId);

  return { ok: true, guest };
}

module.exports = async function handler(req, res) {
  if (!kv) {
    res.status(500).json({ error: 'kv_unavailable' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const result = await lookupByName(kv, req.query.name);
      if (result.error) { res.status(400).json(result); return; }
      res.status(200).json(result);
      return;
    }
    if (req.method === 'POST') {
      const result = await registerOrClaim(kv, req.body || {});
      if (result.error === 'name_taken') { res.status(409).json(result); return; }
      if (result.error === 'name_not_found') { res.status(404).json(result); return; }
      if (result.error) { res.status(400).json(result); return; }
      res.status(200).json(result);
      return;
    }
    res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    res.status(500).json({ error: 'server_error' });
  }
};

module.exports.lookupByName = lookupByName;
module.exports.registerOrClaim = registerOrClaim;
