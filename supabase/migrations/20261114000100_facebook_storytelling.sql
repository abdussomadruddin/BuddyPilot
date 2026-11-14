-- Facebook Storytelling: writing samples, Writing DNA versions, drafts, draft
-- revisions, writing feedback and AI usage counters. One table keyed by kind
-- keeps the feature additive; dropping this table removes it completely.
create table if not exists public.storytelling_items (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null default 'default',
  kind text not null check (kind in ('sample', 'dna', 'draft', 'revision', 'feedback', 'usage')),
  parent_id uuid references public.storytelling_items(id) on delete cascade,
  title text not null default '',
  status text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists storytelling_items_kind_idx
on public.storytelling_items (owner_key, kind, created_at desc);
create index if not exists storytelling_items_parent_idx
on public.storytelling_items (parent_id);

-- No policies: only the server's service role can read or write.
alter table public.storytelling_items enable row level security;
notify pgrst, 'reload schema';
