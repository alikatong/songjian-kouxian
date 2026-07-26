const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../src/config/db');

function controllerWithClient(client) {
  const controllerPath = require.resolve('../src/controllers/socialController');
  const originalWithTransaction = db.withTransaction;
  db.withTransaction = async (work) => work(client);
  delete require.cache[controllerPath];
  const controller = require(controllerPath);
  db.withTransaction = originalWithTransaction;
  delete require.cache[controllerPath];
  return controller;
}

async function invoke(handler, req) {
  let status = 200;
  let body;
  let forwarded;
  const res = {
    status(code) { status = code; return this; },
    json(payload) { body = payload; return payload; },
  };
  await handler(req, res, (error) => { forwarded = error; });
  if (forwarded) throw forwarded;
  return { status, body };
}

test('social list endpoints use a fixed ten-item page and preserve totals out of range', async () => {
  const calls = [];
  const controller = controllerWithClient({
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      if (sql.includes('SELECT count(*)')) return { rows: [{ count: '21' }] };
      return { rows: [] };
    },
  });
  const baseRequest = { user: { userId: 7 } };

  const friends = await invoke(controller.getFriends, { ...baseRequest, query: { page: '4' } });
  assert.deepEqual(friends, {
    status: 200,
    body: { items: [], total: 21, page: 4, pageSize: 10, totalPages: 3 },
  });

  const requests = await invoke(controller.getFriendRequests, {
    ...baseRequest, query: { direction: 'outgoing', page: '3' },
  });
  assert.deepEqual(requests.body, { items: [], total: 21, page: 3, pageSize: 10, totalPages: 3 });

  const search = await invoke(controller.searchPlayers, {
    ...baseRequest, query: { q: 'tester', page: '2' },
  });
  assert.deepEqual(search.body, { items: [], total: 21, page: 2, pageSize: 10, totalPages: 3 });

  assert.ok(calls.some(({ params }) => params.length === 3
    && params[0] === 7 && params[1] === 10 && params[2] === 30));
  assert.ok(calls.some(({ params }) => params.length === 3
    && params[0] === 7 && params[1] === 10 && params[2] === 20));
  assert.ok(calls.some(({ params }) => params.length === 4
    && params[0] === 7 && params[1] === '%tester%' && params[2] === 10 && params[3] === 10));
});

test('direct messages retain friendship validation and return a paged chronological page', async () => {
  const calls = [];
  const controller = controllerWithClient({
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      if (sql.includes('SELECT id, username FROM users')) return { rows: [{ id: 8, username: 'friend' }] };
      if (sql.includes('SELECT id FROM friendships')) return { rows: [{ id: 5 }] };
      if (sql.includes('SELECT count(*) FROM chat_messages')) return { rows: [{ count: '11' }] };
      if (sql.includes('SELECT m.id, m.body')) {
        return { rows: [{ id: '12', body: 'new' }, { id: '11', body: 'old' }] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  });

  const response = await invoke(controller.getMessages, {
    user: { userId: 7 },
    query: { channel: 'direct', friend: 'friend', page: '2' },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    items: [{ id: '11', body: 'old' }, { id: '12', body: 'new' }],
    total: 11,
    page: 2,
    pageSize: 10,
    totalPages: 2,
  });
  assert.ok(calls.some(({ params }) => params.length === 4
    && params[0] === 7 && params[1] === 8 && params[2] === 10 && params[3] === 10));
  const chatQueries = calls.filter(({ sql }) => sql.includes('chat_messages'));
  assert.ok(chatQueries.length >= 2);
  assert.ok(chatQueries.every(({ sql }) => sql.includes("moderation_status = 'visible'")));
});

test('friend request direction is validated before querying', async () => {
  const controller = controllerWithClient({ query: async () => { throw new Error('should not query'); } });
  const response = await invoke(controller.getFriendRequests, {
    user: { userId: 7 }, query: { direction: 'sideways' },
  });
  assert.equal(response.status, 400);
  assert.equal(response.body.error, '好友申请方向无效');
});
