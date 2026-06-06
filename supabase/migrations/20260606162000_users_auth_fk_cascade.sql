-- Diagnostic query to run before validating the FK:
-- select u.*
-- from public.users u
-- left join auth.users au on au.id = u.id
-- where au.id is null;
--
-- Note:
-- public.users.user_id is a text operational/business id in this project.
-- public.users.id is the auth UUID that maps to auth.users.id.

create or replace view public.users_without_auth as
select u.*
from public.users u
left join auth.users au on au.id = u.id
where au.id is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_id_auth_users_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_id_auth_users_id_fkey
      foreign key (id)
      references auth.users(id)
      on delete cascade
      not valid;
  end if;
end $$;

-- After confirming public.users_without_auth is empty, run manually:
-- alter table public.users validate constraint users_id_auth_users_id_fkey;
