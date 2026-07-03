import ExcelJS from "exceljs";
import type { Order } from "../types";

export interface ServiceSummaryRow {
  service_name: string;
  quantity: number;
  revenue: number;
}

export interface DailyReportData {
  date: string;                       // YYYY-MM-DD
  shopName: string;
  orders: Order[];
  serviceSummary: ServiceSummaryRow[];
  incomplete: Order[];
  totals: { gross: number; discount: number; net: number; inCount: number; completedCount: number; pendingCount: number };
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEEEA" } };
  });
}

/** Daily report workbook (editable, not locked). */
export async function buildDailyReport(data: DailyReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DN House";
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary");
  summary.addRow([`${data.shopName} — Báo cáo ngày ${data.date}`]);
  summary.addRow([]);
  summary.addRow(["Số đơn IN", data.totals.inCount]);
  summary.addRow(["Đơn hoàn thành", data.totals.completedCount]);
  summary.addRow(["Đơn chưa hoàn thành", data.totals.pendingCount]);
  summary.addRow(["Doanh thu gộp (subtotal)", data.totals.gross]);
  summary.addRow(["Tổng giảm giá", data.totals.discount]);
  summary.addRow(["Doanh thu thực (final_total)", data.totals.net]);
  summary.getColumn(1).width = 32;
  summary.getColumn(2).width = 18;

  const orders = wb.addWorksheet("Orders");
  const oHead = orders.addRow(["Mã đơn", "Nhận lúc", "Khách", "SĐT", "Subtotal", "Giảm", "Tổng", "Hoàn thành"]);
  styleHeader(oHead);
  for (const o of data.orders) {
    orders.addRow([
      o.order_no, o.received_at, o.customer_name ?? "", o.customer_phone ?? "",
      o.subtotal, o.discount_total, o.final_total, o.is_completed ? "Có" : "Không",
    ]);
  }
  orders.columns.forEach((c) => (c.width = 16));

  const svc = wb.addWorksheet("Services breakdown");
  const sHead = svc.addRow(["Dịch vụ", "Số lượng", "Doanh thu"]);
  styleHeader(sHead);
  for (const s of data.serviceSummary) svc.addRow([s.service_name, s.quantity, s.revenue]);
  svc.columns.forEach((c) => (c.width = 24));

  const inc = wb.addWorksheet("Incomplete-overdue");
  const iHead = inc.addRow(["Mã đơn", "Khách", "SĐT", "Hẹn trả", "Tổng"]);
  styleHeader(iHead);
  for (const o of data.incomplete) {
    inc.addRow([o.order_no, o.customer_name ?? "", o.customer_phone ?? "", o.due_at ?? "", o.final_total]);
  }
  inc.columns.forEach((c) => (c.width = 20));

  const notes = wb.addWorksheet("Manual notes");
  notes.addRow(["Ghi chú thủ công (chỉnh sửa tự do):"]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export interface MonthlyReportData {
  month: string;                      // YYYY-MM
  shopName: string;
  dailyRevenue: { date: string; gross: number; discount: number; net: number; count: number }[];
  orders: Order[];
  serviceSummary: ServiceSummaryRow[];
  incomplete: Order[];
}

export async function buildMonthlyReport(data: MonthlyReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DN House";
  wb.created = new Date();

  const daily = wb.addWorksheet("Daily revenue");
  const dHead = daily.addRow(["Ngày", "Số đơn", "Subtotal", "Giảm", "Doanh thu thực"]);
  styleHeader(dHead);
  let gTot = 0, dTot = 0, nTot = 0;
  for (const d of data.dailyRevenue) {
    daily.addRow([d.date, d.count, d.gross, d.discount, d.net]);
    gTot += d.gross; dTot += d.discount; nTot += d.net;
  }
  const totRow = daily.addRow(["Tổng", "", gTot, dTot, nTot]);
  totRow.font = { bold: true };
  daily.columns.forEach((c) => (c.width = 16));

  const orders = wb.addWorksheet("All orders");
  const oHead = orders.addRow(["Mã đơn", "Nhận lúc", "Khách", "SĐT", "Subtotal", "Giảm", "Tổng", "Hoàn thành"]);
  styleHeader(oHead);
  for (const o of data.orders) {
    orders.addRow([
      o.order_no, o.received_at, o.customer_name ?? "", o.customer_phone ?? "",
      o.subtotal, o.discount_total, o.final_total, o.is_completed ? "Có" : "Không",
    ]);
  }
  orders.columns.forEach((c) => (c.width = 16));

  const svc = wb.addWorksheet("Service summary");
  const sHead = svc.addRow(["Dịch vụ", "Số lượng", "Doanh thu"]);
  styleHeader(sHead);
  for (const s of data.serviceSummary) svc.addRow([s.service_name, s.quantity, s.revenue]);
  svc.columns.forEach((c) => (c.width = 24));

  const disc = wb.addWorksheet("Discounts");
  const discHead = disc.addRow(["Mã đơn", "Loại giảm", "Giá trị", "Giảm thực"]);
  styleHeader(discHead);
  for (const o of data.orders.filter((x) => x.discount_total > 0)) {
    disc.addRow([o.order_no, o.discount_type, o.discount_value, o.discount_total]);
  }
  disc.columns.forEach((c) => (c.width = 18));

  const inc = wb.addWorksheet("Incomplete-overdue");
  const iHead = inc.addRow(["Mã đơn", "Khách", "SĐT", "Hẹn trả", "Tổng"]);
  styleHeader(iHead);
  for (const o of data.incomplete) {
    inc.addRow([o.order_no, o.customer_name ?? "", o.customer_phone ?? "", o.due_at ?? "", o.final_total]);
  }
  inc.columns.forEach((c) => (c.width = 20));

  const notes = wb.addWorksheet("Manual notes");
  notes.addRow(["Ghi chú thủ công (chỉnh sửa tự do):"]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
