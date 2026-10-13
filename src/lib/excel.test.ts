import { test } from "node:test";
import assert from "node:assert/strict";
import { schedule, type Item } from "./plan.ts";
import { planSheet, sheetHtml, sheetTsv } from "./excel.ts";

const A = { id: "a", name: "Hugues", capacity: 1 };
const item = (p: Partial<Item>): Item => ({
  id: "x", parent_id: null, type: "feature", title: "", position: 0,
  estimate_jh: 0, owner_ids: [], status: "todo", milestone_date: null, target_ids: [], ...p,
});
const sheetOf = (items: Item[]) => planSheet(items, [A], schedule(items, [A], [], "2026-09-28", "2026-09-01"), "2026-10-07");
const dot = (s?: string) => s?.match(/color:(#\w+)/)?.[1];
const D = (n: number) => "─".repeat(n);

test("macro-plan : jalons, colonnes, barre en tirets, pastille de statut", () => {
  const ms = item({ id: "m", type: "milestone", title: "Recette", milestone_date: "2026-10-07" });
  const parent = item({ id: "p", title: "Factu", position: 0 });
  const x = item({ id: "x", parent_id: "p", title: "Formulaire", estimate_jh: 8, owner_ids: ["a"], target_ids: ["m"] });
  const y = item({ id: "y", title: "-Backlog", position: 1 });
  const s = sheetOf([ms, parent, x, y]);
  // Légende (2 lignes), jalons, en-tête, puis les items.
  assert.deepEqual(s[2].slice(8).map((c) => c.v), ["", "◆ Recette"]);
  assert.deepEqual(s[3].slice(8).map((c) => c.v), ["28/09/2026", "05/10/2026"]);
  assert.match(s[3][9].s!, /border-left:2px solid/); // semaine du 07/10 : aujourd'hui
  // x : 8 JH du lun 28/09 au mer 07/10, à l'heure pour son jalon.
  assert.deepEqual(s[5].map((c) => c.v), ["    Formulaire", "8", "Hugues", "●", "28/09/2026", "07/10/2026", "Recette", "", `├${D(11)}`, `${D(11)}○`]);
  assert.equal(dot(s[5][3].s), "#a8a29e");
  assert.match(s[4][0].s!, /bold/);
  // Pas planifiable : sans barre, avec la raison ; protégé contre l'interprétation en formule.
  assert.equal(s[6][7].v, "Pas d'owner ni d'estimation");
  assert.equal(sheetTsv(s).split("\r\n")[6].split("\t")[0], "'-Backlog");
  assert.match(sheetHtml(s), /<td>'-Backlog<\/td>/);
});

test("en retard sur le jalon : triangle et pastille rouge, parent compris", () => {
  const ms = item({ id: "m", type: "milestone", title: "J", milestone_date: "2026-09-30" });
  const p = item({ id: "p", title: "A & <b>" });
  const x = item({ id: "x", parent_id: "p", estimate_jh: 8, owner_ids: ["a"], target_ids: ["m"], status: "doing", started_on: "2026-09-28" });
  const s = sheetOf([ms, p, x]);
  assert.equal(s[5][9].v, `${D(11)}△`);
  assert.equal(dot(s[5][3].s), "#e03131");
  assert.equal(dot(s[4][3].s), "#e03131");
  assert.match(sheetHtml(s), /A &amp; &lt;b&gt;/);
});

test("jalons proches en escalier, fusionnés sur la largeur de leur libellé", () => {
  const m1 = item({ id: "m1", type: "milestone", title: "Recette Enrôlement du client", milestone_date: "2026-09-28" });
  const m2 = item({ id: "m2", type: "milestone", title: "Recette Factures", milestone_date: "2026-10-05" });
  const m3 = item({ id: "m3", type: "milestone", title: "Pilote", milestone_date: "2026-10-26" });
  const s = sheetOf([m1, m2, m3]);
  // m1 occupe 3 semaines : m2 descend d'une ligne, m3 remonte sur la première (bornée à la dernière semaine).
  assert.deepEqual(s.slice(2, 4).map((r) => r.slice(8).map((c) => c.span ?? (c.v ? 1 : 0))), [[3, 0, 0, 0, 1], [0, 2, 0, 0, 0]]);
  assert.match(sheetHtml(s), /<td colspan="3" style="background:#ffff00;font-weight:bold;">◆ Recette Enrôlement du client<\/td>/);
});
