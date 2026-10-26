alter table public.orders
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_date timestamptz,
  add column if not exists courier_name text,
  add column if not exists tracking_number text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz;

create or replace function public.adjust_product_stock(
  p_product_id text,
  p_quantity integer,
  p_direction integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer;
begin
  if p_quantity <= 0 or p_direction not in (-1, 1) then return false; end if;
  update public.products
  set stock = stock + (p_quantity * p_direction), updated_at = now()
  where id = p_product_id
    and (p_direction = 1 or stock >= p_quantity);
  get diagnostics changed_count = row_count;
  return changed_count > 0;
end;
$$;

revoke all on function public.adjust_product_stock(text, integer, integer) from public, anon, authenticated;
grant execute on function public.adjust_product_stock(text, integer, integer) to service_role;

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_created_idx
  on public.order_status_history (order_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  title text not null,
  body text not null,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.order_status_history enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Customers can read their order status history" on public.order_status_history;
create policy "Customers can read their order status history"
  on public.order_status_history for select to authenticated
  using (exists (
    select 1 from public.orders
    where orders.id = order_status_history.order_id
      and orders.user_id = (select auth.uid())
  ));

drop policy if exists "Customers can read their notifications" on public.notifications;
create policy "Customers can read their notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Customers can mark their notifications read" on public.notifications;
create policy "Customers can mark their notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.order_status_history from anon, authenticated;
grant select on public.order_status_history to authenticated;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
