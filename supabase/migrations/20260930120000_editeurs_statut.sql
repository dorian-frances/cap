-- Éditeurs d'un projet avec leur dernière connexion (null = invité·e, jamais connecté·e).
-- auth.users n'est pas lisible côté client : on passe par une fonction réservée aux éditeurs.
create function public.project_editors(pid uuid) returns table (email text, last_sign_in_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.email, (select max(u.last_sign_in_at) from auth.users u where lower(u.email) = m.email)
  from public.project_members m
  where m.project_id = pid and public.is_editor(pid)
  order by m.email
$$;
revoke execute on function public.project_editors(uuid) from public, anon;
grant execute on function public.project_editors(uuid) to authenticated;
