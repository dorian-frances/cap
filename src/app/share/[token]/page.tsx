"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Timeline from "@/components/Timeline";
import type { Absence, Item, Person, Project } from "@/lib/plan";
import { supabase } from "@/lib/supabase";

type Shared = { project: Project; items: Item[]; people: Person[]; absences: Absence[] };

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<Shared | null | undefined>(undefined);

  useEffect(() => {
    supabase.rpc("get_shared_project", { token }).then(({ data }) => setData(data));
  }, [token]);

  if (data === undefined) return null;
  if (!data) return <main className="p-8">Lien invalide ou expiré.</main>;
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-2xl font-bold">{data.project.name}</h1>
      <Timeline {...data} left={420} />
    </main>
  );
}
