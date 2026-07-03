# CODEX_TEST_DEPLOY_HANDOFF

Step-by-step for an automated agent (Codex) to take this ZIP to a live Vercel deployment.
Business rules are fixed — see "DO NOT CHANGE" at the bottom. Fix only build/type/test errors.

## 1. Unzip
```bash
unzip dn-house-webapp-full.zip
cd dn-house
```

## 2. Install dependencies
```bash
npm install
```
(Package manager: npm. No lockfile is shipped — see delivery notes; `npm install` will resolve from package.json and create `package-lock.json`.)

## 3. Run tests
```bash
npm test
```
Expected: vitest runs unit suites in `src/tests/` (calc, order-number, revenue, reminder, pdf-mapping, permissions, report-range, drive-fallback). All should pass. If a test fails, read it — the math contracts are intentional; fix code to satisfy the test, do not weaken the test.

## 4. Build
```bash
npm run build
```
Fix any TypeScript/build errors. Common, allowed fixes:
- Missing/incorrect type annotations, unused imports.
- Adjusting a Supabase query result cast (`as SomeType`) where strict null checks complain.
Do NOT change revenue logic, RLS intent, or the IN/OUT workflow to make the build pass.

## 5. Local smoke test (optional but recommended)
```bash
cp .env.example .env.local   # fill with real values
npm run dev                  # http://localhost:3000
```

## 6. Initialize git (if not already)
```bash
git init && git add -A && git commit -m "DN House webapp: full source"
git branch -M main
```

## 7. Push to GitHub
```bash
git remote add origin git@github.com:<owner>/<repo>.git   # or use gh repo create
git push -u origin main
```

## 8. Set / check Vercel env variables
Required (Production + Preview):
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI, DRIVE_TOKEN_ENC_KEY, NEXT_PUBLIC_APP_URL.
`SUPABASE_SERVICE_ROLE_KEY` must be server-only (no NEXT_PUBLIC prefix).
`GOOGLE_REDIRECT_URI` = https://<domain>/api/drive/callback.

## 9. Deploy to Vercel
```bash
npm i -g vercel   # if needed
vercel link
vercel --prod
```
Or import the GitHub repo in the Vercel dashboard (auto-deploys on push).

## 10. Apply database
In Supabase SQL editor run, in order:
`supabase/migrations/0001_init.sql`, `0002_rls.sql`, `0003_seed.sql`.

## 11. Verify the live app
- Load the domain → redirected to /login.
- Sign up, then in Supabase promote to admin (see supabase/README.md).
- Dashboard loads with today's stats.
- Admin → Google Drive → Connect → Test Upload succeeds.
- Admin → Mẫu PDF → upload fillable PDF, map fields, set active.
- Create an IN order → bill PDF previews/prints, uploads to Drive/Bills/YYYY-MM.
- OUT → search order → mark completed → confirm revenue unchanged on dashboard.
- Reports → generate daily/monthly Excel → uploads to Drive.
- Declarations → export draft (with or without Excel template) → uploads to Declaration Drafts.
- Settings → Backup → uploads to Drive/Backups.

## DO NOT CHANGE (business rules)
- Revenue is counted at IN time and computed from `received_at` (not `completed_at`).
- OUT/completion must never modify revenue fields.
- discount: none=0; percent = subtotal*value/100; fixed = value; final_total = max(0, subtotal - discount_total).
- Order number format: DN-YYYYMMDD-NNNN, daily sequence, Asia/Ho_Chi_Minh timezone.
- No inventory / POS / debt tracking. Declaration export is internal draft only (keep the disclaimer).
