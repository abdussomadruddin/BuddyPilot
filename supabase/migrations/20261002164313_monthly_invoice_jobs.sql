create table if not exists public.monthly_invoice_jobs (
  kind text not null check (kind in ('upload', 'reminder')),
  period text not null check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  status text not null check (status in ('processing', 'completed', 'failed')),
  claim_token uuid not null default gen_random_uuid(),
  lease_expires_at timestamptz not null,
  result jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (kind, period)
);
alter table public.monthly_invoice_jobs enable row level security;
revoke all on public.monthly_invoice_jobs from anon, authenticated;
grant select, insert, update on public.monthly_invoice_jobs to service_role;

-- A single atomic claim prevents concurrent cron runs. The lease exceeds the function's 60s lifetime.
create or replace function public.claim_monthly_invoice_job(p_kind text, p_period text)
returns setof public.monthly_invoice_jobs
language sql security invoker set search_path = ''
as $$
  insert into public.monthly_invoice_jobs as job (kind, period, status, lease_expires_at)
  values (p_kind, p_period, 'processing', now() + interval '5 minutes')
  on conflict (kind, period) do update set
    status = 'processing', claim_token = gen_random_uuid(),
    lease_expires_at = now() + interval '5 minutes', started_at = now(),
    completed_at = null, error_message = '', updated_at = now()
  where job.status = 'failed' or (job.status = 'processing' and job.lease_expires_at < now())
  returning job.*;
$$;
revoke all on function public.claim_monthly_invoice_job(text, text) from public, anon, authenticated;
grant execute on function public.claim_monthly_invoice_job(text, text) to service_role;
