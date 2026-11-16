import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { collectCrmPages } from './crm-pagination';

describe('CRM array compatibility pagination', () => {
  it('loads records beyond the old 500 limit using server cursors', async () => {
    const cursors: Array<string | undefined> = [];
    const result = await collectCrmPages<number>(async cursor => {
      cursors.push(cursor);
      const page = cursor ? Number(cursor) : 0;
      return { items: Array.from({ length: 200 }, (_, i) => page * 200 + i), page: { hasMore: page < 2, nextCursor: page < 2 ? String(page + 1) : null } };
    });
    assert.equal(result.length, 600);
    assert.equal(result[599], 599);
    assert.deepEqual(cursors, [undefined, '1', '2']);
  });
  it('propagates later-page failures instead of displaying an incomplete success', async () => {
    await assert.rejects(collectCrmPages(async cursor => {
      if (cursor) throw new Error('request failed');
      return { items: [1], page: { hasMore: true, nextCursor: 'next' } };
    }), /request failed/);
  });
  it('rejects repeated cursors rather than looping', async () => {
    await assert.rejects(collectCrmPages(async () => ({ items: [1], page: { hasMore: true, nextCursor: 'same' } })), /repeated/);
  });
  it('bounds automatic loading and rejects overflow instead of truncating silently', async () => {
    let calls = 0;
    await assert.rejects(collectCrmPages(async () => ({ items: [1], page: { hasMore: true, nextCursor: String(++calls) } }), 3), /safe loading limit/);
    assert.equal(calls, 3);
  });
  it('returns empty records when the first page is empty', async () => {
    assert.deepEqual(await collectCrmPages(async () => ({ items: [], page: { hasMore: false, nextCursor: null } })), []);
  });
});
