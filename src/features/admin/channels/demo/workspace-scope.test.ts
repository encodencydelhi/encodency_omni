import assert from "node:assert/strict";
import test from "node:test";
import { scopeNumber, whatsappWorkspaceScope } from "./workspace-scope";
import { nativeScopeHeaders } from "./native-api";

const NUMBER = "22222222-2222-4222-8222-222222222222";

test("a chosen WhatsApp number is part of the scope, so caches and drafts are per number", () => {
  const primary = whatsappWorkspaceScope("co", "cl", "user");
  const second = whatsappWorkspaceScope("co", "cl", "user", NUMBER);
  assert.notEqual(primary, second);
  assert.equal(scopeNumber(primary), "");
  assert.equal(scopeNumber(second), NUMBER);
  // Without a signed-in user id the number still lands in the same position.
  assert.equal(scopeNumber(whatsappWorkspaceScope("co", "cl", undefined, NUMBER)), NUMBER);
  // The old shape is unchanged when no number is chosen.
  assert.equal(whatsappWorkspaceScope("co", "cl", "user"), JSON.stringify(["whatsapp", "co", "cl", "user"]));
});

test("requests send the chosen number only when one is chosen", () => {
  assert.deepEqual(nativeScopeHeaders(whatsappWorkspaceScope("co", "cl", "user")), { "x-company-id": "co", "x-client-id": "cl" });
  assert.deepEqual(nativeScopeHeaders(whatsappWorkspaceScope("co", "cl", "user", NUMBER)), { "x-company-id": "co", "x-client-id": "cl", "x-whatsapp-connection-id": NUMBER });
});
