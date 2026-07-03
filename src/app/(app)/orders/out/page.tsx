import { OutSearch } from "./search";
export const dynamic = "force-dynamic";
export default function OutPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Trả đồ / Hoàn thành đơn (OUT)</h1>
      <p className="text-sm text-slate-500">Tìm theo mã đơn, SĐT hoặc tên khách. OUT chỉ đánh dấu hoàn thành, không ảnh hưởng doanh thu.</p>
      <OutSearch />
    </div>
  );
}
