-- Hidden Room / MysAuth
-- Event-specific finance permissions and collaborator access view.

create table if not exists public.event_user_permissions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id text not null,
  can_view boolean not null default false,
  can_add_finance boolean not null default false,
  can_edit_finance boolean not null default false,
  can_edit_scrum boolean not null default false,
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create index if not exists event_user_permissions_user_id_idx
  on public.event_user_permissions (user_id);

create index if not exists event_user_permissions_event_id_idx
  on public.event_user_permissions (event_id);

create or replace view public.hr_event_finance_summary as
select
  coalesce(e.event_key, ht.event_key) as event_key,
  coalesce(sum(ht.amount) filter (where ht.movement_type = 'income'), 0) as ingresos,
  abs(coalesce(sum(ht.amount) filter (where ht.movement_type = 'expense'), 0)) as egresos,
  coalesce(sum(ht.amount) filter (where ht.movement_type = 'investment_in'), 0) as inversion_ingresada,
  abs(coalesce(sum(ht.amount) filter (where ht.movement_type = 'investment_return'), 0)) as utilidad_devuelta,
  coalesce(sum(ht.amount) filter (where ht.movement_type = 'counterparty_transfer'), 0) as entregas_a_favor,
  coalesce(sum(ht."M.A.I."), sum(ht.hidden_room_share), 0) as mai,
  coalesce(sum(ht.hidden_room_share), 0) as hidden_room_share_total,
  coalesce(sum(ht.amount), 0) + coalesce(sum(ht.hidden_room_share), 0) as balance_evento
from public.hr_transactions ht
left join public.events e on e.id = ht.event_id or e.event_key = ht.event_key
group by coalesce(e.event_key, ht.event_key);

create or replace view public.hr_events_dashboard as
select
  e.id,
  e.event_key,
  e.name,
  e.event_date,
  e.status,
  coalesce(s.ingresos, 0) as ingresos,
  coalesce(s.egresos, 0) as egresos,
  coalesce(s.inversion_ingresada, 0) as inversion_ingresada,
  coalesce(s.utilidad_devuelta, 0) as utilidad_devuelta,
  coalesce(s.entregas_a_favor, 0) as entregas_a_favor,
  coalesce(s.mai, 0) as mai,
  coalesce(s.hidden_room_share_total, 0) as hidden_room_share_total,
  coalesce(s.balance_evento, 0) as balance_evento
from public.events e
left join public.hr_event_finance_summary s on s.event_key = e.event_key;

create or replace view public.hr_events_user_access as
select
  eup.user_id,
  e.id as event_id,
  e.event_key,
  e.name,
  e.event_date,
  e.status,
  eup.can_view,
  eup.can_add_finance,
  eup.can_edit_finance,
  eup.can_edit_scrum
from public.event_user_permissions eup
join public.events e on e.id = eup.event_id
where eup.can_view = true;

alter table public.event_user_permissions enable row level security;

drop policy if exists "event perms admin all" on public.event_user_permissions;
create policy "event perms admin all"
on public.event_user_permissions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "event perms own select" on public.event_user_permissions;
create policy "event perms own select"
on public.event_user_permissions
for select
to authenticated
using (
  user_id in (
    select u.user_id
    from public.users u
    where u.id = auth.uid()
  )
);

drop policy if exists "event finance insert assigned" on public.hr_transactions;
create policy "event finance insert assigned"
on public.hr_transactions
for insert
to authenticated
with check (
  public.is_admin()
  or exists (
    select 1
    from public.event_user_permissions eup
    join public.users u on u.user_id = eup.user_id
    where u.id = auth.uid()
      and eup.event_id = hr_transactions.event_id
      and eup.can_add_finance = true
  )
);

drop policy if exists "event finance update assigned" on public.hr_transactions;
create policy "event finance update assigned"
on public.hr_transactions
for update
to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.event_user_permissions eup
    join public.users u on u.user_id = eup.user_id
    where u.id = auth.uid()
      and eup.event_id = hr_transactions.event_id
      and eup.can_edit_finance = true
  )
)
with check (
  public.is_admin()
  or exists (
    select 1
    from public.event_user_permissions eup
    join public.users u on u.user_id = eup.user_id
    where u.id = auth.uid()
      and eup.event_id = hr_transactions.event_id
      and eup.can_edit_finance = true
  )
);
