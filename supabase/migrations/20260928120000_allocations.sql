-- Allocation d'une tâche : part du temps de ses owners, datée (« à 50 % à partir du 14 sept. »).
-- Liste [{ "from": "AAAA-MM-JJ", "pct": 0..1 }] ; sans entrée, 100 %.
alter table public.items add column allocations jsonb not null default '[]'::jsonb;

-- Remplace la « part du temps pendant un retard » : reprise comme allocation à partir d'aujourd'hui.
update public.items
  set allocations = jsonb_build_array(jsonb_build_object('from', current_date, 'pct', overrun_load))
  where overrun_load < 1;
alter table public.items drop column overrun_load;
