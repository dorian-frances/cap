"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Data, Store } from "@/lib/store";
import { Button, Input } from "../atoms";
import { ConfirmDialog, DatePicker, Field, IconButton } from "../molecules";
import { ContentPage, Section } from "../templates/ContentPage";
import { CopyButton, shareUrl } from "./ShareDialog";

export default function SettingsView({ data, store, me }: { data: Data; store: Store; me: string }) {
  const [email, setEmail] = useState("");
  const url = shareUrl(data.project.share_token);
  return (
    <ContentPage title="Paramètres" width="max-w-2xl">
      <Section title="Projet">
        <Field inline label="Nom">
          <Input key={data.project.name} defaultValue={data.project.name} aria-label="Nom du projet" className="w-72"
            onBlur={(e) => e.target.value.trim() && e.target.value !== data.project.name && store.updateProject({ name: e.target.value.trim() })} />
        </Field>
        <Field inline label="Début du planning" hint="Les items s'enchaînent à partir de cette date.">
          <DatePicker label="Début du planning" className="w-72" value={data.project.start_date} onChange={(d) => d && store.updateProject({ start_date: d })} />
        </Field>
      </Section>
      <Section title="Éditeurs" description="Ils se connectent avec leur compte Google et peuvent modifier le plan.">
        <div>
          {data.members.map((m) => (
            <div key={m} className="group flex h-8 animate-fade-in items-center gap-2 text-[13px]">
              <span className="flex-1">{m}{m === me && <span className="text-stone-400"> (vous)</span>}</span>
              {m !== me && <IconButton label={`Retirer ${m}`} tooltip={false} onClick={() => store.removeMember(m)} className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"><X size={14} /></IconButton>}
            </div>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = email.trim().toLowerCase(); if (v) store.addMember(v); setEmail(""); }}>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@entreprise.com" aria-label="Email de l'éditeur" className="flex-1" />
          <Button type="submit" size="form"><Plus size={13} />Ajouter</Button>
        </form>
      </Section>
      <Section title="Lien de consultation" description="Pour les devs, le manager et le client. Régénérer le lien coupe l'accès à l'ancien.">
        <div className="flex gap-2">
          <Input readOnly value={url} className="min-w-0 flex-1 text-stone-600" onFocus={(e) => e.currentTarget.select()} aria-label="Lien de consultation" />
          <CopyButton text={url} />
        </div>
        <ConfirmDialog title="Régénérer le lien de consultation ?" confirmLabel="Régénérer"
          description="L'ancien lien ne fonctionnera plus. Il faudra renvoyer le nouveau à vos lecteurs."
          onConfirm={() => store.updateProject({ share_token: crypto.randomUUID() })}
          trigger={<Button className="self-start">Régénérer le lien</Button>} />
      </Section>
    </ContentPage>
  );
}
