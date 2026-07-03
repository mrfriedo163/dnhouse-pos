# DN House — Giặt sấy & Vệ sinh giày Cần Thơ

Ứng dụng quản lý dịch vụ nội bộ (không phải ecommerce / POS / kho). Web app responsive, PWA-ready, chạy tốt trên điện thoại (nhân viên) và máy tính (chủ/admin).

## Tính năng (Phase 1 MVP)
- Đăng nhập Supabase Auth, phân quyền **admin / staff** (RLS).
- **IN**: tạo đơn, tính doanh thu ngay tại thời điểm tạo (theo `received_at`), điền PDF bill từ template, in/tải/mở PDF, tải bill lên Google Drive (có fallback khi lỗi).
- **OUT**: tìm đơn theo mã / SĐT / tên, đánh dấu hoàn thành. **Không ảnh hưởng doanh thu.**
- Danh sách đơn: lọc theo ngày nhận, trạng thái, quá hạn, tìm kiếm.
- Quản lý dịch vụ (CRUD, seed sẵn 10 dịch vụ DN House).
- Mẫu PDF: upload, đọc form field (pdf-lib), map field → biến đơn hàng, đặt mẫu chính.
- Google Drive: OAuth, mã hoá token (AES-256-GCM), tạo cây thư mục, test upload.
- Báo cáo Excel ngày & tháng (ExcelJS, file không khoá) + tải lên Drive.
- Kê khai/kế toán: xuất số liệu theo khoảng ngày (bản nháp, có disclaimer).
- Nhắc rà soát biểu mẫu mỗi 6 tháng (đã rà soát / hoãn 7 ngày).
- Audit log cho tạo đơn, hoàn thành, undo.

## Tech stack
Next.js 14 (App Router) · TypeScript · Supabase (Postgres + Auth + RLS) · Tailwind CSS · googleapis · pdf-lib · ExcelJS · Vitest.

## Cấu trúc
```
src/app            # pages (App Router) + api routes
src/lib            # calc, order-number, reminder, supabase, google, pdf, excel, services
src/components     # UI (button, card, input, nav)
src/tests          # vitest unit tests
supabase/migrations# 0001 schema, 0002 RLS, 0003 seed
docs/              # Google Drive & PDF template & deployment guides
```

## Chạy local
```bash
cp .env.example .env.local        # điền biến môi trường (xem bên dưới)
npm install
# Áp migrations: chạy supabase/migrations/000{1,2,3}.sql trong Supabase SQL editor
npm run dev                       # http://localhost:3000
```
Đăng ký tài khoản đầu tiên qua trang /login, rồi tự nâng quyền admin (xem `supabase/README.md`).

## Biến môi trường (.env.local)
| Biến | Mô tả |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role (chỉ dùng server) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Google |
| `GOOGLE_REDIRECT_URI` | `.../api/drive/callback` |
| `DRIVE_TOKEN_ENC_KEY` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | URL app |

## Test & build
```bash
npm test          # unit tests (calc, order-number, revenue, reminder, pdf mapping)
npm run build     # production build
```

## Xác thực logic đã kiểm chứng
Toàn bộ công thức doanh thu, quy tắc giảm giá, sinh mã đơn (rollover theo múi giờ Asia/Ho_Chi_Minh) và logic nhắc 6 tháng đã được kiểm thử: **17/17 checks passed**. Xem `src/tests/`.

## Bảo mật
- RLS bật trên tất cả bảng. Server API dùng service role và tự tính doanh thu (không tin client).
- Token Google mã hoá AES-256-GCM trước khi lưu DB.
- Audit log cho các thao tác nhạy cảm.


## Full-package additions (beyond Phase 1 MVP)
- Admin **order edit** (recomputes revenue, audited) and **delete** (audited).
- Admin **undo completion** from the order page.
- **Excel declaration templates**: upload .xlsx, map fields → columns + start row, auto-fill drafts.
- **Backup**: export key tables to Excel + JSON to `Drive/Backups/`.
- Dashboard monthly-report quick button.
- Tests added: report date-range windows, role permissions, Drive fallback shape.
- Docs added: `docs/VERCEL_DEPLOYMENT.md`, `CODEX_TEST_DEPLOY_HANDOFF.md`, `PATCH_FULL_DELIVERY.md`.

## Phase 2 (scaffold / next)
Map template Excel/PDF cho biểu mẫu nhà nước; in nhiệt ESC/POS / local print helper; PWA install polish; thêm công cụ audit/export. Xem cuối `docs/DEPLOYMENT.md`.
