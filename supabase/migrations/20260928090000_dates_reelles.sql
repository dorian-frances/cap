-- Dates réelles d'un Item : démarrage (« En cours ») et fin (« Terminé », saisissable a posteriori).
-- Sans date, l'app retombe sur les dates calculées (données antérieures).
alter table public.items add column started_on date;
alter table public.items add column done_on date;
alter table public.items add constraint items_done_after_start check (done_on is null or started_on is null or done_on >= started_on);

-- Part du temps des owners que garde une tâche en retard (1 = tout, 0 = en attente) :
-- le reste va aux tâches suivantes, qui avancent en parallèle.
alter table public.items add column overrun_load numeric not null default 1 check (overrun_load between 0 and 1);
