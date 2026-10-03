create table if not exists public.weekly_report_jobs (
  client_code text not null,
  week_start date not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  claim_token uuid not null default gen_random_uuid(),
  lease_expires_at timestamptz not null,
  result jsonb not null default '{}'::jsonb,
  error_message text not null default '',
  completed_at timestamptz,
  primary key (client_code, week_start)
);
alter table public.weekly_report_jobs enable row level security;
revoke all on public.weekly_report_jobs from anon, authenticated;
grant select, insert, update on public.weekly_report_jobs to service_role;
create or replace function public.claim_weekly_report_job(p_client_code text, p_week_start date)
returns setof public.weekly_report_jobs
language sql security invoker set search_path = ''
as $$
  insert into public.weekly_report_jobs as job (client_code, week_start, status, lease_expires_at)
  values (p_client_code, p_week_start, 'processing', now() + interval '5 minutes')
  on conflict (client_code, week_start) do update set
    status = 'processing', claim_token = gen_random_uuid(), lease_expires_at = now() + interval '5 minutes', completed_at = null, error_message = ''
  where job.status = 'failed' or (job.status = 'processing' and job.lease_expires_at < now())
  returning job.*;
$$;
revoke all on function public.claim_weekly_report_job(text, date) from public, anon, authenticated;
grant execute on function public.claim_weekly_report_job(text, date) to service_role;
