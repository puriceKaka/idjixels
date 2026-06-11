-- Jixels Master Card Supabase full setup
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists cards (
  id text primary key,
  name text not null,
  location text not null,
  branch text not null,
  national_id text not null unique,
  phone text not null unique,
  email text not null default '',
  position text not null,
  photo text not null,
  verification_token text not null unique,
  status text not null default 'Pending',
  inactive_reason text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint cards_status_check check (status in ('Pending', 'Approved', 'Rejected', 'Suspended', 'Lost', 'Inactive'))
);

create table if not exists audit_log (
  id bigint generated always as identity primary key,
  action text not null,
  card_id text,
  actor text not null,
  created_at timestamptz not null default now()
);

create table if not exists attendance_records (
  id text primary key,
  card_id text not null,
  worker_name text not null,
  worker_id text not null,
  branch text not null default '',
  position text not null default '',
  attendance_date date not null,
  signed_in_at timestamptz,
  signed_out_at timestamptz,
  sign_in_latitude numeric,
  sign_in_longitude numeric,
  sign_out_latitude numeric,
  sign_out_longitude numeric,
  location_accuracy numeric,
  scan_source text not null default 'card-scan',
  status text not null default 'Signed Out',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint attendance_status_check check (status in ('Signed In', 'Signed Out'))
);

create table if not exists scanner_devices (
  id text primary key,
  device_id text not null unique,
  device_secret text not null default '',
  password_salt text not null default '',
  password_hash text not null default '',
  device_name text not null default '',
  device_owner text not null default '',
  device_phone text not null default '',
  registered_by text not null default 'admin',
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint scanner_devices_status_check check (status in ('Active', 'Disabled'))
);

create table if not exists admin_users (
  username text primary key,
  email text not null default '',
  password_salt text not null,
  password_hash text not null,
  role text not null default 'super-admin',
  branch text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint admin_users_role_check check (role in ('super-admin', 'admin'))
);

alter table cards add column if not exists email text not null default '';
alter table cards add column if not exists inactive_reason text;
alter table cards add column if not exists approved_by text;
alter table cards add column if not exists approved_at timestamptz;
alter table cards add column if not exists updated_at timestamptz;

alter table scanner_devices add column if not exists device_secret text not null default '';
alter table scanner_devices add column if not exists password_salt text not null default '';
alter table scanner_devices add column if not exists password_hash text not null default '';
alter table scanner_devices add column if not exists device_owner text not null default '';
alter table scanner_devices add column if not exists device_phone text not null default '';
alter table scanner_devices add column if not exists updated_at timestamptz;

alter table attendance_records add column if not exists branch text not null default '';
alter table attendance_records add column if not exists position text not null default '';
alter table attendance_records add column if not exists location_accuracy numeric;
alter table attendance_records add column if not exists scan_source text not null default 'card-scan';
alter table attendance_records add column if not exists updated_at timestamptz;

create index if not exists cards_branch_idx on cards (branch);
create index if not exists cards_status_idx on cards (status);
create index if not exists cards_position_idx on cards (position);
create unique index if not exists cards_email_unique_idx on cards (lower(email)) where email <> '';

create index if not exists audit_log_card_idx on audit_log (card_id);
create index if not exists audit_log_created_idx on audit_log (created_at desc);

create index if not exists attendance_card_idx on attendance_records (card_id);
create index if not exists attendance_date_idx on attendance_records (attendance_date);
create index if not exists attendance_status_idx on attendance_records (status);

create index if not exists scanner_devices_status_idx on scanner_devices (status);
create index if not exists scanner_devices_phone_idx on scanner_devices (device_phone);

insert into admin_users (
  username,
  email,
  password_salt,
  password_hash,
  role,
  branch,
  updated_at
) values (
  'admin',
  'adminjixels@gmail.com',
  '6c00548c199dbd6c1c4fc32c69e584a9',
  'eafb7dbb8acbac4fb6478079cf72bf9a178ae8f7be5bdd25c7a0c3d00d294bbe',
  'super-admin',
  '',
  now()
)
on conflict (username) do update set
  email = excluded.email,
  password_salt = excluded.password_salt,
  password_hash = excluded.password_hash,
  role = excluded.role,
  branch = excluded.branch,
  updated_at = now();

alter table cards enable row level security;
alter table audit_log enable row level security;
alter table attendance_records enable row level security;
alter table scanner_devices enable row level security;
alter table admin_users enable row level security;

-- The Node server uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS safely on the server.
-- Do not expose the service-role key in browser files.

notify pgrst, 'reload schema';
