-- Server-only encrypted keys and the explicitly selected generation provider.
create table if not exists public.ai_provider_credentials (
  provider text primary key check (provider in ('gemini', 'openai', 'deepseek')),
  encrypted_key text not null,
  updated_at timestamptz not null default now()
);
alter table public.ai_provider_credentials enable row level security;
revoke all on public.ai_provider_credentials from public, anon, authenticated;
grant select, insert, update on public.ai_provider_credentials to service_role;

create table if not exists public.ai_generation_settings (
  id text primary key check (id = 'default'),
  provider text not null check (provider in ('gemini', 'openai', 'deepseek')),
  model text not null,
  updated_at timestamptz not null default now()
);
alter table public.ai_generation_settings enable row level security;
revoke all on public.ai_generation_settings from public, anon, authenticated;
grant select, insert, update on public.ai_generation_settings to service_role;
notify pgrst, 'reload schema';
