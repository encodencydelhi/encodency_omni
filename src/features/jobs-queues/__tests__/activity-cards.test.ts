import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(join(process.cwd(), "src/features/jobs-queues/components/operations-center.tsx"), "utf8");

test("activity settings cards render their header icons", () => {
  assert.match(source, /const activityStatsCards = \[/);
  assert.match(source, /icon: RefreshCwIcon/);
  assert.match(source, /icon: SlidersHorizontalIcon/);
  assert.match(source, /<Icon className="size-4" \/>/);
});
