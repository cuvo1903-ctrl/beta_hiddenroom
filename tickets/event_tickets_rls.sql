-- Policies recomendadas para la beta de tickets.
-- Ejecutar en Supabase SQL Editor únicamente si la tabla todavía no tiene
-- policies equivalentes. El frontend usa solo la publishable/anon key.

alter table public.event_tickets enable row level security;

-- Evita folios repetidos y protege el consecutivo ante intentos duplicados.
create unique index if not exists event_tickets_event_key_folio_uidx
  on public.event_tickets (event_key, folio);

drop policy if exists "event tickets authorized select" on public.event_tickets;
create policy "event tickets authorized select"
on public.event_tickets
for select
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid()::text
      and up.permission_key in ('tickets.validate', 'tickets.scan')
  )
);

drop policy if exists "event tickets admin insert" on public.event_tickets;
create policy "event tickets admin insert"
on public.event_tickets
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "event tickets authorized update" on public.event_tickets;
create policy "event tickets authorized update"
on public.event_tickets
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid()::text
      and up.permission_key in ('tickets.validate', 'tickets.scan')
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.user_permissions up
    where up.user_id = auth.uid()::text
      and up.permission_key in ('tickets.validate', 'tickets.scan')
  )
);

grant select, insert, update on table public.event_tickets to authenticated;
