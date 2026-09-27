"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/Sidebar";

export default function Home() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafaf9] px-4">
      <div className="flex w-full max-w-[360px] flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={36} />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Cap</h1>
            <p className="text-[13px] text-stone-500">Le macro-plan de l&apos;équipe, calculé à partir de la charge et des disponibilités.</p>
          </div>
        </div>
        {session ? <Projects /> : <Login />}
      </div>
    </main>
  );
}

function Login() {
  const [error, setError] = useState("");
  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) setError(error.message);
  };
  return (
    <div className="flex flex-col gap-3">
      <button onClick={google}
        className="flex h-10 items-center justify-center gap-2.5 rounded-lg border border-stone-200 bg-white text-sm font-medium shadow-[0_1px_2px_rgba(28,25,23,.05)] hover:bg-stone-50">
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continuer avec Google
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
      {process.env.NODE_ENV === "development" && <DevLogin />}
    </div>
  );
}

// Connexion email/mot de passe réservée au dev local (Google n'y est pas configuré).
function DevLogin() {
  const [error, setError] = useState("");
  const submit = async (form: FormData, signUp: boolean) => {
    const creds = { email: String(form.get("email")), password: String(form.get("password")) };
    const { error } = signUp ? await supabase.auth.signUp(creds) : await supabase.auth.signInWithPassword(creds);
    if (error) setError(error.message);
  };
  return (
    <details className="text-xs text-stone-500">
      <summary className="cursor-pointer text-center">Connexion locale (dev)</summary>
      <form className="mt-3 flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget), false); }}>
        <input name="email" type="email" required placeholder="Email" aria-label="Email" className="h-8 rounded-md border border-stone-200 px-2 text-[13px]" />
        <input name="password" type="password" required minLength={6} placeholder="Mot de passe" aria-label="Mot de passe" className="h-8 rounded-md border border-stone-200 px-2 text-[13px]" />
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button className="h-8 flex-1 rounded-md bg-stone-900 text-[13px] text-white">Se connecter</button>
          <button type="button" className="h-8 flex-1 rounded-md border border-stone-200 text-[13px]"
            onClick={(e) => { const f = e.currentTarget.form!; if (f.reportValidity()) submit(new FormData(f), true); }}>Créer</button>
        </div>
      </form>
    </details>
  );
}

function Projects() {
  const router = useRouter();
  const [empty, setEmpty] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.from("projects").select("id").order("created_at").then(({ data }) => {
      if (!data?.length) return setEmpty(true);
      let last: string | null = null;
      try { last = localStorage.getItem("cap:last"); } catch {}
      router.replace(`/p/${data.some((p) => p.id === last) ? last : data[0].id}`);
    });
  }, [router]);

  const create = async (form: FormData) => {
    const { data, error } = await supabase.rpc("create_project", { p_name: String(form.get("name")).trim() });
    if (error) setError(error.message);
    else router.push(`/p/${data}`);
  };

  if (!empty) return null;
  return (
    <form className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-5" onSubmit={(e) => { e.preventDefault(); create(new FormData(e.currentTarget)); }}>
      <label htmlFor="name" className="text-sm font-medium">Créez votre premier projet</label>
      <input id="name" name="name" required autoFocus placeholder="Refonte de l'app client" className="h-9 rounded-lg border border-stone-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button className="h-9 rounded-lg bg-stone-900 text-sm font-medium text-white hover:bg-stone-700">Créer le projet</button>
      <p className="text-xs text-stone-500">Vous avez été invité·e ? Demandez à la PM de vous ajouter comme éditeur avec cet email, puis rechargez.</p>
    </form>
  );
}
