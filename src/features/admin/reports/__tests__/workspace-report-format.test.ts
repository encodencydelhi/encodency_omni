import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { describeDeliveries, describeSchedule, formatBytes, invalidRecipients, parseRecipients } from "../workspace-report-format";

describe("workspace report formatting", () => {
  it("describes weekly and monthly schedules in plain words", () => {
    assert.equal(describeSchedule({ frequency: "weekly", dayOfWeek: 1, dayOfMonth: null, timeOfDay: "09:00", timezone: "Asia/Kolkata", rangeDays: 7 }), "Every Monday at 09:00 (Asia/Kolkata), last 7 days");
    assert.equal(describeSchedule({ frequency: "monthly", dayOfWeek: null, dayOfMonth: 1, timeOfDay: "08:30", timezone: "UTC", rangeDays: 30 }), "Monthly on day 1 at 08:30 (UTC), last 30 days");
  });

  it("formats sizes", () => {
    assert.equal(formatBytes(null), "-");
    assert.equal(formatBytes(900), "900 B");
    assert.equal(formatBytes(20480), "20 KB");
    assert.equal(formatBytes(3 * 1024 * 1024), "3.0 MB");
  });

  it("states what was delivered, and never calls a failed or skipped email sent", () => {
    const at = "2026-10-30T00:00:00.000Z";
    const mk = (channel: "email" | "in_app", status: "sent" | "failed" | "skipped") => ({ channel, status, reason: null, recipient: null, lastError: null, createdAt: at });
    assert.deepEqual(describeDeliveries(undefined), { text: "Not sent", tone: "none" });
    assert.deepEqual(describeDeliveries([mk("in_app", "sent"), mk("email", "sent"), mk("email", "sent")]), { text: "2 of 2 emailed, owners notified in the app", tone: "ok" });
    assert.deepEqual(describeDeliveries([mk("email", "sent"), mk("email", "failed")]), { text: "1 of 2 emailed, 1 failed", tone: "warn" });
    assert.deepEqual(describeDeliveries([mk("email", "skipped")]), { text: "0 of 1 emailed, 1 not sent (no mail account)", tone: "warn" });
  });

  it("parses and checks recipients", () => {
    assert.deepEqual(parseRecipients("A@x.com, b@y.org;\n a@x.com  c@z.in"), ["a@x.com", "b@y.org", "c@z.in"]);
    assert.deepEqual(invalidRecipients(["ok@x.com", "nope", "a@b"]), ["nope", "a@b"]);
  });
});
