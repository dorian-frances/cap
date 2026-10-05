-- Un item peut impacter plusieurs jalons : target_id (un seul) devient target_ids (liste).
-- ponytail: pas de clé étrangère sur un tableau ; le store retire un jalon supprimé des listes qui le citent.
alter table public.items add column target_ids uuid[] not null default '{}';
update public.items set target_ids = array[target_id] where target_id is not null;
alter table public.items drop column target_id;
