-- Hidden Room / MysAuth
-- Ensure public users have an operational user_id and can sync game records safely.

create or replace function public.generate_public_user_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := lpad(floor(random() * 1000000)::int::text, 6, '0');
    exit when not exists (
      select 1
      from public.users
      where user_id = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.ensure_my_user_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id text;
begin
  if auth.uid() is null then
    return null;
  end if;

  select nullif(trim(u.user_id), '')
  into current_user_id
  from public.users u
  where u.id = auth.uid();

  if current_user_id is null then
    current_user_id := public.generate_public_user_id();

    update public.users
    set user_id = current_user_id
    where id = auth.uid()
      and nullif(trim(user_id), '') is null;
  end if;

  return current_user_id;
end;
$$;

grant execute on function public.ensure_my_user_id() to authenticated;

update public.users
set user_id = public.generate_public_user_id()
where nullif(trim(user_id), '') is null;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    display_name,
    email,
    whatsapp,
    username,
    user_id,
    roles,
    temp_password
  )
  values (
    new.id,
    nullif(coalesce(new.raw_user_meta_data->>'display_name', ''), ''),
    new.email,
    nullif(coalesce(new.phone, new.raw_user_meta_data->>'whatsapp', ''), ''),
    null,
    public.generate_public_user_id(),
    coalesce(nullif(new.raw_user_meta_data->>'roles', ''), 'client'),
    null
  )
  on conflict (id) do update
  set
    display_name = coalesce(public.users.display_name, excluded.display_name),
    email = excluded.email,
    whatsapp = coalesce(public.users.whatsapp, excluded.whatsapp),
    roles = coalesce(public.users.roles, excluded.roles),
    user_id = coalesce(nullif(public.users.user_id, ''), excluded.user_id);

  return new;
end;
$$;

create or replace function public.prevent_lower_score_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.type = 'record' then
    if tg_op = 'UPDATE' and old.amount is not null and new.amount < old.amount then
      new.amount := old.amount;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_lower_score_record_before_update on public.scores;

create trigger prevent_lower_score_record_before_update
before update on public.scores
for each row
execute function public.prevent_lower_score_record();

alter table public.scores enable row level security;

drop policy if exists "scores_select_own" on public.scores;
create policy "scores_select_own"
on public.scores
for select
to authenticated
using (
  user_id in (
    select u.user_id
    from public.users u
    where u.id = auth.uid()
  )
);

drop policy if exists "scores_insert_own_record" on public.scores;
create policy "scores_insert_own_record"
on public.scores
for insert
to authenticated
with check (
  type = 'record'
  and user_id in (
    select u.user_id
    from public.users u
    where u.id = auth.uid()
  )
);

drop policy if exists "scores_update_own_record" on public.scores;
create policy "scores_update_own_record"
on public.scores
for update
to authenticated
using (
  type = 'record'
  and user_id in (
    select u.user_id
    from public.users u
    where u.id = auth.uid()
  )
)
with check (
  type = 'record'
  and user_id in (
    select u.user_id
    from public.users u
    where u.id = auth.uid()
  )
);
