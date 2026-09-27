-- Part du temps d'une personne consacrée aux défauts (0 à 1) : retirée du temps disponible pour le plan.
alter table public.people add column defect_share numeric not null default 0 check (defect_share >= 0 and defect_share <= 1);
