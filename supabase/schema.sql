create extension if not exists pgcrypto;

create table if not exists user_connections (
  id uuid primary key default gen_random_uuid(),
  user_email text not null unique,
  user_name text,
  provider text not null default 'google',
  access_token text not null,
  refresh_token text,
  expires_at bigint,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  name text not null,
  subject text not null default '',
  blocks jsonb not null default '[]'::jsonb,
  global_styles jsonb not null default '{}'::jsonb,
  audience_source text not null default 'contacts',
  status text not null default 'draft',
  recipient_mode text not null default 'all',
  selected_contact_ids jsonb not null default '[]'::jsonb,
  schedule_enabled boolean not null default false,
  schedule_config jsonb not null default '{"frequency":"manual","intervalHours":24,"weeklyDays":[1]}'::jsonb,
  next_run_at timestamptz,
  last_sent_at timestamptz,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table campaigns add column if not exists recipient_mode text not null default 'all';
alter table campaigns add column if not exists selected_contact_ids jsonb not null default '[]'::jsonb;
alter table campaigns add column if not exists audience_source text not null default 'contacts';
alter table campaigns add column if not exists schedule_enabled boolean not null default false;
alter table campaigns add column if not exists schedule_config jsonb not null default '{"frequency":"manual","intervalHours":24,"weeklyDays":[1]}'::jsonb;
alter table campaigns add column if not exists next_run_at timestamptz;

update campaigns
set audience_source = 'contacts'
where audience_source is distinct from 'contacts';

create index if not exists campaigns_owner_email_idx on campaigns(owner_email);
create index if not exists campaigns_next_run_at_idx on campaigns(next_run_at);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null,
  email text not null,
  first_name text,
  last_name text,
  full_name text,
  business_name text,
  source text not null default 'manual',
  source_ref text,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(owner_email, email)
);

create index if not exists contacts_owner_email_idx on contacts(owner_email);
create index if not exists contacts_source_idx on contacts(source);

create table if not exists campaign_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  email text not null,
  subject text not null default '',
  status text not null,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists campaign_deliveries_campaign_id_idx
  on campaign_deliveries(campaign_id);
