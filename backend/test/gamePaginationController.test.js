const test = require('node:test');
const assert = require('node:assert/strict');

function loadInventoryController(client) {
  const dbPath = require.resolve('../src/config/db');
  const servicePath = require.resolve('../src/services/gameService');
  const controllerPath = require.resolve('../src/controllers/gameController');
  const db = require(dbPath);
  const gameService = require(servicePath);
  const originalTransaction = db.withTransaction;
  const originalCharacterLookup = gameService.getCharacterRow;

  db.withTransaction = async (work) => work(client);
  gameService.getCharacterRow = async () => ({ id: 7, major_realm: '凡人' });
  delete require.cache[controllerPath];
  const controller = require(controllerPath);

  return {
    controller,
    restore() {
      db.withTransaction = originalTransaction;
      gameService.getCharacterRow = originalCharacterLookup;
      delete require.cache[controllerPath];
    },
  };
}

test('inventory controller uses a ten-item SQL page and preserves the filtered total', async () => {
  const calls = [];
  const rows = Array.from({ length: 10 }, (_, index) => ({
    id: index + 1,
    code: `mat_${index + 1}`,
    name: `材料 ${index + 1}`,
    type: 'material',
    rarity: 'common',
    description: '',
    effect: {},
    image_url: null,
    source_description: '测试来源',
    major_realm: '凡人',
    quantity: 1,
    locked: false,
    used_once: false,
  }));
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('COUNT(*)::int AS total') && sql.includes('FROM inventories inv')) {
        return { rows: [{ total: 23 }] };
      }
      if (sql.includes('SELECT i.id, i.code') && sql.includes('FROM inventories inv')) {
        return { rows };
      }
      if (sql.includes('FROM area_material_drops amd')) return { rows: [] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const { controller, restore } = loadInventoryController(client);
  const response = {
    body: null,
    json(body) { this.body = body; return this; },
  };
  try {
    await controller.getInventory({
      user: { userId: 1 },
      query: { page: '2', category: 'material' },
    }, response, (error) => { throw error; });
  } finally {
    restore();
  }

  assert.deepEqual(response.body, {
    items: rows.map((item) => ({
      ...item,
      effect_summary: '暂无可主动使用的效果',
      source_areas: [],
    })),
    total: 23,
    page: 2,
    pageSize: 10,
    totalPages: 3,
  });
  const pageQuery = calls.find(({ sql }) => sql.includes('LIMIT $6 OFFSET $7'));
  assert.deepEqual(pageQuery.params.slice(-2), [10, 10]);
});

test('equipment controller separates count parameters from the equipability query', async () => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      if (sql.includes('COUNT(*)::int AS total') && sql.includes('FROM equipment e')) {
        return { rows: [{ total: 11 }] };
      }
      if (sql.includes('SELECT e.code, e.name') && sql.includes('FROM equipment e')) {
        return { rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const { controller, restore } = loadInventoryController(client);
  const response = {
    body: null,
    json(body) { this.body = body; return this; },
  };
  try {
    await controller.getEquipment({
      user: { userId: 1 },
      query: { page: '2', category: 'owned' },
    }, response, (error) => { throw error; });
  } finally {
    restore();
  }

  assert.deepEqual(response.body, { items: [], total: 11, page: 2, pageSize: 10, totalPages: 2 });
  const countQuery = calls.find(({ sql }) => sql.includes('COUNT(*)::int AS total') && sql.includes('FROM equipment e'));
  const pageQuery = calls.find(({ sql }) => sql.includes('SELECT e.code, e.name') && sql.includes('FROM equipment e'));
  assert.deepEqual(countQuery.params, [7, '凡人', null, null, 'owned']);
  assert.deepEqual(pageQuery.params, [7, undefined, '凡人', null, null, 'owned', 10, 10]);
});
