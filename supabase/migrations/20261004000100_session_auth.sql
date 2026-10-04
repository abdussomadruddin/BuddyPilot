-- Session login storage; rerunnable and service-role only.
create table if not exists public.auth_sessions (
  token_hash text primary key,
  password_hash text not null,
  expires_at timestamptz not null
);
create table if not exists public.auth_login_attempts (
  key text primary key,
  attempts integer not null,
  expires_at timestamptz not null
);
create index if not exists auth_sessions_expiry_idx on public.auth_sessions(expires_at);
create index if not exists auth_login_attempts_expiry_idx on public.auth_login_attempts(expires_at);
alter table public.auth_sessions enable row level security;
alter table public.auth_login_attempts enable row level security;
revoke all on public.auth_sessions, public.auth_login_attempts from anon, authenticated;
grant select, insert, delete on public.auth_sessions to service_role;
grant select, insert, update, delete on public.auth_login_attempts to service_role;
create or replace function public.consume_login_attempt(p_key text)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_attempt public.auth_login_attempts;
begin
  delete from public.auth_login_attempts where expires_at <= now();
  delete from public.auth_sessions where expires_at <= now();
  insert into public.auth_login_attempts(key, attempts, expires_at)
  values (p_key, 1, now() + interval '15 minutes')
  on conflict (key) do update set attempts = auth_login_attempts.attempts + 1
  returning * into current_attempt;
  return jsonb_build_object('allowed', current_attempt.attempts <= 5,
    'retry_after', greatest(1, ceil(extract(epoch from current_attempt.expires_at - now()))::integer));
end;
$$;
revoke all on function public.consume_login_attempt(text) from public, anon, authenticated;
grant execute on function public.consume_login_attempt(text) to service_role;
notify pgrst, 'reload schema';
