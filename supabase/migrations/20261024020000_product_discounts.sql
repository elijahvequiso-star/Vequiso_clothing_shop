create table if not exists public.product_price_settings (
  product_id text primary key,
  regular_price numeric(12,2) not null check (regular_price >= 0),
  discount_percent numeric(5,2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.product_price_settings enable row level security;
revoke all on public.product_price_settings from anon, authenticated;
grant select on public.product_price_settings to authenticated;
