# Supabase setup

## Apply migrations
Option A — Supabase SQL editor (simplest):
Run each file in order in the SQL editor:
1. `migrations/0001_init.sql`
2. `migrations/0002_rls.sql`
3. `migrations/0003_seed.sql`

Option B — Supabase CLI:
```bash
supabase link --project-ref <ref>
supabase db push
```

## Make yourself admin
After you sign up (email/password) via the app login page, a `profiles` row is
auto-created with role `staff`. Promote yourself once:
```sql
update public.profiles set role = 'admin' where id = (
  select id from auth.users where email = 'you@example.com'
);
```

## Notes
- Server API routes use the SERVICE ROLE key and bypass RLS. All revenue math and
  order-number generation happen server-side.
- RLS still protects direct anon-key access from the browser.
