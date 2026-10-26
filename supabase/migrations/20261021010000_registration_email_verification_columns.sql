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
