do $$
begin
  create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
exception
  when duplicate_object then null;
end
$$;

alter table public.orders
  add column if not exists shipping_address jsonb not null default '{}'::jsonb,
  add column if not exists subtotal numeric(12,2) not null default 0,
  add column if not exists shipping_fee numeric(12,2) not null default 0,
  add column if not exists total numeric(12,2) not null default 0,
  add column if not exists payment_status public.payment_status not null default 'pending',
  add column if not exists payment_method text,
  add column if not exists status public.order_status not null default 'pending',
  add column if not exists updated_at timestamptz not null default now(),
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

notify pgrst, 'reload schema';
