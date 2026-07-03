# DN House — Full Delivery (dn-house-webapp-full)

Internal laundry & shoe-cleaning service-management web app. Next.js 14 App Router + TypeScript + Supabase (Auth/Postgres/RLS) + Google Drive API + pdf-lib + ExcelJS. Vercel-ready.

## What is complete
**Auth & roles** — Supabase email/password; admin & staff; full RLS on every table; server routes use the service-role key and never trust client math.

**IN order** — mobile-first multi-item form; server-side revenue math; order number `DN-YYYYMMDD-0001` (daily sequence, Asia/Ho_Chi_Minh, collision-retry); fills the active fillable PDF template, flattens it, uploads to `Drive/Bills/YYYY-MM/`, stores `bill_drive_file_id` + web URL. Drive failure never blocks the save — a retry button appears.

**Bill PDF** — upload template, inspect form fields (pdf-lib), map fields → 16 bill variables, set active, warn when a PDF has no fillable fields. On the order page: Preview/Print, Download, Open on Drive; retry generation/upload.

**OUT / completion** — search by order_no / phone / name, incomplete first, tick "Đã giao đồ / Hoàn thành đơn" (sets `is_completed`, `completed_at`, `completed_by`, `completed_note`). Never touches revenue. Admin can undo (audited).

**Orders list/detail** — filters by received_at range, completed/incomplete/overdue, order_no/phone/name; desktop table + mobile cards; detail with reprint, open Drive bill, retry upload; **admin edit** (recomputes revenue, audited) and **admin delete** (audited).

**Dashboard** — admin: today IN count, revenue (by IN), gross, discount, completed, pending, overdue, Drive status, six-month review alert, quick buttons (New IN, Search, Daily/Monthly report, Declarations, Open Drive). Staff: operational subset.

**Google Drive** — OAuth (offline + consent for refresh token), AES-256-GCM token encryption, auto-refresh + persist, status (connected / not connected / reconnect), buttons (Connect, Reconnect, Test Upload, Open folder), auto-creates the full folder tree.

**Reports** — daily & monthly editable Excel (ExcelJS), revenue by `received_at`; daily sheets: Summary, Orders, Services breakdown, Incomplete/Overdue, Manual notes; monthly sheets: Daily revenue, All orders, Service summary, Discounts, Incomplete/Overdue, Manual notes. Download or upload to Drive.

**Declaration / accounting drafts** — export clean revenue data by date range to editable Excel; optional **admin-uploaded Excel template** with field→column mapping + start row, auto-filled from IN order data; upload to `Declaration Drafts/YYYY-MM/`; permanent disclaimer. No legal submission claim.

**Six-month review reminder** — stored in `app_settings.form_review`; dashboard alert when due/snooze expired; "Đã rà soát (6 tháng)", "Nhắc lại sau 7 ngày", open Declaration Drafts, create note. Hidden from staff unless enabled.

**Backup** — export key tables to a multi-sheet Excel + JSON, upload to `Drive/Backups/` (token tables excluded); download option; audited.

**Audit logs** — order create/edit/delete, completion, completion undo, PDF/Excel template changes, Drive/declaration/backup actions, form-review updates.

**Tests (vitest)** — discount calc, final_total non-negative, order number + timezone rollover, IN revenue, OUT completion doesn't change revenue, daily/monthly revenue windows by received_at, PDF field mapping, Drive upload fallback shape, declaration date range, six-month reminder, role permissions.

## What was verified
- **Core algorithms: 17/17 independent checks passed** (revenue, discount, order-number tz rollover, reminder, revenue-immutable-on-completion) re-run in an isolated harness.
- **Report/declaration date windows** verified against Asia/Ho_Chi_Minh boundaries.
- **Static consistency**: all 15 API route files export valid handlers; every `@/…` import resolves to a real file (0 missing); no client component imports server-only modules.

## What could NOT be verified in this build environment
`npm install`, `npm test`, and `npm run build` could not run here — the sandbox's seccomp policy kills `node`/`npm` (`Bad system call`). No `package-lock.json` is shipped for the same reason. **Run `npm install && npm test && npm run build` locally / in CI before deploying.** The math was validated separately in Python; TypeScript type-checking has not been executed.

## How to run locally
```bash
cp .env.example .env.local   # fill values
npm install
# run supabase/migrations/000{1,2,3}.sql in Supabase SQL editor
npm run dev                  # http://localhost:3000
```
Sign up, then promote to admin (see `supabase/README.md`).

## How to deploy
See `docs/VERCEL_DEPLOYMENT.md` (env vars, Supabase redirect URLs, Google OAuth redirect URI) and `CODEX_TEST_DEPLOY_HANDOFF.md` for an automated end-to-end path.

## How to connect Google Drive
`docs/GOOGLE_DRIVE_SETUP.md`. Admin → Google Drive → Connect → Test Upload. Staff never needs Drive access.

## How to upload/map the PDF bill template
`docs/PDF_TEMPLATE_SETUP.md`. Prefer a fillable PDF; map fields → variables; set active. Owner provides the PDF (never designed in-app).

## How to generate reports
Reports page → pick date/month → Download Excel or "Tạo & lên Drive".

## How to use declaration/accounting drafts
Declarations page (admin) → pick date range → export default Excel, or upload an Excel template + map fields → columns and export a filled draft to Drive. Always internal-draft only.

## Known limitations
- Type-check/build not executed here (see above).
- PDF filling requires a **fillable** PDF; coordinate-based mapping is Phase 2.
- Excel declaration template fill writes mapped columns from a start row (append-style); it does not resolve arbitrary named ranges or multi-block layouts.
- Thermal/ESC-POS silent printing is not included (browser print only) by design.
- Single-shop scope; no multi-branch, inventory, POS, or debt tracking (intentional).

## Next recommended phase (Phase 2)
Coordinate-based PDF mapping; richer Excel template mapping (named cells/blocks); ESC-POS / local print helper / kiosk one-click print; PWA offline + install polish; scheduled auto-backup and auto daily-report; per-service analytics.
