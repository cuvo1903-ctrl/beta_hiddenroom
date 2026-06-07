alter table public.events enable row level security;

drop policy if exists "events admin mutate" on public.events;

create policy "events admin mutate"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
