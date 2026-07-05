import { OutSearch } from "./search";

export const dynamic = "force-dynamic";

export default function OutPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Trả đồ</h1>
        <p className="text-sm text-slate-500">
          Các đơn chưa trả sẽ tự hiện bên dưới. Nếu khách đọc SĐT, tên hoặc mã đơn thì dùng ô tìm để lọc nhanh.
        </p>
      </div>
      <OutSearch />
    </div>
  );
}
