# Deployment

## Vercel (khuyến nghị)
1. Push repo lên GitHub.
2. Import vào Vercel → framework tự nhận Next.js.
3. Thêm biến môi trường (giống `.env.example`). `GOOGLE_REDIRECT_URI` = `https://<domain>/api/drive/callback`.
4. Deploy. Cập nhật Authorized redirect URI trong Google Cloud Console cho domain prod.

## Supabase
- Tạo project, chạy 3 migration trong SQL editor (thứ tự 0001 → 0002 → 0003).
- Auth → Providers: bật Email. (Tuỳ chọn tắt email confirm cho nội bộ.)
- Nâng quyền admin cho tài khoản đầu tiên (xem `supabase/README.md`).

## PWA
`public/manifest.json` đã có. Thêm icon `icon-192.png`, `icon-512.png` vào `public/`. Muốn offline caching / install prompt nâng cao → thêm service worker (Phase 2, vd `next-pwa`).

## Bảo mật khi lên prod
- Không commit `.env.local`.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ tồn tại phía server (đã dùng trong route handlers).
- Đặt `DRIVE_TOKEN_ENC_KEY` cố định; nếu đổi key → token cũ không giải mã được (phải kết nối Drive lại).

## Phase 2 backlog
- Map template Excel/PDF cho biểu mẫu nhà nước (bảng `excel_templates` đã có).
- In nhiệt ESC/POS trực tiếp (react-thermal-printer) / local print helper / kiosk mode.
- PWA install + offline.
- Undo completion UI cho admin (API `DELETE /api/orders/[id]/complete` đã sẵn).
- Backup/export toàn bộ dữ liệu ra Drive `Backups/`.
