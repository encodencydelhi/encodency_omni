import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(join(process.cwd(), "src/features/audit-logs/components/range-control.tsx"), "utf8");

test("custom audit date inputs reserve space for the native calendar icon", () => {
  const matches = source.match(/className="h-8 w-\[9\.75rem\] min-w-\[9\.75rem\] pr-8/g) ?? [];

  assert.equal(matches.length, 2);
  assert.match(source, /\[&::-webkit-calendar-picker-indicator\]:opacity-100/);
});
