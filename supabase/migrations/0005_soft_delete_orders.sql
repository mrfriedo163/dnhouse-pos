-- Keep deleted orders for end-of-day checks and future tax/report review.
-- App screens hide these rows by default, but admin can still audit them.

alter table public.orders
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id),
  add column if not exists delete_reason text;

create index if not exists orders_deleted_at_idx on public.orders (deleted_at);

