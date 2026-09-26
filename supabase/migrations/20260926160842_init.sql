-- Cap : un projet = une équipe. Tout ce qu'on planifie est un Item.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null default current_date,
  share_token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Éditeurs du projet, identifiés par email (on peut ajouter quelqu'un avant qu'il ait un compte).
create table public.project_members (
  project_id uuid not null references public.projects on delete cascade,
  email text not null check (email = lower(email)),
  primary key (project_id, email)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  name text not null,
  capacity numeric not null default 1 check (capacity > 0 and capacity <= 1),
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  parent_id uuid references public.items on delete cascade,
  type text not null default 'feature' check (type in ('feature', 'milestone')),
  title text not null default '',
  position double precision not null default 0,
  estimate_jh numeric not null default 0 check (estimate_jh >= 0),
  owner_ids uuid[] not null default '{}',
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  milestone_date date,
  target_id uuid references public.items on delete set null,
  props jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.items (project_id);

create table public.absences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects on delete cascade,
  person_id uuid not null references public.people on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  label text not null default ''
);
create index on public.absences (project_id);

-- Une personne supprimée n'est plus owner de rien.
create function public.remove_owner() returns trigger language plpgsql set search_path = '' as $$
begin
  update public.items set owner_ids = array_remove(owner_ids, old.id) where project_id = old.project_id;
  return old;
end $$;
create trigger people_remove_owner before delete on public.people
  for each row execute function public.remove_owner();

-- Droits : seuls les membres du projet éditent. La lecture publique passe par get_shared_project.
create function public.is_editor(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.project_members
    where project_id = pid and email = lower(auth.jwt() ->> 'email')
  )
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.people enable row level security;
alter table public.items enable row level security;
alter table public.absences enable row level security;

create policy editor_select on public.projects for select to authenticated using (public.is_editor(id));
create policy editor_update on public.projects for update to authenticated using (public.is_editor(id)) with check (public.is_editor(id));
create policy editor_delete on public.projects for delete to authenticated using (public.is_editor(id));
create policy editor_all on public.project_members for all to authenticated using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy editor_all on public.people for all to authenticated using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy editor_all on public.items for all to authenticated using (public.is_editor(project_id)) with check (public.is_editor(project_id));
create policy editor_all on public.absences for all to authenticated using (public.is_editor(project_id)) with check (public.is_editor(project_id));

-- Création d'un projet + ajout du créateur comme éditeur, atomiquement.
create function public.create_project(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  email text := lower(auth.jwt() ->> 'email');
  pid uuid;
begin
  if email is null then raise exception 'not authenticated'; end if;
  insert into public.projects (name) values (p_name) returning id into pid;
  insert into public.project_members (project_id, email) values (pid, email);
  return pid;
end $$;
revoke execute on function public.create_project(text) from public, anon;
grant execute on function public.create_project(text) to authenticated;

-- Lecture seule via lien de partage (sans compte).
create function public.get_shared_project(token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'project', to_jsonb(p) - 'share_token',
    'items', coalesce((select jsonb_agg(i) from public.items i where i.project_id = p.id), '[]'),
    'people', coalesce((select jsonb_agg(x) from public.people x where x.project_id = p.id), '[]'),
    'absences', coalesce((select jsonb_agg(a) from public.absences a where a.project_id = p.id), '[]')
  )
  from public.projects p where p.share_token = token
$$;
grant execute on function public.get_shared_project(uuid) to anon, authenticated;
