import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const source = readFileSync(join(process.cwd(), "src/features/jobs-queues/pages/activity-settings-page.tsx"), "utf8");

test("activity data store metric cards render icons", () => {
  assert.match(source, /HardDriveIcon/);
  assert.match(source, /ArchiveIcon/);
  assert.match(source, /<HardDriveIcon className="size-4 text-blue-600" \/>/);
  assert.match(source, /<ArchiveIcon className="size-4 text-slate-600" \/>/);
});
