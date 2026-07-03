import { createAdminClient } from "./supabase/admin";
import { getConnectedDrive } from "./google/store";
import { ensureDatedFolder, uploadFile } from "./google/drive";
import { fillBillPdf } from "./pdf/fill";
import type { BillData } from "./pdf/fill";
import type { ShopInfo } from "./types";

/** Build the BillData payload for an order id. */
export async function loadBillData(orderId: string): Promise<BillData> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (!order) throw new Error("Không tìm thấy đơn.");

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

/** Generate filled bill PDF bytes for an order. Throws NO_ACTIVE_TEMPLATE if none set. */
export async function generateBillPdf(orderId: string): Promise<Uint8Array> {
  const template = await loadActiveTemplate();
  if (!template) {
    const err = new Error("Chưa có mẫu PDF đang hoạt động. Hãy tải lên và bật mẫu trong mục Mẫu PDF.");
    (err as any).code = "NO_ACTIVE_TEMPLATE";
    throw err;
  }
  const data = await loadBillData(orderId);
  return fillBillPdf(template.bytes, template.mapping, data, true);
}

/**
 * Generate and upload the bill to DN House/Bills/YYYY-MM/ and persist links on the order.
 * Returns { ok, warning? }. Never throws for Drive failures, so the order stays saved.
 */
export async function generateAndUploadBill(orderId: string): Promise<{ ok: boolean; warning?: string }> {
  const admin = createAdminClient();
  let pdf: Uint8Array;
  try {
    pdf = await generateBillPdf(orderId);
  } catch (e: any) {
    return { ok: false, warning: e?.message ?? "Không tạo được PDF bill" };
  }

  try {
    const { drive, settings } = await getConnectedDrive();
    const { data: order } = await admin.from("orders").select("order_no, received_at").eq("id", orderId).single();
    if (!order) return { ok: false, warning: "Không tìm thấy đơn để tạo bill." };

    const folderId = await ensureDatedFolder(drive, settings.root_folder_id!, "Bills", new Date(order.received_at));
    const upload = await uploadFile(drive, folderId, `${order.order_no}.pdf`, "application/pdf", Buffer.from(pdf));
    await admin.from("orders").update({ bill_drive_file_id: upload.fileId, bill_drive_web_url: upload.webViewLink }).eq("id", orderId);
    await admin.from("generated_files").insert({
      file_type: "bill_pdf",
      related_order_id: orderId,
      file_name: upload.name,
      drive_file_id: upload.fileId,
      drive_web_url: upload.webViewLink,
    });
    return { ok: true };
  } catch (e: any) {
    return {
      ok: false,
      warning: e?.code === "NOT_CONNECTED" ? "Google Drive chưa kết nối." : (e?.message ?? "Drive upload failed"),
    };
  }
}
