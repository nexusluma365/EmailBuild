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
  audience_source text not null default 'referrals',
  status text not null default 'draft',
  automation_enabled boolean not null default false,
  auto_send_on_import boolean not null default false,
  last_sent_at timestamptz,
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists campaigns_owner_email_idx on campaigns(owner_email);

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
