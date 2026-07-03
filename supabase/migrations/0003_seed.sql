-- Seed DN House default services. Safe to re-run.
insert into public.services (name, unit_type, default_price, note) values
  ('Giặt sấy thường', 'kg', 0, 'Giặt sấy tính theo kg'),
  ('Giặt sấy nhanh', 'kg', 0, 'Ưu tiên, tính theo kg'),
  ('Giặt chăn', 'cái', 0, null),
  ('Giặt mền', 'cái', 0, null),
  ('Giặt drap', 'bộ', 0, null),
  ('Giặt gấu bông', 'cái', 0, null),
  ('Vệ sinh giày', 'đôi', 0, null),
  ('Tẩy vết bẩn', 'lần', 0, null),
  ('Ủi đồ', 'cái', 0, null),
  ('Dịch vụ khác', 'custom', 0, 'Nhập giá thủ công')
on conflict do nothing;
