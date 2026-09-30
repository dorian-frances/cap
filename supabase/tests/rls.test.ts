// Droits d'accès, contre le Supabase local : `supabase start` puis `npm run test:db`
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = "http://127.0.0.1:54321";
const KEY = "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH"; // clé locale par défaut, publique
const client = () => createClient(URL, KEY, { auth: { persistSession: false } });

async function user() {
  const c = client();
  const email = `u${crypto.randomUUID().slice(0, 8)}@test.dev`;
  const { error } = await c.auth.signUp({ email, password: "password123" });
  assert.equal(error, null);
  return { c, email };
}

test("seuls les éditeurs accèdent au projet ; le lien de partage suffit pour lire", async () => {
  const a = await user();
  const b = await user();
  const anon = client();

  const { data: pid, error } = await a.c.rpc("create_project", { p_name: "Projet A" });
  assert.equal(error, null);
  const { data: person } = await a.c.from("people").insert({ project_id: pid, name: "Alice" }).select().single();
  const { error: e2 } = await a.c.from("items").insert({ project_id: pid, title: "Login", estimate_jh: 3, owner_ids: [person.id] });
  assert.equal(e2, null);
  await a.c.from("absences").insert({ project_id: pid, person_id: person.id, start_date: "2026-10-01", end_date: "2026-10-01", label: "Médecin" });

  // B et anonyme ne voient ni n'écrivent rien
  assert.deepEqual((await b.c.from("projects").select().eq("id", pid)).data, []);
  assert.deepEqual((await b.c.from("items").select().eq("project_id", pid)).data, []);
  assert.deepEqual((await anon.from("items").select().eq("project_id", pid)).data ?? [], []);
  assert.notEqual((await b.c.from("items").insert({ project_id: pid, title: "hack" })).error, null);
  assert.notEqual((await b.c.from("project_members").insert({ project_id: pid, email: b.email })).error, null);
  assert.notEqual((await anon.rpc("create_project", { p_name: "x" })).error, null);

  // Lecture via le lien
  const { data: project } = await a.c.from("projects").select("share_token").eq("id", pid).single();
  const { data: shared } = await anon.rpc("get_shared_project", { token: project!.share_token });
  assert.equal(shared.project.name, "Projet A");
  assert.equal(shared.project.share_token, undefined);
  assert.equal(shared.items[0].title, "Login");
  assert.equal(shared.absences.length, 1);
  assert.equal(shared.absences[0].label, undefined); // le motif reste privé
  assert.equal((await anon.rpc("get_shared_project", { token: crypto.randomUUID() })).data, null);

  // A ajoute B comme éditeur -> B accède
  assert.equal((await a.c.from("project_members").insert({ project_id: pid, email: b.email })).error, null);
  assert.equal((await b.c.from("items").select().eq("project_id", pid)).data?.length, 1);

  // Liste des éditeurs avec statut : réservée aux éditeurs, un·e invité·e sans compte n'a pas de connexion
  await a.c.from("project_members").insert({ project_id: pid, email: "invite@test.dev" });
  const { data: editors } = await a.c.rpc("project_editors", { pid });
  assert.equal(editors.length, 3);
  assert.notEqual(editors.find((e: { email: string }) => e.email === a.email).last_sign_in_at, null);
  assert.equal(editors.find((e: { email: string }) => e.email === "invite@test.dev").last_sign_in_at, null);
  assert.deepEqual((await (await user()).c.rpc("project_editors", { pid })).data, []);
  assert.notEqual((await anon.rpc("project_editors", { pid })).error, null);

  // Supprimer une personne la retire des owners
  await a.c.from("people").delete().eq("id", person.id);
  assert.deepEqual((await a.c.from("items").select("owner_ids").eq("project_id", pid).single()).data?.owner_ids, []);
});
