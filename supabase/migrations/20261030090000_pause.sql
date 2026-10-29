-- Statut « En pause » : une tâche démarrée n'avance plus et libère ses owners jusqu'à sa reprise.
-- pauses : historique [{ from, until }] (until = date de reprise, absente tant que la pause dure).
alter table public.items drop constraint items_status_check;
alter table public.items add constraint items_status_check check (status in ('todo', 'doing', 'paused', 'dev_done', 'done'));
alter table public.items add column pauses jsonb not null default '[]'::jsonb;
