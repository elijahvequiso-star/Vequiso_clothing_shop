create type public.app_role as enum ('customer', 'admin');
create type public.account_status as enum ('active', 'disabled');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.app_role not null default 'customer',
  account_status public.account_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index otp_verifications_user_created_idx on public.otp_verifications (user_id, created_at desc);

create table public.products (
  id text primary key,
  name text not null,
  category text not null,
  price numeric(12,2) not null check (price >= 0),
  image text not null,
  description text not null,
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  stock integer not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  user_id uuid not null references public.profiles(id),
  customer_name text not null,
  customer_email text not null,
  shipping_address jsonb not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_fee numeric(12,2) not null default 0 check (shipping_fee >= 0),
  total numeric(12,2) not null check (total >= 0),
  payment_status public.payment_status not null default 'pending',
  status public.order_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  image text not null,
  size text not null,
  color text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0)
);

create table public.activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.otp_verifications enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.activity_log enable row level security;

create policy "Customers can read their profile" on public.profiles for select using (auth.uid() = id);
create policy "Customers can read their orders" on public.orders for select using (auth.uid() = user_id);
create policy "Customers can read their order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
create policy "Anyone can read active products" on public.products for select using (active = true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
