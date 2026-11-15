-- Post Pilot publishing and engagement learning. Additive only:
--  * storytelling_items gains the kind "publication": one row per post on one
--    platform (Facebook Page, Threads, personal Facebook) with its engagement.
--  * ai_provider_credentials can also hold the encrypted social tokens and the
--    hash of the Chrome extension pairing token.
-- Rollback: delete the publication rows and the three credential rows, then
-- restore the two previous check constraints.
alter table public.storytelling_items drop constraint if exists storytelling_items_kind_check;
alter table public.storytelling_items add constraint storytelling_items_kind_check
  check (kind in ('sample', 'dna', 'draft', 'revision', 'feedback', 'usage', 'publication'));

alter table public.ai_provider_credentials drop constraint if exists ai_provider_credentials_provider_check;
alter table public.ai_provider_credentials add constraint ai_provider_credentials_provider_check
  check (provider in ('gemini', 'openai', 'deepseek', 'openrouter', 'facebook_page', 'threads', 'extension'));

notify pgrst, 'reload schema';
