import assert from "node:assert/strict";
import { describe, it } from "node:test";

const {
  composeScheduledFor,
  parseScheduleDateTime,
  scheduleWindowError,
  upcomingDateLabels,
  timeLabels,
} = await import("../schedule-datetime");

const NOW = new Date("2026-09-25T10:00:00.000Z");

describe("schedule-datetime (TASK-11B scheduledFor formatting)", () => {
  it("parses the ScheduleBuilder's date and time labels", () => {
    const parsed = parseScheduleDateTime("Sep 30, 2026", "10:00 AM");
    assert.ok(parsed);
    assert.equal(parsed.getFullYear(), 2026);
    assert.equal(parsed.getMonth(), 8);
    assert.equal(parsed.getDate(), 30);
    assert.equal(parsed.getHours(), 10);
    assert.equal(parsed.getMinutes(), 0);
  });

  it("parses PM slots onto a 24-hour clock", () => {
    const parsed = parseScheduleDateTime("Oct 1, 2026", "6:30 PM");
    assert.ok(parsed);
    assert.equal(parsed.getHours(), 18);
    assert.equal(parsed.getMinutes(), 30);
  });

  it("rejects malformed labels instead of guessing", () => {
    assert.equal(parseScheduleDateTime("2026-09-30", "10:00 AM"), null);
    assert.equal(parseScheduleDateTime("Sep 30, 2026", "25:00"), null);
    assert.equal(parseScheduleDateTime(undefined, "10:00 AM"), null);
  });

  it("emits an ISO value with an explicit offset as the backend requires", () => {
    const parsed = parseScheduleDateTime("Sep 30, 2026", "10:00 AM");
    assert.ok(parsed);
    const iso = parsed.toISOString();
    assert.match(iso, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("enforces the 2-minute lead and 180-day horizon", () => {
    assert.match(scheduleWindowError(new Date(NOW.getTime() + 60 * 1000), NOW) ?? "", /2 minutes/);
    assert.equal(scheduleWindowError(new Date(NOW.getTime() + 10 * 60 * 1000), NOW), null);
    assert.match(scheduleWindowError(new Date(NOW.getTime() + 181 * 24 * 60 * 60 * 1000), NOW) ?? "", /180 days/);
  });

  it("composeScheduledFor reports why a slot is unusable", () => {
    const tooSoon = composeScheduledFor(undefined, undefined, NOW);
    assert.ok("error" in tooSoon);

    const valid = composeScheduledFor("Sep 30, 2026", "10:00 AM", NOW);
    assert.ok("scheduledFor" in valid);
    assert.match(valid.scheduledFor, /Z$/);
  });

  it("offers forward-looking date options and every half-hour slot", () => {
    const dates = upcomingDateLabels(14, NOW);
    assert.equal(dates.length, 14);
    assert.equal(dates[0], "Sep 26, 2026");

    const times = timeLabels();
    assert.equal(times.length, 48);
    assert.ok(times.includes("12:00 AM"));
    assert.ok(times.includes("12:00 PM"));
    assert.ok(times.includes("11:30 PM"));
  });
});
