create table public.post_pilot_queue (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('facebook', 'threads')),
  content text not null check (char_length(content) between 1 and 63206),
  state text not null default 'queued' check (state in ('queued', 'claimed', 'review', 'copy', 'failed')),
  created_at timestamptz not null default now()
);

create index post_pilot_queue_pending_idx on public.post_pilot_queue (created_at, id)
where state = 'queued';
alter table public.post_pilot_queue enable row level security;
revoke all on public.post_pilot_queue from public, anon, authenticated;
grant select, insert, update on public.post_pilot_queue to service_role;
