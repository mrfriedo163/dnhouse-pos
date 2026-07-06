import { createAdminClient } from "./supabase/admin";
import { getConnectedDrive } from "./google/store";
import { buildDefaultBillPdf, fillBillPdf } from "./pdf/fill";
import type { BillData } from "./pdf/fill";
import type { ShopInfo } from "./types";

/** Build the BillData payload for an order id. */
export async function loadBillData(orderId: string): Promise<BillData> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (!order) throw new Error("Khong tim thay don.");

  const { data: items } = await admin.from("order_items").select("*").eq("order_id", orderId);
  const { data: shopRow } = await admin.from("app_settings").select("value").eq("key", "shop_info").maybeSingle();
  const shop = (shopRow?.value ?? { shop_name: "DN HOUSE", business_type: "", address: "", phone: "" }) as ShopInfo;
  let createdBy = "";
  if (order.created_by) {
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", order.created_by).maybeSingle();
    createdBy = profile?.full_name ?? "";
  }

  return {
    order,
    items: (items ?? []).map((item: any) => ({
      service_name_snapshot: item.service_name_snapshot,
      quantity: Number(item.quantity),
      unit_type: item.unit_type,
      unit_price: Number(item.unit_price),
    })),
    shop,
    createdBy,
  };
}

/** Fetch the active bill template bytes and mapping from Drive. Returns null if none. */
async function loadActiveTemplate(): Promise<{ bytes: Uint8Array; mapping: Record<string, string> } | null> {
  const admin = createAdminClient();
  const { data: template } = await admin
    .from("pdf_templates")
    .select("*")
    .eq("template_type", "bill")
    .eq("active", true)
    .maybeSingle();
  if (!template || !template.drive_file_id) return null;

  const { drive } = await getConnectedDrive();
  const res = await drive.files.get({ fileId: template.drive_file_id, alt: "media" }, { responseType: "arraybuffer" });
  return {
    bytes: new Uint8Array(res.data as ArrayBuffer),
    mapping: (template.field_mapping ?? {}) as Record<string, string>,
  };
}

/** Generate bill PDF bytes. Falls back to a built-in bill if no uploaded template is active. */
export async function generateBillPdf(orderId: string): Promise<Uint8Array> {
  const template = await loadActiveTemplate();
  const data = await loadBillData(orderId);
  if (!template) return buildDefaultBillPdf(data);
  return fillBillPdf(template.bytes, template.mapping, data, true);
}
