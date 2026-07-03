-- Row Level Security policies for DN House
-- Model: active staff can create/read orders; admin can do everything.
-- Note: server-side API routes use the service_role key which bypasses RLS.
-- These policies protect any client (anon key) access.

alter table public.profiles       enable row level security;
alter table public.services       enable row level security;
alter table public.orders         enable row level security;
alter table public.order_items    enable row level security;
alter table public.pdf_templates  enable row level security;
alter table public.excel_templates enable row level security;
alter table public.drive_settings enable row level security;
alter table public.generated_files enable row level security;
alter table public.daily_closings enable row level security;
alter table public.app_settings   enable row level security;
alter table public.audit_logs     enable row level security;

-- ---------- profiles ----------
create policy "profiles self read" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles admin write" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- services ----------
create policy "services read" on public.services
  for select using (public.is_active_user());
create policy "services admin write" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- orders ----------
create policy "orders read" on public.orders
  for select using (public.is_active_user());
create policy "orders staff insert" on public.orders
  for insert with check (public.is_active_user());
-- staff may update only completion fields; admin may update anything.
create policy "orders update" on public.orders
  for update using (public.is_active_user()) with check (public.is_active_user());
create policy "orders admin delete" on public.orders
  for delete using (public.is_admin());

-- ---------- order_items ----------
create policy "order_items read" on public.order_items
  for select using (public.is_active_user());
create policy "order_items insert" on public.order_items
  for insert with check (public.is_active_user());
create policy "order_items admin write" on public.order_items
  for update using (public.is_admin()) with check (public.is_admin());
create policy "order_items admin delete" on public.order_items
  for delete using (public.is_admin());

-- ---------- pdf_templates / excel_templates (admin only) ----------
create policy "pdf_templates read" on public.pdf_templates
  for select using (public.is_active_user());
create policy "pdf_templates admin write" on public.pdf_templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "excel_templates admin all" on public.excel_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- drive_settings (admin only) ----------
create policy "drive_settings admin all" on public.drive_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- generated_files ----------
create policy "generated_files read" on public.generated_files
  for select using (public.is_active_user());
create policy "generated_files insert" on public.generated_files
  for insert with check (public.is_active_user());

-- ---------- daily_closings ----------
create policy "daily_closings read" on public.daily_closings
  for select using (public.is_active_user());
create policy "daily_closings admin write" on public.daily_closings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- app_settings ----------
create policy "app_settings read" on public.app_settings
  for select using (public.is_active_user());
create policy "app_settings admin write" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------- audit_logs (admin read; any active user insert) ----------
create policy "audit_logs admin read" on public.audit_logs
  for select using (public.is_admin());
create policy "audit_logs insert" on public.audit_logs
  for insert with check (public.is_active_user());
