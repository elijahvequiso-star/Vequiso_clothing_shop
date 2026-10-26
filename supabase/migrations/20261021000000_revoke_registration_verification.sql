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
