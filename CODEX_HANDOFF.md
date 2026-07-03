# DN House POS Handoff

## Project

DN House POS is the internal laundry order-management app for DN House.

Current runnable app:

- Local/demo POS route: `/demo`
- Supabase-ready app routes: `/login`, `/dashboard`, `/orders`, `/reports`, `/settings`
- Framework: Next.js 14, TypeScript, Tailwind
- Package manager: pnpm

## Current Local Accounts

The `/demo` MVP uses browser-local auth for quick testing:

- `admin` / `123456789`
- `staff` / `123456789`

This is only for MVP/local testing. Production should use Supabase Auth.

## Role Rules

Admin:

- See revenue.
- Configure data webhook.
- Export declaration CSV.
- Delete orders.
- Print invoices.
- Create and complete orders.

Staff:

- Create orders.
- Print invoices.
- Complete/return orders.
- Cannot see real revenue.
- Cannot export declaration data.
- Cannot delete orders.
- Cannot configure webhook.

## Current MVP Data

The `/demo` route stores data in browser `localStorage`:

- Orders: `dn-house-pos-demo-orders`
- Settings: `dn-house-pos-demo-settings`
- Auth session: `dn-house-pos-demo-auth`

This is useful for quick testing only. For real multi-device operation, connect Supabase.

## Supabase

The original app already includes Supabase migrations under:

- `supabase/migrations/`

Production setup should:

1. Create a Supabase project.
2. Run migrations.
3. Configure env vars from `.env.example`.
4. Use `/login` and `/dashboard` instead of `/demo`.

## Tax Declaration

Current MVP export:

- `/demo` has `Xuất dữ liệu kê khai`, exporting CSV from order data.

Target future flow:

1. Put official tax templates in `templates/tax/`.
2. Map order/revenue data into the official template.
3. Use `Mẫu 01/CNKD` for household/business tax declaration unless the tax authority changes the active form.

If a future Codex agent works on tax export, read this file first, then inspect `src/app/demo/page.tsx` and the Supabase reports/declaration routes.

## Invoice

Current MVP invoice:

- A simple printable receipt window generated in `/demo`.
- This is a receipt/payment slip, not an official e-invoice.

Future invoice template files should go under:

- `templates/invoice/`

## Run Locally

```powershell
pnpm install --ignore-workspace
pnpm build
pnpm exec next start -H 127.0.0.1 -p 3001
```

Open:

```text
http://127.0.0.1:3001/demo
```

## Verify

```powershell
pnpm test
pnpm build
```

