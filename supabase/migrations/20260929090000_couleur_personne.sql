-- Couleur choisie pour une personne : index dans la palette de l'app (distinct par projet tant que la palette suffit).
alter table public.people add column color smallint check (color >= 0);
update public.people p set color = s.n
from (select id, (row_number() over (partition by project_id order by created_at) - 1) % 12 as n from public.people) s
where p.id = s.id;
