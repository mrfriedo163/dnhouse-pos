-- DN House schema (Phase 1)
-- All monetary values are integers (VND has no cents) but kept numeric for safety.

create extension if not exists "pgcrypto";

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('admin','staff')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- services ----------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit_type text not null,               -- kg, pair, item, set, custom
  default_price numeric not null default 0 check (default_price >= 0),
  active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------- orders ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  received_at timestamptz not null default now(),
  due_at timestamptz,
  customer_name text,
  customer_phone text,
  subtotal numeric not null default 0 check (subtotal >= 0),
  discount_type text not null default 'none' check (discount_type in ('none','percent','fixed')),
  discount_value numeric not null default 0 check (discount_value >= 0),
  discount_total numeric not null default 0 check (discount_total >= 0),
  final_total numeric not null default 0 check (final_total >= 0),
  note text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id),
  completed_note text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  bill_drive_file_id text,
  bill_drive_web_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists orders_received_at_idx on public.orders (received_at);
create index if not exists orders_is_completed_idx on public.orders (is_completed);
create index if not exists orders_phone_idx on public.orders (customer_phone);
create index if not exists orders_due_at_idx on public.orders (due_at);

-- ---------- order_items ----------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id),
  service_name_snapshot text not null,
  unit_type text,
  quantity numeric not null default 1 check (quantity > 0),
  unit_price numeric not null default 0 check (unit_price >= 0),
  line_total numeric not null default 0 check (line_total >= 0),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

-- ---------- pdf_templates ----------
create table if not exists public.pdf_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_type text not null default 'bill' check (template_type in ('bill','declaration')),
  drive_file_id text,
  drive_web_url text,
  original_file_name text,
  field_mapping jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------- excel_templates ----------
create table if not exists public.excel_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_type text not null default 'declaration' check (template_type in ('daily_report','monthly_report','declaration')),
  drive_file_id text,
  drive_web_url text,
  original_file_name text,
  mapping_json jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------- drive_settings (single row expected) ----------
create table if not exists public.drive_settings (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid references public.profiles(id),
  root_folder_id text,
  root_folder_url text,
  encrypted_token jsonb,
  connected boolean not null default false,
  last_test_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

-- ---------- generated_files ----------
create table if not exists public.generated_files (
  id uuid primary key default gen_random_uuid(),
  file_type text,  -- bill_pdf, daily_report, monthly_report, declaration_draft, backup
  related_order_id uuid references public.orders(id),
  file_name text,
  drive_file_id text,
  drive_web_url text,
  generated_by uuid references public.profiles(id),
  generated_at timestamptz not null default now(),
  metadata jsonb
);

-- ---------- daily_closings ----------
create table if not exists public.daily_closings (
  id uuid primary key default gen_random_uuid(),
  closing_date date unique,
  in_order_count int not null default 0,
  completed_order_count int not null default 0,
  pending_order_count int not null default 0,
  gross_revenue numeric not null default 0,
  total_discount numeric not null default 0,
  net_revenue numeric not null default 0,
  service_summary jsonb,
  report_drive_file_id text,
  report_drive_web_url text,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- app_settings ----------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- audit_logs ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

-- ---------- helper: is_admin() ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and p.active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.active = true
  );
$$;

-- ---------- new-user trigger: create profile row ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'staff')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- default app settings
insert into public.app_settings (key, value) values
  ('shop_info', '{"shop_name":"DN HOUSE","business_type":"Giặt sấy & Vệ sinh giày Cần Thơ","address":"648/24 Bình Trung, Long Tuyền, Bình Thủy, Cần Thơ","phone":""}'::jsonb),
  ('order_prefix', '"DN"'::jsonb),
  ('default_due_hours', '48'::jsonb),
  ('form_review', '{"last_form_review_at":null,"next_form_review_at":null,"reminder_snooze_until":null,"form_review_note":null,"staff_can_see":false}'::jsonb)
on conflict (key) do nothing;
