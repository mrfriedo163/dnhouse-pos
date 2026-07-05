import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";
import { NewOrderForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const supabase = createClient();
  const { data } = await supabase.from("services").select("*").eq("active", true).order("name");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Tạo bill</h1>
        <p className="text-sm text-slate-500">
          Nhập thông tin sau khi giặt xong, cân xong. Lưu đơn xong là in bill và tính doanh thu.
        </p>
      </div>
      <NewOrderForm services={(data ?? []) as Service[]} />
    </div>
  );
}
