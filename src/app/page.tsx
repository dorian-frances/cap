"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return (
    <main className="mx-auto w-full max-w-xl p-8">
      <h1 className="mb-1 text-3xl font-bold">Cap</h1>
      <p className="mb-8 text-slate-500">Le macro-plan de l&apos;équipe.</p>
      {session ? <Projects email={session.user.email!} /> : <Login />}
    </main>
  );
}

function Login() {
  const [error, setError] = useState("");
  const submit = async (form: FormData, signUp: boolean) => {
    const creds = { email: String(form.get("email")), password: String(form.get("password")) };
    const { data, error } = signUp ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    if (error) setError(error.message);
    else if (signUp && !data.session) setError("Compte créé : confirme ton email puis connecte-toi.");
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget), false); }}>
      <input name="email" type="email" required placeholder="Email" autoComplete="email" className="input" />
      <input name="password" type="password" required minLength={6} placeholder="Mot de passe"
        autoComplete="current-password" className="input" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary">Se connecter</button>
        <button type="button" className="btn"
          onClick={(e) => { const f = e.currentTarget.form!; if (f.reportValidity()) submit(new FormData(f), true); }}>
          Créer un compte
        </button>
      </div>
    </form>
  );
}

function Projects({ email }: { email: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    supabase.from("projects").select("id, name").order("created_at").then(({ data }) => setProjects(data ?? []));
  }, []);

  const create = async (form: FormData) => {
    const { data, error } = await supabase.rpc("create_project", { p_name: String(form.get("name")) });
    if (error) alert(error.message);
    else router.push(`/p/${data}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-2">
        {projects.map((p) => (
          <li key={p.id}>
            <Link href={`/p/${p.id}`} className="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400">
              {p.name}
            </Link>
          </li>
        ))}
        {!projects.length && <li className="text-slate-500">Aucun projet pour l&apos;instant.</li>}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); create(new FormData(e.currentTarget)); }}>
        <input name="name" required placeholder="Nom du projet" className="input flex-1" />
        <button className="btn-primary">Créer</button>
      </form>
      <p className="text-sm text-slate-500">
        Connecté : {email} ·{" "}
        <button className="underline" onClick={() => supabase.auth.signOut()}>se déconnecter</button>
      </p>
    </div>
  );
}
