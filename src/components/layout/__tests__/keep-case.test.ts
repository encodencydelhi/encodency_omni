import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasKeepCaseToken } from "../keep-case";

describe("keeping the case of emails and website addresses", () => {
  it("recognises emails", () => {
    for (const text of ["manishsirohi023@gmail.com", "Email: mohit.tyagi@encodency.com", "admin+test@sub.example.co.in", "Contact (a@b.io)"]) {
      assert.equal(hasKeepCaseToken(text), true, text);
    }
  });

  it("recognises website addresses and domains, with or without a scheme", () => {
    for (const text of ["https://omni.vruumcab.com/super-admin", "http://localhost:3000/x", "www.designhouse.co.in", "bharatorganicexpo.com", "Client Workspace · web.ensis.in", "Open acme.in/pricing?x=1 now", "mokshasewa.org"]) {
      assert.equal(hasKeepCaseToken(text), true, text);
    }
  });

  it("recognises record ids", () => {
    for (const text of ["a6577b9c-9745-44b0-a17d-6f408b64ecdf", "Subscription ID f1f286cc-82e8-4322-b0dd-f402e4cc0762"]) {
      assert.equal(hasKeepCaseToken(text), true, text);
    }
  });

  it("recognises measurements whose unit must stay lower case", () => {
    for (const text of ["2.6 s", "123 ms", "· 840 ms", "28 Oct 2026, 10:59 am", "12 MB", "4.5 kbps"]) {
      assert.equal(hasKeepCaseToken(text), true, text);
    }
  });

  it("leaves ordinary words, numbers and abbreviations alone", () => {
    for (const text of ["", "Total Companies", "5 Seconds ago", "30 sessions", "Last 7 days", "3 Users", "Top 5 sites", "View All", "e.g. a note", "i.e. this", "Version 1.5 released", "₹509.7K", "Mon. Tue. Wed.", "Ends in 3.5 days", "U.S.A", "Dr. Sharma joined"]) {
      assert.equal(hasKeepCaseToken(text), false, text);
    }
  });

  it("does not scan very long text", () => {
    assert.equal(hasKeepCaseToken(`${"word ".repeat(1000)} a@b.com`), false);
  });
});
