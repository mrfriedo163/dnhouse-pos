import { PDFDocument, PDFTextField } from "pdf-lib";
import { formatVnd } from "../calc";
import type { Order, OrderItemInput, ShopInfo } from "../types";

export interface PdfFieldInfo {
  name: string;
  type: string;
}

/** List fillable form field names in a PDF. Empty array => no fillable fields. */
export async function inspectFields(pdfBytes: Uint8Array): Promise<PdfFieldInfo[]> {
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  return form.getFields().map((f) => ({ name: f.getName(), type: f.constructor.name }));
}

export interface BillData {
  order: Pick<
    Order,
    | "order_no" | "received_at" | "due_at" | "customer_name" | "customer_phone"
    | "subtotal" | "discount_type" | "discount_value" | "discount_total" | "final_total" | "note"
  >;
  items: Pick<OrderItemInput, "service_name_snapshot" | "quantity" | "unit_type" | "unit_price">[];
  shop: ShopInfo;
  createdBy: string;
  timeZone?: string;
}

function fmtDate(iso: string | null, tz: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: tz, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(iso));
}

/** Build the resolved variable map for a bill. Keys are the BILL_VARIABLES names. */
export function buildBillValues(data: BillData): Record<string, string> {
  const tz = data.timeZone ?? "Asia/Ho_Chi_Minh";
  const serviceTable = data.items
    .map((it) => `${it.service_name_snapshot} x${it.quantity} ${it.unit_type ?? ""} = ${formatVnd(it.quantity * it.unit_price)}`)
    .join("\n");
  return {
    shop_name: data.shop.shop_name,
    shop_address: data.shop.address,
    shop_phone: data.shop.phone,
    order_no: data.order.order_no,
    received_at: fmtDate(data.order.received_at, tz),
    due_at: fmtDate(data.order.due_at, tz),
    customer_name: data.order.customer_name ?? "",
    customer_phone: data.order.customer_phone ?? "",
    service_table: serviceTable,
    subtotal: formatVnd(data.order.subtotal),
    discount_type: data.order.discount_type,
    discount_value: String(data.order.discount_value),
    discount_total: formatVnd(data.order.discount_total),
    final_total: formatVnd(data.order.final_total),
    note: data.order.note ?? "",
    created_by: data.createdBy,
  };
}

/**
 * Fill a fillable PDF using a field->variable mapping.
 * mapping: { "<pdf_field_name>": "<bill_variable>" }
 * flatten: prevent the customer from editing fields afterwards.
 * Returns filled PDF bytes. Throws NO_FIELDS if the PDF has no form fields.
 */
export async function fillBillPdf(
  templateBytes: Uint8Array,
  mapping: Record<string, string>,
  data: BillData,
  flatten = true,
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes);
  const form = doc.getForm();
  const fields = form.getFields();
  if (fields.length === 0) {
    const err = new Error("This PDF has no fillable fields.");
    (err as any).code = "NO_FIELDS";
    throw err;
  }
  const values = buildBillValues(data);

  for (const [pdfField, variable] of Object.entries(mapping)) {
    const value = values[variable];
    if (value === undefined) continue;
    try {
      const field = form.getField(pdfField);
      if (field instanceof PDFTextField) {
        field.setText(value);
      }
    } catch {
      // Field named in the mapping no longer exists in the template; skip it.
    }
  }

  if (flatten) form.flatten();
  return doc.save();
}
