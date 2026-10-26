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