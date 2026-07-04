import { readFile } from "node:fs/promises";
import path from "node:path";
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

function shortServiceName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("giay")) return "Giay";
  if (lower.includes("chan") || lower.includes("drap")) return "Chan";
  if (lower.includes("tay")) return "Tay";
  if (lower.includes("rem")) return "Rem";
  if (lower.includes("giat say")) return "Giat say";
  if (lower.includes("giat")) return "Giat";
  return name;
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
  // 70x50mm thermal label: 198.4 x 141.7 pt.
  const page = doc.addPage([198.4, 141.7]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.06, 0.13, 0.32);
  const muted = rgb(0.2, 0.24, 0.35);
  const line = rgb(0.06, 0.13, 0.32);
  const values = buildBillValues(data);

  page.drawRectangle({ x: 2, y: 2, width: 194.4, height: 137.7, borderColor: navy, borderWidth: 1.2, color: rgb(1, 1, 1) });

  try {
    const logoPath = path.join(process.cwd(), "public", "dn-house-logo.jpg");
    const logoBytes = await readFile(logoPath);
    const logo = await doc.embedJpg(logoBytes);
    page.drawImage(logo, { x: 8, y: 105, width: 26, height: 26 });
  } catch {
    page.drawRectangle({ x: 8, y: 105, width: 26, height: 26, borderColor: navy, borderWidth: 0.8 });
  }

  page.drawText("GIAT SAY", { x: 40, y: 123, size: 8.5, font: bold, color: navy });
  page.drawText("DN House", { x: 40, y: 107, size: 18, font: bold, color: navy });
  page.drawText("PHIEU HEN / BILL", { x: 125, y: 123, size: 6.8, font: bold, color: navy });
  page.drawText(ascii(values.order_no), { x: 126, y: 111, size: 7.8, font: bold, color: navy });
  page.drawLine({ start: { x: 8, y: 99 }, end: { x: 190, y: 99 }, thickness: 0.7, color: line });

  page.drawText("Khach:", { x: 9, y: 88, size: 8, font: bold, color: navy });
  drawWrappedText(page, values.customer_name || "-", 40, 88, { size: 8, font: bold, maxWidth: 82, lineHeight: 8, color: navy });
  page.drawText("SDT:", { x: 126, y: 88, size: 8, font: bold, color: navy });
  page.drawText(ascii(values.customer_phone || "-"), { x: 148, y: 88, size: 8, font: bold, color: navy });

  const services = data.items.map((it) => {
    const qty = Number(it.quantity);
    const qtyText = Number.isInteger(qty) ? String(qty) : String(qty).replace(".", ",");
    return `${shortServiceName(ascii(it.service_name_snapshot))} ${qtyText}${ascii(it.unit_type ?? "")}`;
  });
  page.drawText("DV:", { x: 9, y: 73, size: 8, font: bold, color: navy });
  drawWrappedText(page, services.join(" / ") || "-", 28, 73, { size: 7.2, font: bold, maxWidth: 162, lineHeight: 8, color: navy });

  page.drawText("Gia:", { x: 9, y: 57, size: 8, font: bold, color: navy });
  page.drawText(ascii(values.subtotal), { x: 32, y: 57, size: 8, font: bold, color: navy });
  page.drawText("Giam:", { x: 88, y: 57, size: 7.4, font, color: muted });
  page.drawText(ascii(values.discount_total), { x: 116, y: 57, size: 7.4, font, color: muted });

  page.drawText("TT:", { x: 9, y: 42, size: 8, font: bold, color: navy });
  page.drawText(ascii(values.final_total), { x: 31, y: 40, size: 12, font: bold, color: navy });
  page.drawText("Trang thai:", { x: 102, y: 43, size: 7, font, color: muted });
  page.drawText("Chua tra", { x: 145, y: 43, size: 7.5, font: bold, color: navy });

  page.drawText("Nhan:", { x: 9, y: 27, size: 7, font: bold, color: navy });
  page.drawText(ascii(values.received_at), { x: 35, y: 27, size: 6.5, font, color: muted });
  page.drawText("Hen:", { x: 111, y: 27, size: 7, font: bold, color: navy });
  page.drawText(ascii(values.due_at || "-"), { x: 132, y: 27, size: 6.5, font, color: muted });

  if (values.note) {
    drawWrappedText(page, `GC: ${values.note}`, 9, 16, { size: 6, font, maxWidth: 180, lineHeight: 6.5, color: muted });
  }
  page.drawText("Zalo: 0945.632.853 - 0917.115.374", { x: 38, y: 6, size: 6.6, font: bold, color: navy });

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
