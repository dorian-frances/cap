-- Historique des tags d'un item (à risque, dépendance, bloqué) : pose avec sa raison, puis levée.
-- Liste [{ "id", "tag", "reason", "on": "AAAA-MM-JJ", "by": email, "lifted_on"?, "lifted_by"? }] ; actif tant qu'il n'est pas levé.
alter table public.items add column tag_log jsonb not null default '[]'::jsonb;
