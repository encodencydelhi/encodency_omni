import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_SUPPORT_COMPANY,
  buildAdminSupportSnapshot,
} from "../data/provider";

test("admin support data stays scoped to the authenticated company", () => {
  const snapshot = buildAdminSupportSnapshot();

  assert.equal(snapshot.company.id, ADMIN_SUPPORT_COMPANY.id);
  assert.ok(snapshot.tickets.length > 0);
  assert.ok(snapshot.tickets.every((ticket) => ticket.companyId === ADMIN_SUPPORT_COMPANY.id));
  assert.ok(snapshot.teams.length >= 2);
  assert.ok(snapshot.activity.length >= 2);
});
