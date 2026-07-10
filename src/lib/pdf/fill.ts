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

function fitText(text: string, maxWidth: number, size: number, font: any): string {
  const clean = ascii(text).trim();
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) return clean;

  let value = clean;
  while (value.length > 1 && font.widthOfTextAtSize(`${value}...`, size) > maxWidth) {
    value = value.slice(0, -1).trimEnd();
  }
  return `${value}...`;
}

function drawRightText(page: any, text: string, rightX: number, y: number, options: { size: number; font: any; color?: any }) {
  const clean = ascii(text);
  page.drawText(clean, {
    x: rightX - options.font.widthOfTextAtSize(clean, options.size),
    y,
    size: options.size,
    font: options.font,
    color: options.color,
  });
}

function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
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
  // 76x100mm FlashLabel thermal label.
  const mm = 72 / 25.4;
  const pageWidth = 76 * mm;
  const pageHeight = 100 * mm;
  const page = doc.addPage([pageWidth, pageHeight]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.06, 0.13, 0.32);
  const muted = rgb(0.2, 0.24, 0.35);
  const line = rgb(0.06, 0.13, 0.32);
  const values = buildBillValues(data);

  // Keep a modest safe area for FlashLabel while using most of the 76x100mm stock.
  page.drawRectangle({ x: 8, y: 8, width: pageWidth - 16, height: pageHeight - 16, borderColor: navy, borderWidth: 1.2, color: rgb(1, 1, 1) });

  try {
    const logoPath = path.join(process.cwd(), "public", "dn-house-logo.jpg");
    const logoBytes = await readFile(logoPath);
    const logo = await doc.embedJpg(logoBytes);
    page.drawImage(logo, { x: 16, y: pageHeight - 34, width: 22, height: 22 });
  } catch {
    page.drawRectangle({ x: 16, y: pageHeight - 34, width: 22, height: 22, borderColor: navy, borderWidth: 0.8 });
  }

  page.drawText("GIAT SAY", { x: 44, y: pageHeight - 21, size: 8, font: bold, color: navy });
  page.drawText("DN House", { x: 44, y: pageHeight - 39, size: 18, font: bold, color: navy });
  page.drawText("PHIEU / BILL", { x: 142, y: pageHeight - 21, size: 7, font: bold, color: navy });
  page.drawText(ascii(values.order_no), { x: 151, y: pageHeight - 34, size: 5.5, font: bold, color: navy });
  page.drawLine({ start: { x: 14, y: pageHeight - 47 }, end: { x: pageWidth - 14, y: pageHeight - 47 }, thickness: 0.8, color: line });

  page.drawText("Khach:", { x: 16, y: pageHeight - 66, size: 8.5, font: bold, color: navy });
  drawWrappedText(page, values.customer_name || "-", 58, pageHeight - 66, { size: 8.5, font: bold, maxWidth: 135, lineHeight: 9, color: navy });
  page.drawText("SDT:", { x: 16, y: pageHeight - 84, size: 8.5, font: bold, color: navy });
  page.drawText(ascii(values.customer_phone || "-"), { x: 58, y: pageHeight - 84, size: 8.5, font: bold, color: navy });

  const tableTop = pageHeight - 102;
  page.drawText("Chi tiet dich vu", { x: 16, y: tableTop + 8, size: 8, font: bold, color: navy });
  page.drawLine({ start: { x: 14, y: tableTop + 2 }, end: { x: pageWidth - 14, y: tableTop + 2 }, thickness: 0.7, color: line });
  page.drawText("Dich vu", { x: 16, y: tableTop - 9, size: 6.8, font: bold, color: navy });
  page.drawText("SL", { x: 103, y: tableTop - 9, size: 6.8, font: bold, color: navy });
  drawRightText(page, "Don gia", 165, tableTop - 9, { size: 6.8, font: bold, color: navy });
  drawRightText(page, "Tien", pageWidth - 16, tableTop - 9, { size: 6.8, font: bold, color: navy });
  page.drawLine({ start: { x: 14, y: tableTop - 15 }, end: { x: pageWidth - 14, y: tableTop - 15 }, thickness: 0.5, color: line });

  const maxRows = 4;
  const rowHeight = 11;
  const visibleItems = data.items.slice(0, maxRows);
  visibleItems.forEach((it, index) => {
    const qty = Number(it.quantity || 0);
    const y = tableTop - 28 - index * rowHeight;
    const qtyText = `${formatQty(qty)}${ascii(it.unit_type ?? "")}`;
    const lineTotal = formatVnd(qty * Number(it.unit_price || 0));
    page.drawText(fitText(it.service_name_snapshot, 83, 6.8, bold), { x: 16, y, size: 6.8, font: bold, color: navy });
    page.drawText(fitText(qtyText, 25, 6.6, font), { x: 103, y, size: 6.6, font, color: muted });
    drawRightText(page, formatVnd(Number(it.unit_price || 0)), 165, y, { size: 6.6, font, color: muted });
    drawRightText(page, lineTotal, pageWidth - 16, y, { size: 6.6, font: bold, color: navy });
  });
  if (data.items.length > maxRows) {
    const y = tableTop - 28 - maxRows * rowHeight;
    page.drawText(`+ ${data.items.length - maxRows} dich vu khac`, { x: 16, y, size: 6.5, font, color: muted });
  }

  const summaryTop = 90;
  page.drawLine({ start: { x: 14, y: summaryTop + 14 }, end: { x: pageWidth - 14, y: summaryTop + 14 }, thickness: 0.7, color: line });
  page.drawText("Tam tinh", { x: 18, y: summaryTop + 2, size: 7.5, font, color: muted });
  drawRightText(page, values.subtotal, pageWidth - 18, summaryTop + 2, { size: 7.5, font: bold, color: navy });
  page.drawText("Giam", { x: 18, y: summaryTop - 11, size: 7.5, font, color: muted });
  drawRightText(page, `- ${values.discount_total}`, pageWidth - 18, summaryTop - 11, { size: 7.5, font, color: muted });

  page.drawRectangle({ x: 16, y: summaryTop - 45, width: pageWidth - 32, height: 26, borderColor: navy, borderWidth: 0.8 });
  page.drawText("Tong cong", { x: 24, y: summaryTop - 36, size: 9.5, font: bold, color: navy });
  drawRightText(page, values.final_total, pageWidth - 24, summaryTop - 39, { size: 14, font: bold, color: navy });

  page.drawText("Nhan:", { x: 18, y: 36, size: 7, font: bold, color: navy });
  page.drawText(ascii(values.received_at), { x: 50, y: 36, size: 6.2, font, color: muted });
  page.drawText("Hen:", { x: 18, y: 26, size: 7, font: bold, color: navy });
  page.drawText(ascii(values.due_at || "-"), { x: 50, y: 26, size: 6.2, font, color: muted });

  if (values.note) {
    drawWrappedText(page, `GC: ${values.note}`, 110, 36, { size: 5.5, font, maxWidth: 80, lineHeight: 6, color: muted });
  }
  page.drawLine({ start: { x: 14, y: 20 }, end: { x: pageWidth - 14, y: 20 }, thickness: 0.7, color: line });
  page.drawText("Zalo: 0945.632.853", { x: 65, y: 12, size: 7.5, font: bold, color: navy });

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
