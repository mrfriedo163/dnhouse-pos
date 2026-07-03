# Google Drive OAuth setup

1. Vào https://console.cloud.google.com → tạo project (hoặc dùng project sẵn có).
2. **APIs & Services → Enable APIs** → bật **Google Drive API**.
3. **OAuth consent screen**:
   - User type: External (hoặc Internal nếu Workspace).
   - Thêm scope: `https://www.googleapis.com/auth/drive.file` (chỉ file do app tạo — an toàn nhất).
   - Thêm email admin vào Test users (khi app ở chế độ Testing).
4. **Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Authorized redirect URIs: `http://localhost:3000/api/drive/callback` (dev) và `https://<domain>/api/drive/callback` (prod).
5. Copy Client ID / Client Secret vào `.env.local` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`).
6. Tạo khoá mã hoá token: `openssl rand -base64 32` → `DRIVE_TOKEN_ENC_KEY`.
7. Trong app: **Google Drive → Kết nối Google Drive** (chỉ admin). App sẽ tạo cây thư mục:
   ```
   DN House/
     Bills/YYYY-MM/
     Daily Reports/YYYY-MM/
     Monthly Reports/YYYY-MM/
     Declaration Drafts/YYYY-MM/
     Templates/
     Backups/
   ```
8. Bấm **Test Upload** để kiểm tra.

## Refresh token
App yêu cầu `access_type=offline` + `prompt=consent` nên nhận refresh token. Token được tự refresh và lưu lại (mã hoá). Nếu mất kết nối → dùng **Kết nối lại Google Drive**.

## Lưu ý scope
`drive.file` chỉ cho phép app truy cập file/thư mục do chính nó tạo — không đọc toàn bộ Drive của chủ. Nếu cần dùng thư mục có sẵn, đổi sang scope rộng hơn (`drive`) và cập nhật consent screen.
