import { PDFDocument, PDFTextField, rgb, StandardFonts } from "pdf-lib";
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

function ascii(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\x20-\x7E]/g, "");
}

function drawWrappedText(
  page: any,
  text: string,
  x: number,
  y: number,
  options: { size: number; font: any; maxWidth: number; lineHeight: number; color?: any },
) {
  const words = ascii(text).split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (options.font.widthOfTextAtSize(next, options.size) > options.maxWidth && line) {
      page.drawText(line, { x, y: cursorY, size: options.size, font: options.font, color: options.color });
      cursorY -= options.lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) page.drawText(line, { x, y: cursorY, size: options.size, font: options.font, color: options.color });
  return cursorY - options.lineHeight;
}

/** Fallback bill when no uploaded PDF template is active. */
export async function buildDefaultBillPdf(data: BillData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.07, 0.13, 0.28);
  const muted = rgb(0.35, 0.39, 0.5);
  const line = rgb(0.86, 0.9, 0.95);
  const values = buildBillValues(data);

  page.drawText(ascii(values.shop_name || "DN House"), { x: 32, y: 548, size: 18, font: bold, color: navy });
  page.drawText("PHIEU NHAN DO / BILL", { x: 32, y: 522, size: 13, font: bold, color: navy });
  page.drawText(`Ma don: ${ascii(values.order_no)}`, { x: 280, y: 548, size: 10, font: bold, color: navy });
  page.drawText(`Ngay nhan: ${ascii(values.received_at)}`, { x: 280, y: 532, size: 9, font, color: muted });
  page.drawLine({ start: { x: 32, y: 506 }, end: { x: 388, y: 506 }, thickness: 1, color: line });

  let y = 482;
  page.drawText(`Khach: ${ascii(values.customer_name || "-")}`, { x: 32, y, size: 11, font: bold, color: navy });
  page.drawText(`SDT: ${ascii(values.customer_phone || "-")}`, { x: 250, y, size: 11, font: bold, color: navy });
  y -= 22;
  if (values.due_at) {
    page.drawText(`Hen tra: ${ascii(values.due_at)}`, { x: 32, y, size: 10, font, color: muted });
    y -= 22;
  }

  page.drawText("Dich vu", { x: 32, y, size: 12, font: bold, color: navy });
  y -= 16;
  for (const item of values.service_table.split("\n").filter(Boolean)) {
    y = drawWrappedText(page, item, 42, y, { size: 10, font, maxWidth: 320, lineHeight: 14, color: navy });
  }

  y = Math.max(y - 8, 148);
  page.drawLine({ start: { x: 32, y }, end: { x: 388, y }, thickness: 1, color: line });
  y -= 22;
  page.drawText("Tam tinh", { x: 230, y, size: 10, font, color: muted });
  page.drawText(ascii(values.subtotal), { x: 320, y, size: 10, font: bold, color: navy });
  y -= 18;
  page.drawText("Giam", { x: 230, y, size: 10, font, color: muted });
  page.drawText(ascii(values.discount_total), { x: 320, y, size: 10, font: bold, color: navy });
  y -= 22;
  page.drawText("Tong cong", { x: 230, y, size: 12, font: bold, color: navy });
  page.drawText(ascii(values.final_total), { x: 320, y, size: 12, font: bold, color: navy });

  let footerY = 88;
  if (values.note) {
    footerY = drawWrappedText(page, `Ghi chu: ${values.note}`, 32, footerY, { size: 9, font, maxWidth: 340, lineHeight: 12, color: muted });
  }
  page.drawText("Cam on quy khach da su dung dich vu DN House.", { x: 32, y: 38, size: 9, font: bold, color: navy });
  page.drawText(ascii(`${values.shop_phone} - ${values.shop_address}`), { x: 32, y: 24, size: 8, font, color: muted });

  return doc.save();
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
