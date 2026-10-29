// node --test src/lib/plan.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { schedule as run, startBefore, isLate, lateBy, overdue, slip, totalJh, activeTags, unplannedReason, weekLoad, absentSet, toDay, daysUntil, dueOn, upcomingStarts, toLift, upcomingMilestones, targetsOf, type Item } from "./plan.ts";

const MON = "2026-09-28"; // lundi
const A = { id: "a", name: "A", capacity: 1 };
const B = { id: "b", name: "B", capacity: 1 };
// Par défaut « aujourd'hui » est avant le projet : le calcul ne dépend pas de la date d'exécution des tests.
const schedule = (items: Item[], people: typeof A[], abs: Parameters<typeof run>[2], start: string, today = "2026-09-01") => run(items, people, abs, start, today);
let n = 0;
const item = (p: Partial<Item>): Item => ({
  id: `i${++n}`, parent_id: null, type: "feature", title: "", position: n,
  estimate_jh: 0, owner_ids: [], status: "todo", milestone_date: null, target_ids: [], ...p,
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
  const parent = item({ target_ids: [ms.id] });
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
  const y = item({ parent_id: parent.id, estimate_jh: 1, owner_ids: ["a"], target_ids: [ms.id] });
  const items = [ms, parent, x, y];
  const plan = schedule(items, [A], [], MON);
  assert.equal(plan.after.get(y.id), x.id);
  assert.equal(plan.after.has(x.id), false);
  assert.equal(isLate(parent, plan, items), true);
  const abs = [{ id: "z", person_id: "a", start_date: "2026-10-05", end_date: "2026-10-09" }];
  assert.equal(weekLoad(plan, A, absentSet([]), toDay(MON)), 60);
  assert.equal(weekLoad(plan, A, absentSet(abs), toDay("2026-10-05")), "abs");
});

test("une tâche à faire ne démarre pas avant aujourd'hui", () => {
  const x = item({ estimate_jh: 2, owner_ids: ["a"] });
  assert.deepEqual(schedule([x], [A], [], MON, "2026-10-07").spans.get(x.id), { start: "2026-10-07", end: "2026-10-08" });
});

test("en cours et en retard : occupe son owner jusqu'à aujourd'hui, la suite glisse", () => {
  const x = item({ estimate_jh: 3, owner_ids: ["a"], status: "doing", started_on: MON });
  const y = item({ estimate_jh: 1, owner_ids: ["a"] });
  const plan = schedule([x, y], [A], [], MON, "2026-10-06");
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-10-06", planned: "2026-09-30" });
  assert.equal(slip(plan.spans.get(x.id)), 4); // jeu, ven, lun, mar
  assert.equal(overdue(x, plan.spans.get(x.id)), true);
  assert.deepEqual(plan.spans.get(y.id), { start: "2026-10-07", end: "2026-10-07" });
  assert.equal(plan.after.get(y.id), x.id);
});

test("les faits passent avant la priorité ; en cours dans les temps n'est pas en retard", () => {
  const todo = item({ estimate_jh: 2, owner_ids: ["a"] });
  const doing = item({ estimate_jh: 2, owner_ids: ["a"], status: "doing", started_on: MON });
  const s = schedule([todo, doing], [A], [], MON, MON).spans;
  assert.deepEqual(s.get(doing.id), { start: MON, end: "2026-09-29" });
  assert.equal(overdue(doing, s.get(doing.id)), false);
  assert.deepEqual(s.get(todo.id), { start: "2026-09-30", end: "2026-10-01" });
});

test("terminé : fin réelle, en retard ou en avance, saisie a posteriori", () => {
  const late = item({ estimate_jh: 2, owner_ids: ["a"], status: "done", started_on: MON, done_on: "2026-10-02" });
  const early = item({ estimate_jh: 5, owner_ids: ["b"], status: "done", started_on: MON, done_on: "2026-09-29" });
  const next = item({ estimate_jh: 1, owner_ids: ["b"] });
  const plan = schedule([late, early, next], [A, B], [], MON, "2026-10-12");
  assert.deepEqual(plan.spans.get(late.id), { start: MON, end: "2026-10-02", planned: "2026-09-29" });
  assert.equal(slip(plan.spans.get(late.id)), 3);
  assert.equal(overdue(late, plan.spans.get(late.id)), false); // terminé : plus « en retard aujourd'hui »
  assert.deepEqual(plan.spans.get(early.id), { start: MON, end: "2026-09-29", planned: "2026-10-02" });
  assert.equal(slip(plan.spans.get(early.id)), 0);
  assert.deepEqual(plan.spans.get(next.id), { start: "2026-10-12", end: "2026-10-12" });
});

test("sans estimation ou sans owner : à planifier, avec la raison", () => {
  const noJh = item({ owner_ids: ["a"] });
  const none = item({});
  const s = schedule([noJh, none], [A], [], MON).spans;
  assert.equal(s.get(noJh.id), null);
  assert.equal(unplannedReason(noJh, [A]), "Pas d'estimation");
  assert.equal(unplannedReason(none, [A]), "Pas d'owner ni d'estimation");
});

test("terminée sans date de fin : ne finit pas après aujourd'hui", () => {
  const x = item({ estimate_jh: 10, owner_ids: ["a"], status: "done" });
  assert.deepEqual(schedule([x], [A], [], MON, "2026-10-02").spans.get(x.id), { start: MON, end: "2026-10-02", planned: "2026-10-09" });
});

test("terminée sans date de début : début déduit de l'estimation", () => {
  assert.equal(startBefore("2026-09-04", 10, [A], []), "2026-08-24"); // 10 jours ouvrés
  assert.equal(startBefore("2026-09-04", 10, [A, B], []), "2026-08-31"); // à deux : 5 jours
  assert.equal(startBefore("2026-09-04", 1, [{ ...A, capacity: 0.5 }], []), "2026-09-03");
  const abs = [{ id: "z", person_id: "a", start_date: "2026-09-02", end_date: "2026-09-02" }];
  assert.equal(startBefore("2026-09-04", 3, [A], abs), "2026-09-01");
});

test("terminée avec ses dates : la barre suit les dates réelles, même en parallèle d'une tâche en retard", () => {
  const late = item({ estimate_jh: 5, owner_ids: ["a"], status: "doing", started_on: "2026-08-10" });
  const closed = item({ estimate_jh: 10, owner_ids: ["a"], status: "done", started_on: "2026-08-24", done_on: "2026-09-04" });
  const s = schedule([late, closed], [A], [], MON, "2026-09-27").spans;
  assert.deepEqual(s.get(closed.id), { start: "2026-08-24", end: "2026-09-04" });
  assert.equal(s.get(late.id)!.end, "2026-09-27");
  assert.equal(s.get(late.id)!.start, "2026-08-10");
});

test("en cours en parallèle : pas de charge, chacune avance à pleine disponibilité", () => {
  const x = item({ estimate_jh: 2, owner_ids: ["a"], status: "doing", started_on: MON });
  const y = item({ estimate_jh: 3, owner_ids: ["a"], status: "doing", started_on: "2026-09-29" });
  const z = item({ estimate_jh: 1, owner_ids: ["a"] });
  const plan = schedule([x, y, z], [A], [], MON, MON);
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-09-29" });
  assert.deepEqual(plan.spans.get(y.id), { start: "2026-09-29", end: "2026-10-01" });
  // La tâche à faire attend que A soit libre de toutes ses tâches en cours
  assert.deepEqual(plan.spans.get(z.id), { start: "2026-10-02", end: "2026-10-02" });
  assert.equal(plan.after.get(z.id), y.id);
  assert.equal(weekLoad(plan, A, absentSet([]), toDay(MON)), 100); // jamais plus de 100 %
});

test("dev terminé : dates réelles, owners libérés, plus en retard", () => {
  const x = item({ estimate_jh: 2, owner_ids: ["a"], status: "dev_done", started_on: MON, done_on: "2026-10-01" });
  const y = item({ estimate_jh: 1, owner_ids: ["a"] });
  const plan = schedule([x, y], [A], [], MON, "2026-10-06");
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-10-01", planned: "2026-09-29" });
  assert.equal(overdue(x, plan.spans.get(x.id)), false);
  assert.deepEqual(plan.spans.get(y.id), { start: "2026-10-06", end: "2026-10-06" });
});

test("avenant : la tâche occupe estimation + avenant, la suivante démarre après, glissement visible", () => {
  const x = item({ estimate_jh: 5, extra_jh: 2, owner_ids: ["a"] });
  const y = item({ estimate_jh: 1, owner_ids: ["a"] });
  const plan = schedule([x, y], [A], [], MON, MON);
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-10-06", planned: "2026-10-02" });
  assert.equal(slip(plan.spans.get(x.id)), 2);
  assert.deepEqual(plan.spans.get(y.id), { start: "2026-10-07", end: "2026-10-07" });
  // En cours : l'engagement reste l'estimation, l'avenant allonge la fin calculée
  const z = item({ estimate_jh: 5, extra_jh: 2, owner_ids: ["a"], status: "doing", started_on: MON });
  assert.deepEqual(schedule([z], [A], [], MON, MON).spans.get(z.id), { start: MON, end: "2026-10-06", planned: "2026-10-02" });
  // Déjà en retard de 4 j : l'avenant s'ajoute après aujourd'hui, le retard passe à 5 j
  const w = item({ estimate_jh: 3, extra_jh: 1, owner_ids: ["a"], status: "doing", started_on: MON });
  const s = schedule([w], [A], [], MON, "2026-10-06").spans.get(w.id);
  assert.deepEqual(s, { start: MON, end: "2026-10-07", planned: "2026-09-30" });
  assert.equal(slip(s), 5);
});

test("tags actifs : non levés, ceux des descendants pour un parent", () => {
  const e = (id: string, tag: "risk" | "blocked", lifted_on?: string) => ({ id, tag, reason: "", on: MON, lifted_on });
  const p = item({});
  const q = item({ parent_id: p.id });
  const items = [p, q, item({ parent_id: p.id, tag_log: [e("1", "risk"), e("2", "blocked", MON)] }), item({ parent_id: q.id, tag_log: [e("3", "blocked")] })];
  assert.deepEqual(activeTags(items, p.id).map((x) => x.id).sort(), ["1", "3"]);
});

test("prochains démarrages : vérifications dues selon leur délai, cochées exclues", () => {
  assert.equal(daysUntil("2026-10-05", "2026-09-28"), 5); // lundi suivant : 5 jours ouvrés
  assert.equal(daysUntil(MON, MON), 0);
  assert.equal(dueOn("2026-10-05", 5), MON);
  assert.equal(dueOn("2026-10-05", 0), "2026-10-05");
  const x = item({ estimate_jh: 5, owner_ids: ["a"] }); // 28 sept. → 2 oct.
  const y = item({ estimate_jh: 2, owner_ids: ["a"] }); // 5 oct. : dans 5 j
  const z = item({ estimate_jh: 2, owner_ids: ["a"], prep: { business: { on: MON } } }); // 7 oct. : dans 7 j, hors horizon
  const plan = schedule([x, y, z], [A], [], MON, MON);
  const rows = upcomingStarts([x, y, z], plan, { business: 5, tech: 3 }, MON);
  assert.deepEqual(rows.map((r) => [r.item.id, r.days, r.due]), [[x.id, 0, ["business", "tech"]], [y.id, 5, ["business"]]]);
  assert.deepEqual(upcomingStarts([x, y, z], plan, { business: 7, tech: 3 }, MON).at(-1)!.due, []);
});

test("à lever : dépendances et blocages actifs, risques et items terminés exclus", () => {
  const e = (tag: "risk" | "blocked" | "dependency", lifted_on?: string) => ({ id: tag, tag, reason: "", on: MON, lifted_on });
  const x = item({ estimate_jh: 1, owner_ids: ["a"], tag_log: [e("risk"), e("dependency")] });
  const y = item({ estimate_jh: 1, owner_ids: ["a"], tag_log: [e("blocked", MON)] });
  const z = item({ status: "done", tag_log: [e("blocked")] });
  const w = item({ tag_log: [e("blocked")] }); // non planifié : en dernier
  const items = [w, x, y, z];
  assert.deepEqual(toLift(items, schedule(items, [A], [], MON, MON)).map((r) => [r.item.id, r.tags.map((t) => t.tag)]), [[x.id, ["dependency"]], [w.id, ["blocked"]]]);
});

test("jalons à venir : retard, non planifiés, marge du dernier item", () => {
  const m = item({ type: "milestone", milestone_date: "2026-10-05" });
  const x = item({ estimate_jh: 5, owner_ids: ["a"], target_ids: [m.id] }); // fin 2 oct.
  const y = item({ target_ids: [m.id] });
  const items = [m, x, y];
  const r = upcomingMilestones(items, schedule(items, [A], [], MON, MON), MON)[0];
  assert.deepEqual([r.targeted, r.late.length, r.unplanned, r.margin, r.tone], [2, 0, 1, 1, "tight"]);
  const far = item({ type: "milestone", milestone_date: "2026-10-12" }); // 6 j après la fin de x : ok
  const ok = upcomingMilestones([far, { ...x, target_ids: [far.id] }], schedule([far, x], [A], [], MON, MON), MON)[0];
  assert.deepEqual([ok.margin, ok.tone], [6, "ok"]);
  const z = item({ estimate_jh: 8, owner_ids: ["a"], target_ids: [m.id] });
  const late = upcomingMilestones([m, z], schedule([m, z], [A], [], MON, MON), MON)[0];
  assert.deepEqual([late.late.length, late.worst, late.margin, late.tone], [1, 2, 0, "late"]);
});

test("plusieurs jalons : retard sur le plus proche, chaque jalon jugé sur sa date", () => {
  const near = item({ type: "milestone", milestone_date: "2026-10-01" });
  const far = item({ type: "milestone", milestone_date: "2026-10-12" });
  const x = item({ estimate_jh: 5, owner_ids: ["a"], target_ids: [far.id, near.id] }); // fin 2 oct.
  const items = [near, far, x];
  const plan = schedule(items, [A], [], MON, MON);
  assert.deepEqual(targetsOf(x, items).map((m) => m.id), [near.id, far.id]);
  assert.equal(lateBy(x, plan.spans.get(x.id), items), 1);
  assert.deepEqual(upcomingMilestones(items, plan, MON).map((r) => r.tone), ["late", "ok"]);
});
