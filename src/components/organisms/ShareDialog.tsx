"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { Data } from "@/lib/store";
import { Button, Input } from "../atoms";
import { Dialog, DialogClose } from "../molecules";

export const shareUrl = (token: string) => (typeof window === "undefined" ? "" : `${window.location.origin}/share/${token}`);

/** Bouton « Copier » qui confirme brièvement la copie. */
export function CopyButton({ text, variant = "secondary" }: { text: string; variant?: "primary" | "secondary" }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button variant={variant} size="form" onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}>
      <span key={String(copied)} className="flex animate-fade-in items-center gap-1.5">{copied ? <><Check size={14} />Copié</> : <><Copy size={14} />Copier</>}</span>
    </Button>
  );
}

export default function ShareDialog({ data, open, onOpenChange }: { data: Data; open: boolean; onOpenChange: (o: boolean) => void }) {
  const url = shareUrl(data.project.share_token);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Partager le plan"
      description="Toute personne avec ce lien voit le plan à jour, sans compte et sans pouvoir le modifier. Les estimations et les motifs d'absence ne sont pas affichés.">
      <div className="mt-4 flex gap-2">
        <Input readOnly value={url} aria-label="Lien de consultation" onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 text-stone-600" />
        <CopyButton text={url} variant="primary" />
      </div>
      <div className="mt-4 flex items-center justify-between">
        <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-[13px] text-stone-600 underline decoration-stone-300 underline-offset-2 transition-colors hover:text-stone-900"><ExternalLink size={13} />Voir comme le client</a>
        <DialogClose>Fermer</DialogClose>
      </div>
    </Dialog>
  );
}
