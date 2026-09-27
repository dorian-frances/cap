-- Description libre d'un Item (panneau de détail).
alter table public.items add column description text not null default '';

-- Le lien client ne montre pas le motif des absences.
create or replace function public.get_shared_project(token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'project', to_jsonb(p) - 'share_token',
    'items', coalesce((select jsonb_agg(to_jsonb(i) - 'description') from public.items i where i.project_id = p.id), '[]'),
    'people', coalesce((select jsonb_agg(x) from public.people x where x.project_id = p.id), '[]'),
    'absences', coalesce((select jsonb_agg(to_jsonb(a) - 'label') from public.absences a where a.project_id = p.id), '[]')
  )
  from public.projects p where p.share_token = token
$$;
