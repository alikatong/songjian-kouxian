const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PLAYER_PAGE_SIZE,
  playerPaging,
  pagedResult,
} = require('../src/utils/playerPagination');

test('player pagination always uses ten rows and normalizes invalid pages', () => {
  assert.equal(PLAYER_PAGE_SIZE, 10);
  assert.deepEqual(playerPaging({ query: {} }), { page: 1, limit: 10, offset: 0 });
  assert.deepEqual(playerPaging({ query: { page: '3' } }), { page: 3, limit: 10, offset: 20 });
  assert.deepEqual(playerPaging({ query: { page: '0' } }), { page: 1, limit: 10, offset: 0 });
  assert.deepEqual(playerPaging({ query: { page: 'nope' } }), { page: 1, limit: 10, offset: 0 });
});

test('paged results retain totals for empty out-of-range pages', () => {
  assert.deepEqual(pagedResult([], 23, 9), {
    items: [], total: 23, page: 9, pageSize: 10, totalPages: 3,
  });
});
