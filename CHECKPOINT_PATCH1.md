# DN House — Checkpoint Patch 1

Production-ready source code for the DN House laundry & shoe-cleaning service-management web app.

## Status: Phase 1 MVP complete (source), Phase 2 scaffolded
- 87 files, 66 TypeScript/TSX files.
- Core algorithms independently verified: **17/17 checks passed** (revenue math, discount rules, order-number timezone rollover, six-month reminder, revenue-immutable-on-completion).

## What's included
- Next.js 14 App Router + TypeScript project.
- Supabase migrations: `0001_init.sql` (schema), `0002_rls.sql` (RLS), `0003_seed.sql` (10 seed services).
- All pages: login, dashboard, IN order, OUT complete, orders list + detail (print), services, PDF templates, Drive settings, reports, declarations, settings.
- API routes: order create (+ bill fill + Drive upload w/ fallback), complete/undo, bill.pdf, bill-retry, Drive OAuth connect/callback/test, daily/monthly reports, declaration export, template inspect/save, form-review.
- Libs: calc, order-number, reminder, Google OAuth + Drive, pdf-lib bill fill, ExcelJS reports, AES-256-GCM token crypto, Supabase clients.
- Tests (vitest): calc, order-number, revenue, reminder, pdf-mapping.
- Docs: README, Google Drive setup, PDF template setup, deployment, env/OAuth notes.

## What you must do to run it (needs your credentials)
1. `cp .env.example .env.local` and fill Supabase + Google OAuth + `DRIVE_TOKEN_ENC_KEY` (`openssl rand -base64 32`).
2. Run the 3 SQL migrations in Supabase.
3. `npm install && npm run dev`. Sign up, then promote yourself to admin (see `supabase/README.md`).
4. Connect Google Drive from the Drive page; upload a fillable PDF bill template and set it active.

## Not verified in this environment
`npm install`, `npm test`, and `npm run build` could NOT run in the build sandbox (npm/node blocked by seccomp). The math was verified separately in Python. **Run `npm install && npm test && npm run build` locally to confirm the full TypeScript build before deploying.**
