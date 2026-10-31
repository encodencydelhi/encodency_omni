import assert from 'node:assert/strict';
import test from 'node:test';
import { selectedPublishingTarget } from '../publishing-destination';
import { immediateScheduledFor } from '../schedule-datetime';
import type { PublishTarget } from '../scheduling-api';

const targets = [
  { resourceMappingId: 'page-a', externalResourceId: '101', publishable: true },
  { resourceMappingId: 'page-b', externalResourceId: '202', publishable: true },
] as PublishTarget[];

test('multiple destinations require a choice and never auto-select the first account', () => {
  assert.equal(selectedPublishingTarget(targets, undefined), null);
  assert.equal(selectedPublishingTarget(targets, ''), null);
  assert.equal(selectedPublishingTarget(targets, 'page-b')?.externalResourceId, '202');
});
test('removed or no-longer-publishable destinations cannot silently switch accounts', () => {
  assert.equal(selectedPublishingTarget(targets, 'other-client-page'), null);
  assert.equal(selectedPublishingTarget([{ ...targets[1]!, publishable: false }], 'page-b'), null);
});
test('queue timing matches the three-minute confirmation shown to the user', () => {
  const now = new Date('2026-10-30T10:00:00Z');
  assert.equal(new Date(immediateScheduledFor(now)).getTime() - now.getTime(), 180000);
});
