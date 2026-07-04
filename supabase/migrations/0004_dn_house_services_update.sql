-- Bring service catalog in line with the public DN House price board.
-- Safe to re-run: updates existing service names and inserts missing ones.

update public.services
set active = false,
    note = coalesce(note, '') || ' (DN House hiện không cung cấp dịch vụ ủi.)',
    updated_at = now()
where name in ('Ủi đồ', 'Ủi đồ / gấp đồ');

insert into public.services (name, unit_type, default_price, note)
select name, unit_type, default_price, note
from (values
  ('Giặt thường dưới 3kg', 'lần', 35000::numeric, 'Áp dụng cho đơn giặt thường dưới 3kg'),
  ('Giặt từ 3kg trở lên', 'kg', 7000::numeric, 'Giặt phơi tự nhiên từ 3kg trở lên'),
  ('Giặt sấy từ 3kg trở lên', 'kg', 9000::numeric, 'Giặt sấy từ 3kg trở lên'),
  ('Chăn, drap', 'kg', 15000::numeric, 'Tùy chất liệu có thể báo giá lại'),
  ('Chăn bông', 'kg', 25000::numeric, null),
  ('Rèm cửa', 'kg', 25000::numeric, null),
  ('Vệ sinh giày', 'đôi', 50000::numeric, null),
  ('Tẩy điểm', 'món', 15000::numeric, 'Vết bẩn khó báo giá trực tiếp'),
  ('Dịch vụ khác', 'custom', 0::numeric, 'Nhập tên dịch vụ và giá thủ công')
) as catalog(name, unit_type, default_price, note)
where not exists (
  select 1 from public.services s where s.name = catalog.name
);

update public.services s
set unit_type = catalog.unit_type,
    default_price = catalog.default_price,
    note = catalog.note,
    active = true,
    updated_at = now()
from (values
  ('Giặt thường dưới 3kg', 'lần', 35000::numeric, 'Áp dụng cho đơn giặt thường dưới 3kg'),
  ('Giặt từ 3kg trở lên', 'kg', 7000::numeric, 'Giặt phơi tự nhiên từ 3kg trở lên'),
  ('Giặt sấy từ 3kg trở lên', 'kg', 9000::numeric, 'Giặt sấy từ 3kg trở lên'),
  ('Chăn, drap', 'kg', 15000::numeric, 'Tùy chất liệu có thể báo giá lại'),
  ('Chăn bông', 'kg', 25000::numeric, null),
  ('Rèm cửa', 'kg', 25000::numeric, null),
  ('Vệ sinh giày', 'đôi', 50000::numeric, null),
  ('Tẩy điểm', 'món', 15000::numeric, 'Vết bẩn khó báo giá trực tiếp'),
  ('Dịch vụ khác', 'custom', 0::numeric, 'Nhập tên dịch vụ và giá thủ công')
) as catalog(name, unit_type, default_price, note)
where s.name = catalog.name;
