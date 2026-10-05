alter table public.postpilot_products add column if not exists target_market text not null default '';
alter table public.postpilot_products add column if not exists highlight text not null default '';
notify pgrst, 'reload schema';
