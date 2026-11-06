import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.NEXT_PUBLIC_DATA_SOURCE = 'api';
process.env.NEXT_PUBLIC_API_BASE_URL = '/api/v1';
const { crmApi } = await import('./crm-api');
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

describe('CRM paginated live API contract', () => {
  it('sends search and membership filters to the server rather than filtering only loaded records', async () => {
    globalThis.fetch = async (url, init) => {
      const parsed = new URL(String(url), 'https://app.test');
      assert.equal(parsed.searchParams.get('search'), 'older record');
      assert.equal(parsed.searchParams.get('status'), 'active');
      assert.equal(parsed.searchParams.get('tag'), 'customer');
      assert.equal(parsed.searchParams.get('group'), 'newsletter');
      assert.equal(new Headers(init?.headers).get('x-client-id'), 'client');
      return Response.json({ items: [], page: { hasMore: false, nextCursor: null } });
    };
    await crmApi.listPage('contact', { search: 'older record', status: 'active', tag: 'customer', group: 'newsletter', limit: 25 }, { companyId: 'company', clientId: 'client' });
  });
  it('requests every continuation from the real transport with unchanged tenant scope', async () => {
    const calls: Array<{ url: string; headers: Headers }> = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), headers: new Headers(init?.headers) });
      return Response.json(calls.length === 1
        ? { items: [{ id: 'one' }], page: { hasMore: true, nextCursor: 'next-token' } }
        : { items: [{ id: 'two' }], page: { hasMore: false, nextCursor: null } });
    };
    assert.deepEqual(await crmApi.list('lead', { companyId: 'company-one', clientId: 'client-one' }), [{ id: 'one' }, { id: 'two' }]);
    assert.deepEqual(calls.map(call => call.url), ['/api/v1/crm/lead/page?limit=200', '/api/v1/crm/lead/page?cursor=next-token&limit=200']);
    for (const call of calls) {
      assert.equal(call.headers.get('x-company-id'), 'company-one');
      assert.equal(call.headers.get('x-client-id'), 'client-one');
    }
  });
  it('exposes individual page metadata to incremental consumers', async () => {
    globalThis.fetch = async (url) => {
      assert.equal(String(url), '/api/v1/crm/contact/page?cursor=previous&limit=10');
      return Response.json({ items: [], page: { hasMore: false, nextCursor: null } });
    };
    assert.deepEqual(await crmApi.listPage('contact', { cursor: 'previous', limit: 10 }, { companyId: 'company', clientId: 'client' }), { items: [], page: { hasMore: false, nextCursor: null } });
  });
});
