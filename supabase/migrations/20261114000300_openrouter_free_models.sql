alter table public.ai_provider_credentials drop constraint if exists ai_provider_credentials_provider_check;
alter table public.ai_provider_credentials add constraint ai_provider_credentials_provider_check check (provider in ('gemini', 'openai', 'deepseek', 'openrouter'));
alter table public.ai_generation_settings drop constraint if exists ai_generation_settings_provider_check;
alter table public.ai_generation_settings add constraint ai_generation_settings_provider_check check (provider in ('gemini', 'openai', 'deepseek', 'openrouter'));
alter table public.ai_generation_settings add column if not exists gemini_free_tier_confirmed boolean not null default false;
notify pgrst, 'reload schema';
