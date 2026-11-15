-- Allow an independently encrypted credential for Post Pilot learning.
alter table public.ai_provider_credentials drop constraint if exists ai_provider_credentials_provider_check;
alter table public.ai_provider_credentials add constraint ai_provider_credentials_provider_check
  check (provider in ('gemini', 'openai', 'deepseek', 'openrouter', 'facebook_page', 'threads', 'extension', 'openrouter_learning'));
notify pgrst, 'reload schema';
