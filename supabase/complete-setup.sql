-- COMPLETE SETUP FOR A NEW OR PARTIALLY INITIALIZED SUPABASE PROJECT
-- Safe to rerun when these types and tables already exist. Existing rows are preserved.

do $$ begin
  create type public.app_role as enum ('customer', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.account_status as enum ('active', 'disabled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  role public.app_role not null default 'customer',
  account_status public.account_status not null default 'active',
  last_login_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.otp_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists otp_verifications_user_created_idx on public.otp_verifications (user_id, created_at desc);

create table if not exists public.products (
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

create table if not exists public.product_price_settings (
  product_id text primary key,
  regular_price numeric(12,2) not null check (regular_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
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

create table if not exists public.order_items (
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

create table if not exists public.activity_log (
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
alter table public.product_price_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.activity_log enable row level security;

revoke all on public.product_price_settings from anon, authenticated;
grant select on public.product_price_settings to authenticated;

drop policy if exists "Customers can read their profile" on public.profiles;
create policy "Customers can read their profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Customers can read their orders" on public.orders;
create policy "Customers can read their orders" on public.orders for select using (auth.uid() = user_id);
drop policy if exists "Customers can read their order items" on public.order_items;
create policy "Customers can read their order items" on public.order_items for select using (
  exists (select 1 from public.orders where orders.id = order_items.order_id and orders.user_id = auth.uid())
);
drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products" on public.products for select using (active = true);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email, new.raw_user_meta_data->>'phone');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Registration email verification tables and RPCs

create table if not exists public.registration_email_verifications (
  email text primary key,
  otp_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0 and attempts <= 5),
  send_count integer not null default 1 check (send_count >= 1 and send_count <= 5),
  window_started_at timestamptz not null default now(),
  last_sent_at timestamptz not null default now(),
  verified_at timestamptz,
  registration_token_hash text,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.registration_email_verifications enable row level security;
revoke all on public.registration_email_verifications from anon, authenticated;
grant all on public.registration_email_verifications to service_role;

create or replace function public.issue_registration_otp(
  p_email text,
  p_otp_hash text,
  p_expires_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.registration_email_verifications%rowtype;
  normalized_email text := lower(trim(p_email));
begin
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));
  delete from public.registration_email_verifications
  where expires_at < now() - interval '24 hours';

  select * into current_row
  from public.registration_email_verifications
  where email = normalized_email
  for update;

  if found then
    if current_row.window_started_at > now() - interval '24 hours' then
      if current_row.send_count >= 5 then return 'limit'; end if;
      if current_row.last_sent_at > now() - interval '60 seconds' then return 'cooldown'; end if;
    end if;

    update public.registration_email_verifications
    set otp_hash = p_otp_hash,
        expires_at = p_expires_at,
        attempts = 0,
        send_count = case when current_row.window_started_at > now() - interval '24 hours' then current_row.send_count + 1 else 1 end,
        window_started_at = case when current_row.window_started_at > now() - interval '24 hours' then current_row.window_started_at else now() end,
        last_sent_at = now(),
        verified_at = null,
        registration_token_hash = null,
        consumed_at = null,
        created_at = now()
    where email = normalized_email;
  else
    insert into public.registration_email_verifications (email, otp_hash, expires_at)
    values (normalized_email, p_otp_hash, p_expires_at);
  end if;

  return 'sent';
end;
$$;

create or replace function public.verify_registration_otp(
  p_email text,
  p_otp_hash text,
  p_registration_token_hash text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.registration_email_verifications%rowtype;
  normalized_email text := lower(trim(p_email));
begin
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));
  select * into current_row
  from public.registration_email_verifications
  where email = normalized_email
  for update;

  if not found then return 'invalid'; end if;
  if current_row.consumed_at is not null or current_row.verified_at is not null then return 'used'; end if;
  if current_row.expires_at <= now() then return 'expired'; end if;
  if current_row.attempts >= 5 then return 'locked'; end if;

  if current_row.otp_hash <> p_otp_hash then
    update public.registration_email_verifications
    set attempts = attempts + 1
    where email = normalized_email;
    if current_row.attempts + 1 >= 5 then return 'locked'; end if;
    return 'invalid';
  end if;

  update public.registration_email_verifications
  set verified_at = now(), registration_token_hash = p_registration_token_hash
  where email = normalized_email;
  return 'verified';
end;
$$;

create or replace function public.consume_registration_verification(
  p_email text,
  p_registration_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_email text := lower(trim(p_email));
  changed_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));
  update public.registration_email_verifications
  set consumed_at = now(), registration_token_hash = null
  where email = normalized_email
    and registration_token_hash = p_registration_token_hash
    and verified_at is not null
    and expires_at > now()
    and consumed_at is null;
  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.issue_registration_otp(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.verify_registration_otp(text, text, text) from public, anon, authenticated;
revoke all on function public.consume_registration_verification(text, text) from public, anon, authenticated;
grant execute on function public.issue_registration_otp(text, text, timestamptz) to service_role;
grant execute on function public.verify_registration_otp(text, text, text) to service_role;
grant execute on function public.consume_registration_verification(text, text) to service_role;

-- Harden OTP verification and add delivery confirmation

alter table public.registration_email_verifications
  add column if not exists delivery_confirmed_at timestamptz;

create index if not exists registration_email_verifications_expiry_idx
  on public.registration_email_verifications (expires_at);

create or replace function public.issue_registration_otp(
  p_email text,
  p_otp_hash text,
  p_expires_at timestamptz
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.registration_email_verifications%rowtype;
  normalized_email text := lower(trim(p_email));
begin
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));
  delete from public.registration_email_verifications
  where expires_at < now() - interval '24 hours';

  select * into current_row
  from public.registration_email_verifications
  where email = normalized_email
  for update;

  if found then
    if current_row.window_started_at > now() - interval '24 hours' then
      if current_row.send_count >= 5 then return 'limit'; end if;
      if current_row.last_sent_at > now() - interval '60 seconds' then return 'cooldown'; end if;
    end if;

    update public.registration_email_verifications
    set otp_hash = p_otp_hash,
        expires_at = p_expires_at,
        attempts = 0,
        send_count = case when current_row.window_started_at > now() - interval '24 hours' then current_row.send_count + 1 else 1 end,
        window_started_at = case when current_row.window_started_at > now() - interval '24 hours' then current_row.window_started_at else now() end,
        last_sent_at = now(),
        verified_at = null,
        registration_token_hash = null,
        consumed_at = null,
        delivery_confirmed_at = null,
        created_at = now()
    where email = normalized_email;
  else
    insert into public.registration_email_verifications (email, otp_hash, expires_at)
    values (normalized_email, p_otp_hash, p_expires_at);
  end if;

  return 'sent';
end;
$$;

create or replace function public.confirm_registration_otp_delivery(
  p_email text,
  p_otp_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_email text := lower(trim(p_email));
  changed_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));
  update public.registration_email_verifications
  set delivery_confirmed_at = now()
  where email = normalized_email
    and otp_hash = p_otp_hash
    and expires_at > now()
    and attempts < 5
    and delivery_confirmed_at is null
    and consumed_at is null;

  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.verify_registration_otp(text, text, text) from public, anon, authenticated, service_role;
drop function public.verify_registration_otp(text, text, text);

create function public.verify_registration_otp(
  p_email text,
  p_expected_otp_hash text,
  p_otp_matches boolean,
  p_registration_token_hash text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_row public.registration_email_verifications%rowtype;
  normalized_email text := lower(trim(p_email));
begin
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));
  select * into current_row
  from public.registration_email_verifications
  where email = normalized_email
  for update;

  if not found then return 'invalid'; end if;
  if current_row.consumed_at is not null or current_row.verified_at is not null then return 'used'; end if;
  if current_row.expires_at <= now() then return 'expired'; end if;
  if current_row.attempts >= 5 then return 'locked'; end if;
  if current_row.delivery_confirmed_at is null then return 'undelivered'; end if;
  if current_row.otp_hash <> p_expected_otp_hash then return 'stale'; end if;

  if not p_otp_matches then
    update public.registration_email_verifications
    set attempts = attempts + 1
    where email = normalized_email;
    if current_row.attempts + 1 >= 5 then return 'locked'; end if;
    return 'invalid';
  end if;

  update public.registration_email_verifications
  set verified_at = now(), registration_token_hash = p_registration_token_hash
  where email = normalized_email;
  return 'verified';
end;
$$;

create or replace function public.revoke_registration_verification(
  p_registration_token_hash text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_count integer;
begin
  update public.registration_email_verifications
  set registration_token_hash = null,
      consumed_at = coalesce(consumed_at, now())
  where registration_token_hash = p_registration_token_hash
    and consumed_at is null;

  get diagnostics changed_count = row_count;
  return changed_count = 1;
end;
$$;

revoke all on function public.confirm_registration_otp_delivery(text, text) from public, anon, authenticated;
revoke all on function public.issue_registration_otp(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.verify_registration_otp(text, text, boolean, text) from public, anon, authenticated;
revoke all on function public.consume_registration_verification(text, text) from public, anon, authenticated;
revoke all on function public.revoke_registration_verification(text) from public, anon, authenticated;
grant execute on function public.confirm_registration_otp_delivery(text, text) to service_role;
grant execute on function public.issue_registration_otp(text, text, timestamptz) to service_role;
grant execute on function public.verify_registration_otp(text, text, boolean, text) to service_role;
grant execute on function public.consume_registration_verification(text, text) to service_role;
grant execute on function public.revoke_registration_verification(text) to service_role;

notify pgrst, 'reload schema';

-- Ensure all columns expected by current signup routes exist

-- Bring older registration verification tables up to the schema expected by
-- the signup OTP routes and verification RPCs.
alter table public.registration_email_verifications
  add column if not exists attempts integer not null default 0,
  add column if not exists verified_at timestamptz,
  add column if not exists registration_token_hash text,
  add column if not exists consumed_at timestamptz,
  add column if not exists delivery_confirmed_at timestamptz,
  add column if not exists send_count integer not null default 1,
  add column if not exists window_started_at timestamptz not null default now(),
  add column if not exists last_sent_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

notify pgrst, 'reload schema';
