# DN House POS - vận hành data

Tài liệu này để chủ tiệm hoặc Codex/AI khác đọc là hiểu cách app đang lưu và đối soát dữ liệu.

## Nguồn dữ liệu chính

- App chính tại `https://app.giatsaycantho.vn` dùng Supabase, không dùng Google Sheet để nhập đơn thật.
- Bảng chính: `orders`.
- Chi tiết dịch vụ từng đơn: `order_items`.
- Lịch sử thao tác quan trọng: `audit_logs`.

## Quy tắc vận hành

1. Nhân viên tạo đơn trong app.
2. Doanh thu được tính theo `received_at`, tức ngày nhận đơn.
3. Khi trả đồ, bấm `Trả đồ` hoặc `Đã giao đồ / Hoàn thành đơn`.
4. Khi admin xóa đơn, app không xóa dòng khỏi database. App chỉ điền:
   - `deleted_at`
   - `deleted_by`
   - `delete_reason`
5. Đơn đã xóa sẽ bị ẩn khỏi dashboard, trả đồ, báo cáo doanh thu và kê khai mặc định.
6. Muốn xem đơn đã xóa: vào `Danh sách đơn` và chọn bộ lọc `Đã xóa`.

## Vì sao không xóa hẳn đơn?

Đơn đã xóa vẫn cần giữ lại để cuối ngày đối chiếu và để sau này AI/Codex có thể kiểm tra lịch sử khi làm báo cáo hoặc kê khai.

## Những việc chủ tiệm có thể tự làm

- Tạo đơn, trả đồ, in bill.
- Tìm đơn theo mã, số điện thoại hoặc tên khách.
- Xem báo cáo ngày/tháng trong app.
- Vào danh sách đơn đã xóa để kiểm tra nếu có sai thao tác.

## Những việc nên gọi Codex/AI hỗ trợ

- Đổi mẫu kê khai theo quy định mới.
- Thêm mẫu bill PDF chính thức.
- Kết nối hoặc sửa Google Drive OAuth.
- Xuất báo cáo/kê khai theo một form mới của cơ quan nhà nước.

## Ghi chú cho Codex/AI tiếp theo

- Không dùng `/demo` cho vận hành thật.
- Không tự ý hard delete dữ liệu thật.
- Nếu cần loại một đơn khỏi doanh thu, dùng soft delete bằng các cột `deleted_*`.
- Báo cáo doanh thu phải lọc `deleted_at is null`.
- Nếu cần kiểm tra lịch sử xóa, xem `audit_logs` với `action = order.delete`.

