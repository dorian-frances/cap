-- Statut « Dev terminé » : plus rien à faire en dev, mais pas encore en production (dépendance, recette…).
-- Les allocations par tâche et la part défauts ne sont plus lues par l'app ; colonnes conservées (pas de perte de données).
alter table public.items drop constraint items_status_check;
alter table public.items add constraint items_status_check check (status in ('todo', 'doing', 'dev_done', 'done'));
