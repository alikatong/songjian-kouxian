const test = require('node:test');
const assert = require('node:assert/strict');
const asyncHandler = require('../src/middleware/asyncHandler');

test('async handler forwards synchronous and asynchronous failures', async () => {
  for (const failure of [new Error('sync'), new Error('async')]) {
    const handler = asyncHandler(() => {
      if (failure.message === 'sync') throw failure;
      return Promise.reject(failure);
    });
    const forwarded = await new Promise((resolve) => handler({}, {}, resolve));
    assert.equal(forwarded, failure);
  }
});
