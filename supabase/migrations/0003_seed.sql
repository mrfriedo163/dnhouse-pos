-- Seed DN House default services. Safe to re-run.
insert into public.services (name, unit_type, default_price, note) values
  ('Giặt thường dưới 3kg', 'lần', 35000, 'Áp dụng cho đơn giặt thường dưới 3kg'),
  ('Giặt từ 3kg trở lên', 'kg', 7000, 'Giặt phơi tự nhiên từ 3kg trở lên'),
  ('Giặt sấy từ 3kg trở lên', 'kg', 9000, 'Giặt sấy từ 3kg trở lên'),
  ('Chăn, drap', 'kg', 15000, 'Tùy chất liệu có thể báo giá lại'),
  ('Chăn bông', 'kg', 25000, null),
  ('Rèm cửa', 'kg', 25000, null),
  ('Vệ sinh giày', 'đôi', 50000, null),
  ('Tẩy điểm', 'món', 15000, 'Vết bẩn khó báo giá trực tiếp'),
  ('Dịch vụ khác', 'custom', 0, 'Nhập tên dịch vụ và giá thủ công')
on conflict do nothing;
