import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CrmCursorController } from './crm-cursor-controller';
import type { CrmPage } from './crm-pagination';

const page = (id: string, next: string | null = null): CrmPage<{ id: string }> => ({ items: [{ id }], page: { hasMore: next !== null, nextCursor: next } });

describe('one-page CRM cursor navigation', () => {
  it('fetches one page at a time and supports previous/next without retaining record pages', async () => {
    const cursors: Array<string | undefined> = [];
    const controller = new CrmCursorController<{ id: string }>();
    await controller.configure('company/client/filter', async cursor => { cursors.push(cursor); return cursor ? page('second') : page('first', 'cursor-2'); });
    assert.deepEqual(cursors, [undefined]);
    await controller.nextFor('company/client/filter');
    assert.deepEqual(controller.getSnapshot().rows, [{ id: 'second' }]);
    assert.deepEqual(controller.getSnapshot().history, [undefined]);
    await controller.previousFor('company/client/filter');
    assert.deepEqual(controller.getSnapshot().rows, [{ id: 'first' }]);
    assert.deepEqual(cursors, [undefined, 'cursor-2', undefined]);
  });
  it('can traverse beyond 10,000 records while retaining only the current record page', async () => {
    const controller = new CrmCursorController<{ id: string }>();
    let calls = 0;
    await controller.configure('scope', async cursor => {
      calls++; const index = Number(cursor ?? 0);
      return { items: Array.from({ length: 100 }, (_, i) => ({ id: `${index * 100 + i}` })), page: { hasMore: index < 100, nextCursor: index < 100 ? String(index + 1) : null } };
    });
    for (let i = 0; i < 100; i++) await controller.nextFor('scope');
    assert.equal(calls, 101); assert.equal(controller.getSnapshot().rows.length, 100);
    assert.equal(controller.getSnapshot().rows[0]?.id, '10000'); assert.equal(controller.getSnapshot().hasMore, false);
  });
  it('resets cursor history when a search/filter or tenant scope changes', async () => {
    const controller = new CrmCursorController<{ id: string }>();
    await controller.configure('scope-a/search-a', async cursor => cursor ? page('a2') : page('a1', 'a-next'));
    await controller.nextFor('scope-a/search-a');
    const seen: Array<string | undefined> = [];
    await controller.configure('scope-b/search-b', async cursor => { seen.push(cursor); return page('b1'); });
    assert.deepEqual(seen, [undefined]); assert.deepEqual(controller.getSnapshot().history, []);
    assert.deepEqual(controller.getSnapshot().rows, [{ id: 'b1' }]);
    await controller.nextFor('scope-a/search-a'); controller.updateFor('scope-a/search-a', [{ id: 'stale mutation' }]);
    assert.deepEqual(controller.getSnapshot().rows, [{ id: 'b1' }]);
  });
  it('ignores an old tenant response arriving after the new scope loaded', async () => {
    const controller = new CrmCursorController<{ id: string }>(); let release!: (value: CrmPage<{ id: string }>) => void;
    const old = controller.configure('tenant-a', () => new Promise(resolve => { release = resolve; }));
    await controller.configure('tenant-b', async () => page('b'));
    release(page('private-a')); await old;
    assert.deepEqual(controller.getSnapshot().rows, [{ id: 'b' }]);
  });
  it('does not publish partial/stale records on later-page failure and retries the same cursor', async () => {
    const controller = new CrmCursorController<{ id: string }>(); let fail = true;
    await controller.configure('scope', async cursor => { if (!cursor) return page('first', 'second'); if (fail) throw new Error('page failed'); return page('recovered'); });
    await controller.nextFor('scope'); assert.equal(controller.getSnapshot().rows.length, 0);
    assert.match(String(controller.getSnapshot().error), /page failed/); assert.equal(controller.getSnapshot().cursor, 'second');
    fail = false; await controller.reloadFor('scope'); assert.deepEqual(controller.getSnapshot().rows, [{ id: 'recovered' }]);
  });
  it('does not start duplicate requests while the next page is pending', async () => {
    const controller = new CrmCursorController<{ id: string }>(); let calls = 0; let release!: (value: CrmPage<{ id: string }>) => void;
    await controller.configure('scope', async cursor => { calls++; return cursor ? new Promise(resolve => { release = resolve; }) : page('first', 'second'); });
    const next = controller.nextFor('scope'); await controller.nextFor('scope'); assert.equal(calls, 2);
    release(page('second')); await next;
  });
  it('rejects repeated cursors and observes rejected responses after unmount without overwriting state', async () => {
    const controller = new CrmCursorController<{ id: string }>();
    await controller.configure('scope', async cursor => page('record', cursor ?? 'next'));
    await controller.nextFor('scope'); assert.match(String(controller.getSnapshot().error), /invalid page cursor/);
    let reject!: (reason: Error) => void;
    const pending = controller.configure('other', () => new Promise((_, fail) => { reject = fail; }));
    controller.invalidate(); reject(new Error('late error')); await pending;
    assert.equal(controller.getSnapshot().error, null);
  });
});
