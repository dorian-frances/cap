// node --test src/lib/plan.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { schedule as run, allocationOn, itemOverload, pauses, startBefore, overloaded, weekOverload, isLate, lateBy, overdue, slip, totalJh, activeTags, unplannedReason, weekLoad, absentSet, toDay, daysUntil, dueOn, upcomingStarts, toLift, upcomingMilestones, type Item } from "./plan.ts";

const MON = "2026-09-28"; // lundi
const A = { id: "a", name: "A", capacity: 1 };
const B = { id: "b", name: "B", capacity: 1 };
// Par défaut « aujourd'hui » est avant le projet : le calcul ne dépend pas de la date d'exécution des tests.
const schedule = (items: Item[], people: typeof A[], abs: Parameters<typeof run>[2], start: string, today = "2026-09-01") => run(items, people, abs, start, today);
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

test("en retard mais en attente : la tâche suivante avance en parallèle", () => {
  const x = item({ estimate_jh: 3, owner_ids: ["a"], status: "doing", started_on: MON, allocations: [{ from: "2026-10-01", pct: 0.2 }] });
  const y = item({ estimate_jh: 2, owner_ids: ["a"] });
  const s = schedule([x, y], [A], [], MON, "2026-10-06").spans;
  assert.deepEqual(s.get(x.id), { start: MON, end: "2026-10-06", planned: "2026-09-30" });
  // mar 6 : 0,8 JH libre (la tâche en attente garde 20 %), mer 7 : 1 JH, jeu 8 : 0,2 JH
  assert.deepEqual(s.get(y.id), { start: "2026-10-06", end: "2026-10-08" });
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

test("allocation à 50 % : la tâche avance moitié moins vite, la suivante en parallèle", () => {
  const x = item({ estimate_jh: 2, owner_ids: ["a"], status: "doing", started_on: MON, allocations: [{ from: MON, pct: 0.5 }] });
  const y = item({ estimate_jh: 1, owner_ids: ["a"] });
  const plan = schedule([x, y], [A], [], MON, MON);
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-10-01" }); // engagée à 50 % : pas de glissement
  assert.deepEqual(plan.spans.get(y.id), { start: MON, end: "2026-09-29" });
  // 50 % déclarés + 100 % sur la suivante : 150 %, signalé (la suivante devrait être déclarée à 50 %)
  assert.equal(plan.overload.get(`a:${toDay(MON)}`)?.demand, 1.5);
});

test("surcharge : aide à 20 % + tâche à 100 % + 20 % de défauts = 140 %, pas de faux positif au relais", () => {
  const h = { id: "h", name: "Hugues", capacity: 1, defect_share: 0.2 };
  const j = { id: "j", name: "Julien", capacity: 1 };
  const spi = item({ estimate_jh: 12, owner_ids: ["h", "j"], allocations: [{ from: MON, pct: 0.2, person: "h" }] });
  const gpay = item({ estimate_jh: 10, owner_ids: ["h"] });
  const plan = schedule([spi, gpay], [h, j], [], MON, MON);
  assert.deepEqual(plan.overload.get(`h:${toDay(MON)}`), { demand: 1.4, ids: [spi.id, gpay.id] });
  // Deux tâches de A à la suite, la première finit en milieu de journée : pas de surcharge
  const x = item({ estimate_jh: 1.5, owner_ids: ["a"] });
  const y = item({ estimate_jh: 2, owner_ids: ["a"] });
  assert.equal(schedule([x, y], [A], [], MON, MON).overload.size, 0);
  const s = item({ estimate_jh: 1.5, owner_ids: ["a"], status: "doing", started_on: MON });
  assert.equal(schedule([s, y], [A], [], MON, MON).overload.size, 0);
  // Aide déclarée à 20 % alors que A est à 100 % sur une tâche en cours : 120 %, même si l'aide n'avance pas
  const busy = item({ estimate_jh: 5, owner_ids: ["a"], status: "doing", started_on: MON });
  const help = item({ estimate_jh: 5, owner_ids: ["b", "a"], allocations: [{ from: MON, pct: 0.2, person: "a" }] });
  assert.equal(schedule([busy, help], [A, B], [], MON, MON).overload.get(`a:${toDay(MON)}`)?.demand, 1.2);
});

test("allocation réduite en cours de route : glissement par rapport à la fin prévue", () => {
  const x = item({ estimate_jh: 5, owner_ids: ["a"], status: "doing", started_on: MON, allocations: [{ from: "2026-09-30", pct: 0.5 }] });
  const s = schedule([x], [A], [], MON, MON).spans.get(x.id);
  // lun 1, mar 1, puis 0,5/j pendant 6 jours ouvrés : fin le mer 7 au lieu du ven 2
  assert.deepEqual(s, { start: MON, end: "2026-10-07", planned: "2026-10-02" });
  assert.equal(slip(s), 3);
  assert.equal(overdue(x, s), true);
});

test("surcharge : deux tâches à 100 % en parallèle ralentissent au prorata", () => {
  const x = item({ estimate_jh: 2, owner_ids: ["a"], status: "doing", started_on: MON });
  const y = item({ estimate_jh: 2, owner_ids: ["a"], status: "doing", started_on: MON });
  const plan = schedule([x, y], [A], [], MON, MON);
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-10-01", planned: "2026-09-29" });
  assert.equal(slip(plan.spans.get(y.id)), 2);
  assert.deepEqual(plan.overload.get(`a:${toDay(MON)}`), { demand: 2, ids: [x.id, y.id] });
  // Le 1er oct., il reste 0,5 JH à chacune : elles tiennent dans la journée
  assert.deepEqual(overloaded(plan, MON).get("a"), { from: toDay(MON), to: toDay("2026-09-30"), peak: 2 });
  assert.equal(weekOverload(plan, "a", toDay(MON))?.demand, 2);
  assert.equal(plan.freeFrom.get("a"), toDay("2026-10-02"));
});

test("allocation par personne : une personne en aide à 20 % ne bloque pas et continue ses tâches", () => {
  const x = item({ estimate_jh: 6, owner_ids: ["a", "b"], allocations: [{ from: MON, pct: 0.2, person: "b" }] });
  const y = item({ estimate_jh: 1, owner_ids: ["b"] });
  const before = item({ estimate_jh: 2, owner_ids: ["b"], status: "doing", started_on: MON });
  const plan = schedule([before, x, y], [A, B], [], MON, MON);
  // b est pris à 100 % lun-mar par sa tâche en cours : x démarre quand même lundi avec a (1 JH/j),
  // puis 1,2 JH/j à partir de mercredi : 1 + 1 + 1,2 × 3 = 5,6 vendredi, fin lundi 5
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-10-05" });
  // y (b seul) récupère les 80 % restants de b à partir de mercredi
  assert.deepEqual(plan.spans.get(y.id), { start: "2026-09-30", end: "2026-10-01" });
  assert.equal(allocationOn(x, MON, "b"), 0.2);
  assert.equal(allocationOn(x, MON, "a"), 1);
  assert.equal(allocationOn(x, MON), 1);
});

test("part défauts : retirée du temps disponible, comptée dans l'occupation", () => {
  const h = { id: "h", name: "Hugues", capacity: 1, defect_share: 0.2 };
  const x = item({ estimate_jh: 4, owner_ids: ["h"] });
  const plan = schedule([x], [h], [], MON);
  assert.deepEqual(plan.spans.get(x.id), { start: MON, end: "2026-10-02" }); // 0,8 JH/j : 5 jours
  assert.equal(weekLoad(plan, h, absentSet([]), toDay(MON)), 100);
  // 100 % sur la tâche + 20 % de défauts = 120 % : surcharge signalée
  assert.deepEqual(plan.overload.get(`h:${toDay(MON)}`), { demand: 1.2, ids: [x.id] });
});

test("part défauts : allocation ajustée à 80 %, plus de surcharge ; 50 % reste 50 % du temps total", () => {
  const h = { id: "h", name: "Hugues", capacity: 1, defect_share: 0.2 };
  const x = item({ estimate_jh: 4, owner_ids: ["h"], allocations: [{ from: MON, pct: 0.8, person: "h" }] });
  const y = item({ estimate_jh: 1, owner_ids: ["h"], status: "doing", started_on: MON, allocations: [{ from: MON, pct: 0.5 }] });
  const px = schedule([x], [h], [], MON);
  assert.deepEqual(px.spans.get(x.id), { start: MON, end: "2026-10-02" });
  assert.equal(px.overload.size, 0);
  const py = schedule([y], [h], [], MON, MON);
  assert.deepEqual(py.spans.get(y.id), { start: MON, end: "2026-09-29" }); // 0,5 JH/j, pas 0,4
  assert.equal(py.overload.size, 0);
});

test("surcharge passée puis corrigée : plus d'alerte sur la tâche", () => {
  const t = { id: "t", name: "Tancrède", capacity: 1, defect_share: 0.2 };
  const x = item({ estimate_jh: 15, owner_ids: ["t"], status: "doing", started_on: "2026-09-07", allocations: [{ from: "2026-09-25", pct: 0.8, person: "t" }] });
  const plan = run([x], [t], [], "2026-09-07", "2026-09-28");
  assert.equal(plan.overload.has(`t:${toDay("2026-09-08")}`), true); // 120 % avant le 25 : acté
  assert.equal(itemOverload(plan, x, "2026-09-28").size, 0);
  assert.equal(overloaded(plan, "2026-09-28").size, 0);
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
});

test("pause : périodes à 0 % pour tous les owners, découpées sur la barre", () => {
  const x = item({ estimate_jh: 10, owner_ids: ["a"], status: "doing", started_on: "2026-09-01",
    allocations: [{ from: "2026-09-10", pct: 0 }, { from: "2026-09-17", pct: 1 }, { from: "2026-09-24", pct: 0 }] });
  const span = { start: "2026-09-01", end: "2026-09-28" };
  assert.deepEqual(pauses(x, span), [{ start: "2026-09-10", end: "2026-09-16" }, { start: "2026-09-24", end: "2026-09-28" }]);
  // Une personne encore à 20 % : pas en pause
  const y = item({ ...x, owner_ids: ["a", "b"], allocations: [{ from: "2026-09-10", pct: 0, person: "a" }] });
  assert.deepEqual(pauses(y, span), []);
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
  const x = item({ estimate_jh: 5, owner_ids: ["a"], target_id: m.id }); // fin 2 oct.
  const y = item({ target_id: m.id });
  const items = [m, x, y];
  const r = upcomingMilestones(items, schedule(items, [A], [], MON, MON), MON)[0];
  assert.deepEqual([r.targeted, r.late.length, r.unplanned, r.margin, r.tone], [2, 0, 1, 1, "tight"]);
  const far = item({ type: "milestone", milestone_date: "2026-10-12" }); // 6 j après la fin de x : ok
  const ok = upcomingMilestones([far, { ...x, target_id: far.id }], schedule([far, x], [A], [], MON, MON), MON)[0];
  assert.deepEqual([ok.margin, ok.tone], [6, "ok"]);
  const z = item({ estimate_jh: 8, owner_ids: ["a"], target_id: m.id });
  const late = upcomingMilestones([m, z], schedule([m, z], [A], [], MON, MON), MON)[0];
  assert.deepEqual([late.late.length, late.worst, late.margin, late.tone], [1, 2, 0, "late"]);
});
