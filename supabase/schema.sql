create extension if not exists pgcrypto;

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
  drive_folder_id text not null default '',
  drive_folder_name text not null default '',
  weekly_report_folder_id text not null default '',
  invoice_receipt_folder_id text not null default '',
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
alter table public.invoice_clients add column if not exists service_stopped_at timestamptz;
alter table public.invoice_clients add column if not exists service_recovered_at timestamptz;
alter table public.invoice_clients add column if not exists deleted_at timestamptz;
alter table public.invoice_clients add column if not exists deleted_drive_folder_id text not null default '';
alter table public.invoice_clients add column if not exists deleted_drive_folder_name text not null default '';

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

create index if not exists invoice_clients_brand_client_idx on public.invoice_clients (brand_client);
create index if not exists invoice_uploads_period_idx on public.invoice_uploads (period);
create index if not exists invoice_uploads_client_code_idx on public.invoice_uploads (client_code);
create unique index if not exists bank_accounts_one_default_idx on public.bank_accounts (is_default) where is_default = true and is_active = true and deleted_at is null;
create index if not exists bank_accounts_active_idx on public.bank_accounts (is_active, deleted_at, is_default);
create index if not exists app_activity_created_at_idx on public.app_activity (created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
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

alter table public.invoice_clients enable row level security;
alter table public.business_settings enable row level security;
alter table public.invoice_uploads enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.app_activity enable row level security;
