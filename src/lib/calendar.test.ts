import { test } from "node:test";
import assert from "node:assert/strict";
import { addMonths, monthGrid, nextMonday } from "./calendar.ts";
import { toDay, toIso } from "./plan.ts";

test("monthGrid commence au lundi et couvre le mois", () => {
  const g = monthGrid(toDay("2026-10-15"));
  assert.equal(g.length, 42);
  assert.equal(toIso(g[0]), "2026-09-28"); // le 1er octobre 2026 est un jeudi
  assert.ok(g.includes(toDay("2026-10-31")));
});

test("addMonths borne au dernier jour et change d'année", () => {
  assert.equal(toIso(addMonths(toDay("2026-01-31"), 1)), "2026-02-28");
  assert.equal(toIso(addMonths(toDay("2026-12-10"), 1)), "2027-01-10");
  assert.equal(toIso(addMonths(toDay("2026-01-10"), -1)), "2025-12-10");
});

test("nextMonday", () => {
  assert.equal(nextMonday("2026-09-27"), "2026-09-28"); // dimanche → lendemain
  assert.equal(nextMonday("2026-09-28"), "2026-10-05");
});
