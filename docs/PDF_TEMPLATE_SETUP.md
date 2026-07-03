# PDF bill template setup

App **không** tự thiết kế bill. Chủ cửa hàng cung cấp file PDF.

## Ưu tiên: PDF có form field (fillable)
1. Tạo bill bằng LibreOffice / Adobe / Google Docs → xuất PDF có **form fields** (text fields).
   - Adobe Acrobat: Prepare Form → thêm Text Field, đặt tên rõ ràng (vd `order_no`, `customer_name`).
   - LibreOffice Writer: View → Toolbars → Form Controls → Text Box, rồi Export as PDF (bật "Create PDF form").
2. Trong app: **Mẫu PDF → Tải mẫu mới** → chọn file. App đọc danh sách field bằng pdf-lib.
3. Map từng field PDF → biến đơn hàng (dropdown). Các biến hỗ trợ:
   `shop_name, shop_address, shop_phone, order_no, received_at, due_at, customer_name, customer_phone, service_table, subtotal, discount_type, discount_value, discount_total, final_total, note, created_by`
4. Lưu mẫu → **Đặt làm mẫu chính**. File gốc được lưu vào `DN House/Templates/`.
5. Khi tạo đơn IN, app tự điền mẫu đang active, **flatten** PDF (khách không sửa được), tải lên `Bills/YYYY-MM/`.

## Nếu PDF không có form field
App hiển thị cảnh báo:
> "This PDF has no fillable fields. Please provide a fillable PDF form or implement coordinate-based mapping in phase 2."
Hãy cung cấp PDF có form field, hoặc chờ Phase 2 (map theo toạ độ).

## Xem trước & in
Trang chi tiết đơn có: **Xem/In bill (PDF)**, **Tải bill PDF**, **Mở bill trên Drive**. Bill được sinh on-demand từ mẫu active tại `/api/orders/[id]/bill.pdf`.
