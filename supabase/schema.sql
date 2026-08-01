create extension if not exists pgcrypto;

create table if not exists public.tiktok_mcp_connections (
  id text primary key default 'default',
  encrypted_state text not null default '',
  status text not null default 'disconnected',
  authorized_at timestamptz,
  expires_at timestamptz,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tiktok_mcp_connections_singleton check (id = 'default'),
  constraint tiktok_mcp_connections_status check (status in ('disconnected', 'authorizing', 'connected', 'expired', 'error'))
);


create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  last_notified_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_clients (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  brand_client text not null,
  name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  company_name text not null default '',
  registration_number text not null default '',
  billing_name text not null default '',
  billing_address text not null default '',
  monthly_retainer numeric(12, 2) not null default 0,
  service_type text not null default '',
  monthly_ad_budget numeric(12, 2) not null default 0,
  start_date date,
  agency_status text not null default 'active',
  notes text not null default '',
  archived_at timestamptz,
  drive_folder_id text not null default '',
  drive_folder_name text not null default '',
  weekly_report_folder_id text not null default '',
  invoice_receipt_folder_id text not null default '',
  onboarding_status text not null default 'completed',
  onboarding_step text not null default '',
  onboarding_state jsonb not null default '{}'::jsonb,
  onboarding_completed_at timestamptz,
  service_status text not null default 'active',
  service_stopped_at timestamptz,
  service_recovered_at timestamptz,
  deleted_at timestamptz,
  deleted_drive_folder_id text not null default '',
  deleted_drive_folder_name text not null default '',
  source text not null default 'supabase',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.invoice_clients add column if not exists service_status text not null default 'active';
alter table public.invoice_clients add column if not exists onboarding_status text not null default 'completed';
alter table public.invoice_clients add column if not exists onboarding_step text not null default '';
alter table public.invoice_clients add column if not exists onboarding_state jsonb not null default '{}'::jsonb;
alter table public.invoice_clients add column if not exists onboarding_completed_at timestamptz;
alter table public.invoice_clients add column if not exists service_stopped_at timestamptz;
alter table public.invoice_clients add column if not exists service_recovered_at timestamptz;
alter table public.invoice_clients add column if not exists deleted_at timestamptz;
alter table public.invoice_clients add column if not exists deleted_drive_folder_id text not null default '';
alter table public.invoice_clients add column if not exists deleted_drive_folder_name text not null default '';
alter table public.invoice_clients add column if not exists service_type text not null default '';
alter table public.invoice_clients add column if not exists monthly_ad_budget numeric(12, 2) not null default 0;
alter table public.invoice_clients add column if not exists start_date date;
alter table public.invoice_clients add column if not exists agency_status text;
alter table public.invoice_clients add column if not exists notes text not null default '';
alter table public.invoice_clients add column if not exists archived_at timestamptz;

create table if not exists public.agency_services (
  id uuid primary key default gen_random_uuid(),
  client_code text not null references public.invoice_clients(code) on update cascade on delete cascade,
  name text not null,
  monthly_fee numeric(12, 2) not null default 0 check (monthly_fee >= 0),
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  start_date date,
  renewal_date date,
  owner text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_tasks (
  id uuid primary key default gen_random_uuid(),
  client_code text not null references public.invoice_clients(code) on update cascade on delete cascade,
  service_id uuid references public.agency_services(id) on delete set null,
  title text not null,
  due_date date,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  owner text not null default '',
  notes text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update public.invoice_clients
set agency_status = case
  when deleted_at is not null then 'archived'
  when onboarding_status = 'in_progress' then 'onboarding'
  when service_status = 'paused' then 'paused'
  else 'active'
end
where agency_status is null
   or agency_status not in ('onboarding', 'active', 'paused', 'completed', 'archived');

alter table public.invoice_clients alter column agency_status set default 'active';
alter table public.invoice_clients alter column agency_status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.invoice_clients'::regclass and conname = 'invoice_clients_agency_status_check') then
    alter table public.invoice_clients
      add constraint invoice_clients_agency_status_check
      check (agency_status in ('onboarding', 'active', 'paused', 'completed', 'archived'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.invoice_clients'::regclass and conname = 'invoice_clients_monthly_ad_budget_check') then
    alter table public.invoice_clients
      add constraint invoice_clients_monthly_ad_budget_check
      check (monthly_ad_budget >= 0);
  end if;
end
$$;

create table if not exists public.business_settings (
  id text primary key default 'default',
  name text not null default '',
  registration_number text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  payment_details text not null default '',
  bank_name text not null default '',
  bank_account_number text not null default '',
  bank_account_name text not null default '',
  payment_link text not null default '',
  logo_path text not null default '',
  logo_image_name text not null default '',
  logo_image_mime text not null default '',
  logo_image_size integer not null default 0,
  logo_image_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_settings_singleton check (id = 'default')
);

alter table public.business_settings add column if not exists logo_image_name text not null default '';
alter table public.business_settings add column if not exists logo_image_mime text not null default '';
alter table public.business_settings add column if not exists logo_image_size integer not null default 0;
alter table public.business_settings add column if not exists logo_image_updated_at timestamptz;

create table if not exists public.invoice_uploads (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  period text not null,
  client_code text not null,
  client_name text not null default '',
  invoice_date date,
  service_price numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  currency text not null default 'MYR',
  drive_file_id text not null default '',
  drive_file_name text not null default '',
  drive_file_url text not null default '',
  invoice_receipt_folder_id text not null default '',
  replaced boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  label text not null default '',
  bank_name text not null default '',
  account_name text not null default '',
  account_number text not null default '',
  qr_image_path text not null default '',
  qr_image_name text not null default '',
  qr_image_mime text not null default '',
  qr_image_size integer not null default 0,
  qr_image_updated_at timestamptz,
  is_default boolean not null default false,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.bank_accounts add column if not exists qr_image_path text not null default '';
alter table public.bank_accounts add column if not exists qr_image_name text not null default '';
alter table public.bank_accounts add column if not exists qr_image_mime text not null default '';
alter table public.bank_accounts add column if not exists qr_image_size integer not null default 0;
alter table public.bank_accounts add column if not exists qr_image_updated_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bank-qr',
  'bank-qr',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'postpilot-assets',
  'postpilot-assets',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.postpilot_drafts (
  id text primary key default 'default',
  product_name text not null default 'K-Method',
  affiliate_link text not null default 'https://swiy.co/kmethod',
  post_mode text not null default 'soft',
  recent_variations jsonb not null default '[]'::jsonb,
  hook_image_path text not null default '',
  hook_image_name text not null default '',
  hook_image_mime text not null default '',
  hook_image_size integer not null default 0,
  hook_image_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint postpilot_drafts_singleton check (id = 'default')
);

create table if not exists public.postpilot_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  affiliate_link text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.postpilot_products (name, affiliate_link)
select product_name, affiliate_link from public.postpilot_drafts where id = 'default'
and not exists (select 1 from public.postpilot_products);

alter table public.postpilot_drafts add column if not exists active_product_id uuid references public.postpilot_products(id) on delete set null;
update public.postpilot_drafts set active_product_id = (select id from public.postpilot_products order by created_at asc limit 1)
where active_product_id is null;
create index if not exists postpilot_drafts_active_product_idx on public.postpilot_drafts(active_product_id);

alter table public.postpilot_drafts add column if not exists product_name text not null default 'K-Method';
alter table public.postpilot_drafts add column if not exists affiliate_link text not null default 'https://swiy.co/kmethod';
alter table public.postpilot_drafts add column if not exists post_mode text not null default 'soft';
alter table public.postpilot_drafts add column if not exists hook_image_path text not null default '';
alter table public.postpilot_drafts add column if not exists hook_image_name text not null default '';
alter table public.postpilot_drafts add column if not exists hook_image_mime text not null default '';
alter table public.postpilot_drafts add column if not exists hook_image_size integer not null default 0;
alter table public.postpilot_drafts add column if not exists hook_image_updated_at timestamptz;
alter table public.postpilot_drafts add column if not exists recent_variations jsonb not null default '[]'::jsonb;

create table if not exists public.postpilot_hook_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  image_name text not null default '',
  image_mime text not null default 'image/jpeg',
  image_size integer not null default 0,
  use_count integer not null default 0,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.postpilot_hook_images add column if not exists product_id uuid references public.postpilot_products(id) on delete cascade;
update public.postpilot_hook_images set product_id = (select id from public.postpilot_products order by created_at asc limit 1)
where product_id is null;
alter table public.postpilot_hook_images alter column product_id set not null;

create index if not exists postpilot_hook_images_rotation_idx
on public.postpilot_hook_images (use_count asc, last_used_at asc nulls first, created_at asc);
create index if not exists postpilot_hook_images_product_rotation_idx
on public.postpilot_hook_images (product_id, use_count asc, last_used_at asc nulls first, created_at asc);

create table if not exists public.postpilot_voice_profiles (
  scope_key text primary key,
  product_id uuid references public.postpilot_products(id) on delete cascade,
  channel text not null check (channel in ('promote', 'threads_general')),
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.postpilot_copy_history (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('facebook', 'threads', 'threads_general')),
  product_id uuid references public.postpilot_products(id) on delete cascade,
  pattern_family text not null default '',
  pattern_id text not null default '',
  opening_id text not null default '',
  length_bucket text not null default '',
  paragraph_shape text not null default '',
  intent_key text not null default '',
  text_hash text not null,
  semantic_fingerprint text not null default '',
  post_text text not null,
  seed text not null default '',
  rating text check (rating is null or rating in ('winner', 'average', 'weak')),
  metadata jsonb not null default '{}'::jsonb,
  rated_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists postpilot_copy_history_scope_idx
on public.postpilot_copy_history (channel, product_id, created_at desc);
create index if not exists postpilot_copy_history_product_idx
on public.postpilot_copy_history (product_id);
create index if not exists postpilot_copy_history_rating_idx
on public.postpilot_copy_history (channel, product_id, rating, created_at desc);
create unique index if not exists postpilot_copy_history_text_hash_idx
on public.postpilot_copy_history (channel, text_hash);
create index if not exists postpilot_voice_profiles_product_idx
on public.postpilot_voice_profiles (product_id);

create table if not exists public.postpilot_extension_devices (
  id uuid primary key default gen_random_uuid(),
  device_name text not null default 'Mac Chrome',
  token_hash text not null unique,
  wake_topic text not null unique,
  status text not null default 'active' check (status in ('active', 'revoked')),
  paired_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists postpilot_extension_devices_one_active_idx
on public.postpilot_extension_devices ((status)) where status = 'active';

create table if not exists public.postpilot_extension_pair_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists postpilot_extension_pair_codes_lookup_idx
on public.postpilot_extension_pair_codes (code_hash, expires_at desc) where used_at is null;

create table if not exists public.postpilot_automation_jobs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.postpilot_extension_devices(id) on delete restrict,
  job_type text not null check (job_type in ('facebook_threads', 'threads_text')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled', 'expired')),
  progress jsonb not null default '{}'::jsonb,
  idempotency_key uuid not null unique default gen_random_uuid(),
  error_message text not null default '',
  expires_at timestamptz not null default (now() + interval '24 hours'),
  claimed_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  cancel_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists postpilot_automation_jobs_one_active_idx
on public.postpilot_automation_jobs (device_id)
where status in ('queued', 'claimed', 'running');

create index if not exists postpilot_automation_jobs_device_created_idx
on public.postpilot_automation_jobs (device_id, created_at desc);

-- Keep the previous single hook image available after upgrading to the gallery.
insert into public.postpilot_hook_images (product_id, storage_path, image_name, image_mime, image_size, created_at, updated_at)
select active_product_id, hook_image_path, hook_image_name, hook_image_mime, hook_image_size,
  coalesce(hook_image_updated_at, now()), coalesce(hook_image_updated_at, now())
from public.postpilot_drafts
where id = 'default' and hook_image_path <> ''
on conflict (storage_path) do nothing;

create table if not exists public.app_activity (
  id uuid primary key default gen_random_uuid(),
  activity_type text not null default 'info',
  title text not null default '',
  description text not null default '',
  entity_type text not null default '',
  entity_id text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_daily_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_code text not null,
  report_date date not null,
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed')),
  telegram_message_id text not null default '',
  error_message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_code, report_date)
);

create table if not exists public.operations_health (
  service_name text primary key,
  status text not null default 'setup' check (status in ('healthy', 'warning', 'down', 'setup')),
  detail text not null default '',
  latency_ms integer,
  consecutive_failures integer not null default 0,
  last_checked_at timestamptz,
  last_healthy_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operations_incidents (
  id uuid primary key default gen_random_uuid(),
  fingerprint text not null unique,
  severity text not null default 'warning' check (severity in ('warning', 'critical')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  service_name text not null default '',
  entity_type text not null default '',
  entity_id text not null default '',
  client_code text not null default '',
  title text not null default '',
  detail text not null default '',
  action jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoice_clients_brand_client_idx on public.invoice_clients (brand_client);
create index if not exists invoice_clients_onboarding_status_idx on public.invoice_clients (onboarding_status);
create index if not exists agency_services_client_status_idx on public.agency_services (client_code, status);
create index if not exists agency_services_renewal_idx on public.agency_services (renewal_date) where status = 'active';
create index if not exists agency_tasks_client_status_idx on public.agency_tasks (client_code, status);
create index if not exists agency_tasks_service_id_idx on public.agency_tasks (service_id) where service_id is not null;
create index if not exists agency_tasks_due_idx on public.agency_tasks (due_date) where status in ('todo', 'in_progress');
create index if not exists invoice_uploads_period_idx on public.invoice_uploads (period);
create index if not exists invoice_uploads_client_code_idx on public.invoice_uploads (client_code);
create unique index if not exists bank_accounts_one_default_idx on public.bank_accounts (is_default) where is_default = true and is_active = true and deleted_at is null;
create index if not exists bank_accounts_active_idx on public.bank_accounts (is_active, deleted_at, is_default);
create index if not exists app_activity_created_at_idx on public.app_activity (created_at desc);
create index if not exists telegram_daily_deliveries_report_date_idx on public.telegram_daily_deliveries (report_date desc);
create index if not exists push_subscriptions_updated_at_idx on public.push_subscriptions (updated_at desc);
create index if not exists operations_health_status_idx on public.operations_health (status, updated_at desc);
create index if not exists operations_incidents_open_idx on public.operations_incidents (status, severity, last_seen_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists invoice_clients_touch_updated_at on public.invoice_clients;
create trigger invoice_clients_touch_updated_at
before update on public.invoice_clients
for each row execute function public.touch_updated_at();

drop trigger if exists agency_services_touch_updated_at on public.agency_services;
create trigger agency_services_touch_updated_at
before update on public.agency_services
for each row execute function public.touch_updated_at();

drop trigger if exists agency_tasks_touch_updated_at on public.agency_tasks;
create trigger agency_tasks_touch_updated_at
before update on public.agency_tasks
for each row execute function public.touch_updated_at();

drop trigger if exists business_settings_touch_updated_at on public.business_settings;
create trigger business_settings_touch_updated_at
before update on public.business_settings
for each row execute function public.touch_updated_at();

drop trigger if exists invoice_uploads_touch_updated_at on public.invoice_uploads;
create trigger invoice_uploads_touch_updated_at
before update on public.invoice_uploads
for each row execute function public.touch_updated_at();

drop trigger if exists bank_accounts_touch_updated_at on public.bank_accounts;
create trigger bank_accounts_touch_updated_at
before update on public.bank_accounts
for each row execute function public.touch_updated_at();

drop trigger if exists postpilot_drafts_touch_updated_at on public.postpilot_drafts;
create trigger postpilot_drafts_touch_updated_at
before update on public.postpilot_drafts
for each row execute function public.touch_updated_at();

drop trigger if exists postpilot_hook_images_touch_updated_at on public.postpilot_hook_images;
create trigger postpilot_hook_images_touch_updated_at
before update on public.postpilot_hook_images
for each row execute function public.touch_updated_at();

drop trigger if exists postpilot_products_touch_updated_at on public.postpilot_products;
create trigger postpilot_products_touch_updated_at
before update on public.postpilot_products
for each row execute function public.touch_updated_at();

drop trigger if exists postpilot_voice_profiles_touch_updated_at on public.postpilot_voice_profiles;
create trigger postpilot_voice_profiles_touch_updated_at
before update on public.postpilot_voice_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists tiktok_mcp_connections_touch_updated_at on public.tiktok_mcp_connections;
create trigger tiktok_mcp_connections_touch_updated_at
before update on public.tiktok_mcp_connections
for each row execute function public.touch_updated_at();

drop trigger if exists push_subscriptions_touch_updated_at on public.push_subscriptions;
create trigger push_subscriptions_touch_updated_at
before update on public.push_subscriptions
for each row execute function public.touch_updated_at();

drop trigger if exists operations_health_touch_updated_at on public.operations_health;
create trigger operations_health_touch_updated_at
before update on public.operations_health
for each row execute function public.touch_updated_at();

drop trigger if exists operations_incidents_touch_updated_at on public.operations_incidents;
create trigger operations_incidents_touch_updated_at
before update on public.operations_incidents
for each row execute function public.touch_updated_at();

alter table public.invoice_clients enable row level security;
alter table public.agency_services enable row level security;
alter table public.agency_tasks enable row level security;
alter table public.tiktok_mcp_connections enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.business_settings enable row level security;
alter table public.invoice_uploads enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.app_activity enable row level security;
alter table public.telegram_daily_deliveries enable row level security;
alter table public.postpilot_drafts enable row level security;
alter table public.postpilot_hook_images enable row level security;
alter table public.postpilot_products enable row level security;
alter table public.postpilot_voice_profiles enable row level security;
alter table public.postpilot_copy_history enable row level security;
alter table public.postpilot_extension_devices enable row level security;
alter table public.postpilot_extension_pair_codes enable row level security;
alter table public.postpilot_automation_jobs enable row level security;
alter table public.operations_health enable row level security;
alter table public.operations_incidents enable row level security;

grant select, insert, update, delete on public.postpilot_hook_images to service_role;
grant select, insert, update, delete on public.invoice_clients to service_role;
revoke all on public.invoice_clients from anon, authenticated;
grant select, insert, update, delete on public.agency_services to service_role;
grant select, insert, update, delete on public.agency_tasks to service_role;
revoke all on public.agency_services from anon, authenticated;
revoke all on public.agency_tasks from anon, authenticated;
grant select, insert, update, delete on public.postpilot_products to service_role;
revoke all on public.postpilot_products from anon, authenticated;
grant select, insert, update, delete on public.postpilot_voice_profiles to service_role;
grant select, insert, update, delete on public.postpilot_copy_history to service_role;
revoke all on public.postpilot_voice_profiles from anon, authenticated;
revoke all on public.postpilot_copy_history from anon, authenticated;
grant select, insert, update, delete on public.tiktok_mcp_connections to service_role;
revoke all on public.tiktok_mcp_connections from anon, authenticated;
grant select, insert, update, delete on public.push_subscriptions to service_role;
revoke all on public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on public.telegram_daily_deliveries to service_role;
grant select, insert, update, delete on public.postpilot_extension_devices to service_role;
grant select, insert, update, delete on public.postpilot_extension_pair_codes to service_role;
grant select, insert, update, delete on public.postpilot_automation_jobs to service_role;
revoke all on public.postpilot_extension_devices from anon, authenticated;
revoke all on public.postpilot_extension_pair_codes from anon, authenticated;
revoke all on public.postpilot_automation_jobs from anon, authenticated;
grant select, insert, update, delete on public.operations_health to service_role;
grant select, insert, update, delete on public.operations_incidents to service_role;
revoke all on public.operations_health from anon, authenticated;
revoke all on public.operations_incidents from anon, authenticated;

drop trigger if exists telegram_daily_deliveries_touch_updated_at on public.telegram_daily_deliveries;
create trigger telegram_daily_deliveries_touch_updated_at
before update on public.telegram_daily_deliveries
for each row execute function public.touch_updated_at();

drop trigger if exists postpilot_extension_devices_touch_updated_at on public.postpilot_extension_devices;
create trigger postpilot_extension_devices_touch_updated_at
before update on public.postpilot_extension_devices
for each row execute function public.touch_updated_at();

drop trigger if exists postpilot_automation_jobs_touch_updated_at on public.postpilot_automation_jobs;
create trigger postpilot_automation_jobs_touch_updated_at
before update on public.postpilot_automation_jobs
for each row execute function public.touch_updated_at();
