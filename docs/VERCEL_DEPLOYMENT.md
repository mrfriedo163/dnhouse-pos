# Vercel deployment guide

DN House is a standard Next.js 14 App Router app — deploys to Vercel with zero custom config. No local filesystem is used for persistent data; all generated files go to memory buffers then Google Drive.

## 1. Push to GitHub
```bash
git init && git add -A && git commit -m "DN House webapp"
git branch -M main
git remote add origin git@github.com:<you>/dn-house.git
git push -u origin main
```

## 2. Import into Vercel
- New Project → import the repo. Framework preset auto-detects **Next.js**.
- Build command: `next build` (default). Output: `.next` (default). No overrides needed.

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)
Set these for **Production** (and Preview if you use it):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY        # server only — never prefix with NEXT_PUBLIC
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI              # https://<your-domain>/api/drive/callback
DRIVE_TOKEN_ENC_KEY              # openssl rand -base64 32 (32 bytes)
NEXT_PUBLIC_APP_URL              # https://<your-domain>
```
Redeploy after changing env vars (Vercel does not hot-reload them).

## 4. Supabase redirect URLs
Supabase → Authentication → URL Configuration:
- **Site URL**: `https://<your-domain>`
- **Redirect URLs**: add `https://<your-domain>/**` (and `http://localhost:3000/**` for dev).
Email/password login needs no OAuth redirect, but setting Site URL keeps confirmation links correct.

## 5. Google OAuth redirect URI
Google Cloud Console → Credentials → your OAuth client → Authorized redirect URIs:
- `https://<your-domain>/api/drive/callback`
- `http://localhost:3000/api/drive/callback` (dev)
Must match `GOOGLE_REDIRECT_URI` exactly.

## 6. Post-deploy
- Open the site, sign up, promote yourself to admin (see `supabase/README.md`).
- Admin → Google Drive → Connect. Test Upload.
- Admin → Mẫu PDF → upload a fillable bill template, map fields, set active.

## Notes / limits on Vercel
- Route handlers run on the Node.js runtime (googleapis, pdf-lib, ExcelJS all need Node — they will NOT run on the Edge runtime). This project does not set `export const runtime = "edge"` anywhere, so it defaults to Node. Keep it that way.
- Large PDF/Excel generation happens in-memory within the function; fine for DN House volumes. Hobby plan function timeout is 10s — if a monthly report over huge data ever approaches that, generate for a narrower range or upgrade the plan.
