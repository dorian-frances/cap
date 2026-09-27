-- Avenant : retard anticipé sur une tâche, en JH ajoutés à l'estimation (qui reste l'engagement), avec son motif.
alter table public.items add column extra_jh numeric not null default 0 check (extra_jh >= 0);
alter table public.items add column extra_note text not null default '';
