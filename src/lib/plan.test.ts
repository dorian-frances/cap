// node --test src/lib/plan.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { schedule, isLate, lateBy, totalJh, weekLoad, absentSet, toDay, type Item } from "./plan.ts";

const MON = "2026-09-28"; // lundi
const A = { id: "a", name: "A", capacity: 1 };
const B = { id: "b", name: "B", capacity: 1 };
let n = 0;
const item = (p: Partial<Item>): Item => ({
  id: `i${++n}`, parent_id: null, type: "feature", title: "", position: n,
  estimate_jh: 0, owner_ids: [], status: "todo", milestone_date: null, target_id: null, ...p,
});

test("JH répartis entre owners", () => {
  const x = item({ estimate_jh: 10, owner_ids: ["a", "b"] });
  assert.deepEqual(schedule([x], [A, B], [], MON).spans.get(x.id), { start: MON, end: "2026-10-02" });
});

test("un owner enchaîne ses items par priorité, week-end sauté", () => {
  const x = item({ estimate_jh: 3, owner_ids: ["a"] });
  const y = item({ estimate_jh: 4, owner_ids: ["a"] });
  const s = schedule([y, x], [A], [], MON).spans;
  assert.deepEqual(s.get(x.id), { start: MON, end: "2026-09-30" });
  assert.deepEqual(s.get(y.id), { start: "2026-10-01", end: "2026-10-06" });
});

test("temps partiel, absence et reprise en cours de journée", () => {
  const half = { ...A, capacity: 0.5 };
  const x = item({ estimate_jh: 1.5, owner_ids: ["a"] });
  const y = item({ estimate_jh: 1, owner_ids: ["a"] });
  const abs = [{ id: "z", person_id: "a", start_date: "2026-09-29", end_date: "2026-09-29", label: "" }];
  const s = schedule([x, y], [half], abs, MON).spans;
  // lun 0.5, (mar absent), mer 0.5, jeu 0.5 -> x fini jeudi ; y : ven 0.5, lun 0.5
  assert.deepEqual(s.get(x.id), { start: MON, end: "2026-10-01" });
  assert.deepEqual(s.get(y.id), { start: "2026-10-02", end: "2026-10-05" });
});

test("l'item suivant reprend le reste de la journée", () => {
  const x = item({ estimate_jh: 1.5, owner_ids: ["a"] });
  const y = item({ estimate_jh: 1, owner_ids: ["a"] });
  const s = schedule([x, y], [A], [], MON).spans;
  assert.deepEqual(s.get(y.id), { start: "2026-09-29", end: "2026-09-30" });
});

test("un item partagé attend que tous ses owners soient libres", () => {
  const x = item({ estimate_jh: 2, owner_ids: ["a"] });
  const y = item({ estimate_jh: 2, owner_ids: ["a", "b"] });
  const s = schedule([x, y], [A, B], [], MON).spans;
  assert.deepEqual(s.get(y.id), { start: "2026-09-30", end: "2026-09-30" });
});

test("départ un samedi, sans owner, parent, jalon, retard", () => {
  const ms = item({ type: "milestone", milestone_date: "2026-10-02" });
  const parent = item({ target_id: ms.id });
  const c1 = item({ parent_id: parent.id, estimate_jh: 2, owner_ids: ["a"] });
  const c2 = item({ parent_id: parent.id, estimate_jh: 5, owner_ids: ["a"] });
  const orphan = item({ estimate_jh: 3 });
  const items = [ms, parent, c1, c2, orphan];
  const s = schedule(items, [A], [], "2026-09-26").spans;
  assert.deepEqual(s.get(c1.id), { start: MON, end: "2026-09-29" });
  assert.deepEqual(s.get(parent.id), { start: MON, end: "2026-10-06" });
  assert.deepEqual(s.get(ms.id), { start: "2026-10-02", end: "2026-10-02" });
  assert.equal(s.get(orphan.id), null);
  assert.equal(totalJh(items, parent.id), 7);
  assert.equal(lateBy(parent, s.get(parent.id), items), 2);
  assert.equal(lateBy(c1, s.get(c1.id), items), 0);
});

test("explique l'attente, retard d'un parent via ses enfants, occupation hebdo", () => {
  const ms = item({ type: "milestone", milestone_date: MON });
  const parent = item({});
  const x = item({ parent_id: parent.id, estimate_jh: 2, owner_ids: ["a"] });
  const y = item({ parent_id: parent.id, estimate_jh: 1, owner_ids: ["a"], target_id: ms.id });
  const items = [ms, parent, x, y];
  const plan = schedule(items, [A], [], MON);
  assert.equal(plan.after.get(y.id), x.id);
  assert.equal(plan.after.has(x.id), false);
  assert.equal(isLate(parent, plan, items), true);
  const abs = [{ id: "z", person_id: "a", start_date: "2026-10-05", end_date: "2026-10-09" }];
  assert.equal(weekLoad(plan, A, absentSet([]), toDay(MON)), 60);
  assert.equal(weekLoad(plan, A, absentSet(abs), toDay("2026-10-05")), "abs");
});
