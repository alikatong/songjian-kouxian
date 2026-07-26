require('dotenv').config();
const { pool } = require('../src/config/db');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001/api';
const suffix = String(Date.now()).slice(-8);
const users = [`sa${suffix}`, `sb${suffix}`];

async function request(path, { method = 'GET', token, body, expected = 200 } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status !== expected) {
    throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function run() {
  const password = 'SmokePass123!';
  try {
    const accountA = await request('/auth/register', {
      method: 'POST', body: { username: users[0], password }, expected: 201,
    });
    const accountB = await request('/auth/register', {
      method: 'POST', body: { username: users[1], password }, expected: 201,
    });
    await request('/character/create', {
      method: 'POST', token: accountA.token, body: { name: `TestA${suffix.slice(-4)}`, gender: 'male' }, expected: 201,
    });
    await request('/character/create', {
      method: 'POST', token: accountB.token, body: { name: `TestB${suffix.slice(-4)}`, gender: 'female' }, expected: 201,
    });
    const characters = (await pool.query(
      'SELECT c.id,u.username FROM characters c JOIN users u ON u.id = c.user_id WHERE u.username = ANY($1::text[])',
      [users],
    )).rows;
    const character = characters.find((row) => row.username === users[0]);
    const characterB = characters.find((row) => row.username === users[1]);

    const retreatStarted = await request('/game/retreat/start', { method: 'POST', token: accountA.token });
    if (!retreatStarted.character.retreat.active || retreatStarted.character.qi_per_second !== 0) {
      throw new Error('Retreat did not pause natural cultivation');
    }
    await new Promise((resolve) => setTimeout(resolve, 2100));
    const retreatState = await request('/game', { token: accountA.token });
    if (retreatState.character.current_qi !== retreatStarted.character.current_qi) {
      throw new Error('Natural cultivation continued during retreat');
    }
    const retreatEnded = await request('/game/retreat/end', { method: 'POST', token: accountA.token });
    if (retreatEnded.gained < 1 || retreatEnded.character.retreat.active) {
      throw new Error('Retreat reward was not settled on exit');
    }
    const transparentState = await request('/game', { token: accountA.token });
    const starterArea = transparentState.areas.find((area) => area.code === 'luoxia');
    if (!starterArea || 'drop_rules' in starterArea || 'material_drops' in starterArea || 'encounter' in starterArea
      || 'encounter_base_rate' in starterArea || 'encounter_pity_after' in starterArea) {
      throw new Error('Hidden drop rates or encounter pity leaked into the player area state');
    }
    const [inventoryPage, recipePage, techniquePage, equipmentPage, announcementPage] = await Promise.all([
      request('/game/inventory?page=1', { token: accountA.token }),
      request('/game/recipes?page=1', { token: accountA.token }),
      request('/game/techniques?page=1', { token: accountA.token }),
      request('/game/equipment?page=1', { token: accountA.token }),
      request('/game/announcements?page=1', { token: accountA.token }),
    ]);
    if ([inventoryPage, recipePage, techniquePage, equipmentPage, announcementPage]
      .some((page) => page.page !== 1 || page.pageSize !== 10 || !Array.isArray(page.items))) {
      throw new Error('Player game list pagination response is invalid');
    }
    await pool.query('UPDATE characters SET hp=10000,hp_max=10000,atk=1000,def=500,spd=100 WHERE id=$1', [character.id]);
    await pool.query("UPDATE characters SET pending_enemy_code = 'enemy_luoxia' WHERE id = $1", [character.id]);
    const encounterState = await request('/game', { token: accountA.token });
    if (encounterState.pending_encounter?.code !== 'enemy_luoxia'
      || encounterState.character.stamina?.current !== 100
      || 'material_rate' in encounterState.pending_encounter) {
      throw new Error('Random encounter or stamina state is incomplete');
    }
    const battle = await request('/game/pve/fight', {
      method: 'POST', token: accountA.token, body: { enemy_code: 'enemy_luoxia' },
    });
    if (battle.result !== 'win' || battle.rounds < 1 || !battle.log?.length || battle.stamina_cost !== 8) {
      throw new Error('PVE battle did not produce a valid result and combat log');
    }
    const afterBattle = await request('/game', { token: accountA.token });
    const battleHistory = await request('/game/battles?page=1', { token: accountA.token });
    if (battleHistory.items?.[0]?.enemy_code !== 'enemy_luoxia'
      || battleHistory.pageSize !== 10 || afterBattle.character.stamina.current !== 92) {
      throw new Error('PVE history or stamina consumption was not persisted');
    }
    await pool.query("UPDATE characters SET pending_enemy_code='boss_luoxia' WHERE id=$1", [character.id]);
    await request('/game/pve/fight', {
      method: 'POST', token: accountA.token, body: { enemy_code: 'boss_luoxia' }, expected: 403,
    });
    await pool.query('UPDATE characters SET pending_enemy_code=NULL WHERE id=$1', [character.id]);
    await pool.query(
      `INSERT INTO character_drop_pity (character_id, area_code, category, misses)
       SELECT $1, area_code, category, pity_after - 1 FROM area_drop_rules WHERE area_code = 'luoxia'
       ON CONFLICT (character_id, area_code, category) DO UPDATE SET misses = EXCLUDED.misses`,
      [character.id],
    );
    const exploration = await request('/game/explore', {
      method: 'POST', token: accountA.token, body: { area: 'luoxia' },
    });
    if (exploration.stamina_cost !== 6 || exploration.stamina_remaining !== 86) {
      throw new Error('Exploration stamina cost was not applied');
    }
    const guaranteedDrops = await request('/game/events/choose', {
      method: 'POST', token: accountA.token, body: { choice_index: 0 },
    });
    if (new Set(guaranteedDrops.area_drops.map((drop) => drop.category)).size !== 4
      || guaranteedDrops.area_drops.some((drop) => 'pity_triggered' in drop)) {
      throw new Error('Internal guarantees failed or pity metadata leaked into event results');
    }
    const explorationHistory = await request('/game/explorations?page=1', { token: accountA.token });
    if (explorationHistory.pageSize !== 10 || !Array.isArray(explorationHistory.items)) {
      throw new Error('Exploration history pagination response is invalid');
    }

    await pool.query('UPDATE characters SET spirit_stones=10000 WHERE id=ANY($1::int[])', [[character.id, characterB.id]]);
    const marketState = await request('/market', { token: accountA.token });
    const shop = await request('/market/shop?page=1', { token: accountA.token });
    const sellable = await request('/market/sellable?page=1', { token: accountA.token });
    if (!shop.items.length || shop.page !== 1 || shop.pageSize !== 10 || shop.total < shop.items.length
      || sellable.page !== 1 || sellable.pageSize !== 10 || marketState.system_auction_open !== false) {
      throw new Error('Market state or pagination response is invalid');
    }
    await request('/market/shop/buy', {
      method: 'POST', token: accountA.token, body: { item_code: shop.items[0].code, quantity: 1 },
    });
    const listed = await request('/market/auction/list', {
      method: 'POST', token: accountA.token,
      body: { asset_type: 'item', code: 'mat_mortal_2', quantity: 1, unit_price: 25 }, expected: 201,
    });
    const listings = await request('/market/listings?page=1', { token: accountB.token });
    if (listings.page !== 1 || listings.pageSize !== 10
      || !listings.items.some((listing) => listing.id === listed.listing_id)) {
      throw new Error('Auction listing pagination did not return the new listing');
    }
    await request('/market/auction/buy', {
      method: 'POST', token: accountB.token, body: { listing_id: listed.listing_id },
    });
    const buyerMail = await request('/market/mail', { token: accountB.token });
    const itemMail = buyerMail.items.find((mail) => !mail.claimed && mail.item_code === 'mat_mortal_2');
    if (!itemMail) throw new Error('Purchased auction item did not arrive in buyer mailbox');
    await request('/market/mail/claim', { method: 'POST', token: accountB.token, body: { mail_id: itemMail.id } });
    await request('/market/mail/claim', {
      method: 'POST', token: accountB.token, body: { mail_id: itemMail.id }, expected: 409,
    });
    const sellerMail = await request('/market/mail', { token: accountA.token });
    const stoneMail = sellerMail.items.find((mail) => !mail.claimed && mail.spirit_stones > 0);
    if (!stoneMail) throw new Error('Auction proceeds did not arrive in seller mailbox');
    await request('/market/mail/claim', { method: 'POST', token: accountA.token, body: { mail_id: stoneMail.id } });

    await request('/social/messages', {
      method: 'POST', token: accountA.token,
      body: { channel: 'direct', friend: users[1], body: 'pre-friend check' }, expected: 403,
    });
    await request('/social/messages', {
      method: 'POST', token: accountA.token,
      body: { channel: 'global', body: 'world smoke test' }, expected: 201,
    });
    await request('/social/friends/request', {
      method: 'POST', token: accountA.token, body: { username: users[1] }, expected: 201,
    });
    const socialB = await request('/social/requests?direction=incoming&page=1', { token: accountB.token });
    await request('/social/friends/respond', {
      method: 'POST', token: accountB.token,
      body: { friendship_id: socialB.items[0].id, action: 'accept' },
    });
    await new Promise((resolve) => setTimeout(resolve, 3100));
    await request('/social/messages', {
      method: 'POST', token: accountA.token,
      body: { channel: 'direct', friend: users[1], body: 'friend chat smoke test' }, expected: 201,
    });
    const [friendsPage, messagesPage] = await Promise.all([
      request('/social/friends?page=1', { token: accountA.token }),
      request(`/social/messages?channel=direct&friend=${encodeURIComponent(users[1])}&page=1`, { token: accountA.token }),
    ]);
    if (friendsPage.pageSize !== 10 || messagesPage.pageSize !== 10
      || !friendsPage.items.some((friend) => friend.username === users[1]) || !messagesPage.items.length) {
      throw new Error('Social pagination response is invalid');
    }

    const forging = await request('/game/forge', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'armor_mortal_01' }, expected: 201,
    });
    await pool.query("UPDATE equipment_craft_queue SET finish_at = NOW() - INTERVAL '1 second' WHERE id = $1", [forging.queue.id]);
    await request('/game/forge/collect', {
      method: 'POST', token: accountA.token, body: { queue_id: forging.queue.id },
    });
    await pool.query(
      `INSERT INTO character_equipment (character_id, equipment_id, quantity)
       SELECT $1, id, 2 FROM equipment WHERE code IN ('weapon_mortal_01', 'weapon_dacheng_20')
       ON CONFLICT (character_id, equipment_id) DO UPDATE SET quantity = EXCLUDED.quantity`,
      [character.id],
    );
    await request('/game/equipment/equip', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'weapon_mortal_01' },
    });
    await request('/game/equipment/equip', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'armor_mortal_01' },
    });
    const dualLoadout = await request('/game', { token: accountA.token });
    if (!dualLoadout.character.equipped_weapons.attack || !dualLoadout.character.equipped_weapons.defense) {
      throw new Error('Attack and defense equipment slots were not persisted together');
    }
    await request('/game/equipment/equip', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'weapon_dacheng_20' }, expected: 403,
    });

    await request('/game/equipment/recycle', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'weapon_mortal_01', quantity: 1 }, expected: 409,
    });
    await request('/game/equipment/unequip', {
      method: 'POST', token: accountA.token, body: { slot: 'attack' },
    });
    await request('/game/equipment/protect', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'weapon_mortal_01', locked: true },
    });
    await request('/game/equipment/recycle', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'weapon_mortal_01', quantity: 1 }, expected: 409,
    });
    await request('/game/equipment/protect', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'weapon_mortal_01', locked: false },
    });
    const recycledWeapon = await request('/game/equipment/recycle', {
      method: 'POST', token: accountA.token, body: { equipment_code: 'weapon_mortal_01', quantity: 2 },
    });
    if (!recycledWeapon.returned.some((item) => item.quantity === 1)) {
      throw new Error('Equipment recycling did not return the expected floored 30% material');
    }

    await request('/game/items/protect', {
      method: 'POST', token: accountA.token, body: { item_code: 'mat_mortal_1', locked: true },
    });
    await request('/game/items/recycle', {
      method: 'POST', token: accountA.token, body: { item_code: 'mat_mortal_1', quantity: 4 }, expected: 409,
    });
    await request('/game/items/protect', {
      method: 'POST', token: accountA.token, body: { item_code: 'mat_mortal_1', locked: false },
    });
    const recycledMaterial = await request('/game/items/recycle', {
      method: 'POST', token: accountA.token, body: { item_code: 'mat_mortal_1', quantity: 4 },
    });
    if (recycledMaterial.returned[0]?.code !== 'mat_mortal_1' || recycledMaterial.returned[0]?.quantity !== 1) {
      throw new Error('Item recycling did not return floor(4 * 30%) = 1 material');
    }

    await pool.query(
      `INSERT INTO inventories (character_id, item_id, quantity)
       SELECT $1, id, 2 FROM items WHERE code = 'stamina_pill_mortal'
       ON CONFLICT (character_id, item_id) DO UPDATE SET quantity = inventories.quantity + 2`,
      [character.id],
    );
    await pool.query(
      `UPDATE characters SET realm_id=(SELECT id FROM realms WHERE code='mortal'), stamina=95,
         stamina_updated_at=NOW() WHERE id=$1`, [character.id],
    );
    await request('/game/items/use', {
      method: 'POST', token: accountA.token, body: { item_code: 'stamina_pill_mortal' },
    });
    const overfilledStamina = await request('/game', { token: accountA.token });
    if (overfilledStamina.character.stamina.current <= 100) throw new Error('Stamina pill did not allow overfilling beyond 100');
    await pool.query(
      `UPDATE characters SET realm_id = (SELECT id FROM realms WHERE code = 'lianpi_early'), stamina = 50
       WHERE id = $1`,
      [character.id],
    );
    await request('/game/items/use', {
      method: 'POST', token: accountA.token, body: { item_code: 'stamina_pill_mortal' }, expected: 409,
    });

    await pool.query(
      `UPDATE characters SET realm_id=(SELECT id FROM realms WHERE code='mortal'),
         current_qi=(SELECT qi_required FROM realms WHERE code='mortal') WHERE id=$1`, [character.id],
    );
    await pool.query(
      `INSERT INTO battle_logs(character_id,enemy_code,result,rounds,loot)
       VALUES($1,'boss_luoxia','win',1,'{}'::jsonb)`, [character.id],
    );
    await request('/character/breakthrough', { method: 'POST', token: accountA.token, body: {}, expected: 400 });

    console.log('API smoke passed: retreat, hidden probabilities, PVE gates, forging, social, market, mailbox, stamina overflow, breakthrough pills, and recycling');
  } finally {
    await pool.query('DELETE FROM users WHERE username = ANY($1::text[])', [users]);
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
