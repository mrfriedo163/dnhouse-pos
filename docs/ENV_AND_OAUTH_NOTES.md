# Env & OAuth quick notes

## Generate token encryption key
```bash
openssl rand -base64 32
```
Dán vào `DRIVE_TOKEN_ENC_KEY`.

## Google OAuth checklist
- [ ] Drive API enabled
- [ ] OAuth consent screen configured (scope: drive.file)
- [ ] Web OAuth client created
- [ ] Redirect URIs added (dev + prod) — phải khớp tuyệt đối
- [ ] Admin email in Test users (nếu app Testing)

## First admin
1. Sign up tại /login.
2. Trong Supabase SQL:
   ```sql
   update public.profiles set role='admin'
   where id = (select id from auth.users where email='you@example.com');
   ```
