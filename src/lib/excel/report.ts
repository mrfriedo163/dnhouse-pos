import ExcelJS from "exceljs";
import type { Order } from "../types";

export interface ServiceSummaryRow {
  service_name: string;
  quantity: number;
  revenue: number;
}

export interface DailyReportData {
  date: string;
  shopName: string;
  orders: Order[];
  serviceSummary: ServiceSummaryRow[];
  totals: { gross: number; discount: number; net: number; billCount: number };
}

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDDEEEA" } };
  });
}

/** Daily report workbook (editable, not locked). */
export async function buildDailyReport(data: DailyReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DN House";
  wb.created = new Date();

  const summary = wb.addWorksheet("Summary");
  summary.addRow([`${data.shopName} - Báo cáo ngày ${data.date}`]);
  summary.addRow([]);
  summary.addRow(["Số bill", data.totals.billCount]);
  summary.addRow(["Doanh thu gộp", data.totals.gross]);
  summary.addRow(["Tổng giảm giá", data.totals.discount]);
  summary.addRow(["Doanh thu thực", data.totals.net]);
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 18;

  const orders = wb.addWorksheet("Bills");
  const oHead = orders.addRow(["Mã bill", "Ngày tạo", "Khách", "SĐT", "Subtotal", "Giảm", "Tổng"]);
  styleHeader(oHead);
  for (const order of data.orders) {
    orders.addRow([
      order.order_no,
      order.received_at,
      order.customer_name ?? "",
      order.customer_phone ?? "",
      order.subtotal,
      order.discount_total,
      order.final_total,
    ]);
  }
  orders.columns.forEach((column) => (column.width = 16));

  const svc = wb.addWorksheet("Service summary");
  const sHead = svc.addRow(["Dịch vụ", "Số lượng", "Doanh thu"]);
  styleHeader(sHead);
  for (const service of data.serviceSummary) svc.addRow([service.service_name, service.quantity, service.revenue]);
  svc.columns.forEach((column) => (column.width = 24));

  const notes = wb.addWorksheet("Manual notes");
  notes.addRow(["Ghi chú thủ công:"]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export interface MonthlyReportData {
  month: string;
  shopName: string;
  dailyRevenue: { date: string; gross: number; discount: number; net: number; count: number }[];
  orders: Order[];
  serviceSummary: ServiceSummaryRow[];
}

export async function buildMonthlyReport(data: MonthlyReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DN House";
  wb.created = new Date();

  const daily = wb.addWorksheet("Daily revenue");
  const dHead = daily.addRow(["Ngày", "Số bill", "Subtotal", "Giảm", "Doanh thu thực"]);
  styleHeader(dHead);
  let grossTotal = 0;
  let discountTotal = 0;
  let netTotal = 0;
  for (const day of data.dailyRevenue) {
    daily.addRow([day.date, day.count, day.gross, day.discount, day.net]);
    grossTotal += day.gross;
    discountTotal += day.discount;
    netTotal += day.net;
  }
  const totalRow = daily.addRow(["Tổng", "", grossTotal, discountTotal, netTotal]);
  totalRow.font = { bold: true };
  daily.columns.forEach((column) => (column.width = 16));

  const orders = wb.addWorksheet("Bills");
  const oHead = orders.addRow(["Mã bill", "Ngày tạo", "Khách", "SĐT", "Subtotal", "Giảm", "Tổng"]);
  styleHeader(oHead);
  for (const order of data.orders) {
    orders.addRow([
      order.order_no,
      order.received_at,
      order.customer_name ?? "",
      order.customer_phone ?? "",
      order.subtotal,
      order.discount_total,
      order.final_total,
    ]);
  }
  orders.columns.forEach((column) => (column.width = 16));

  const svc = wb.addWorksheet("Service summary");
  const sHead = svc.addRow(["Dịch vụ", "Số lượng", "Doanh thu"]);
  styleHeader(sHead);
  for (const service of data.serviceSummary) svc.addRow([service.service_name, service.quantity, service.revenue]);
  svc.columns.forEach((column) => (column.width = 24));

  const disc = wb.addWorksheet("Discounts");
  const discHead = disc.addRow(["Mã bill", "Loại giảm", "Giá trị", "Giảm thực"]);
  styleHeader(discHead);
  for (const order of data.orders.filter((item) => item.discount_total > 0)) {
    disc.addRow([order.order_no, order.discount_type, order.discount_value, order.discount_total]);
  }
  disc.columns.forEach((column) => (column.width = 18));

  const notes = wb.addWorksheet("Manual notes");
  notes.addRow(["Ghi chú thủ công:"]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function daySheetName(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}-${month}`;
}

function dateOfOrder(order: Order): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(order.received_at));
}

/**
 * One operational workbook per month. Each day is one sheet, so Drive stays tidy:
 * DNHouse-Data-YYYY-MM.xlsx -> 01-MM, 02-MM, ...
 */
export async function buildMonthlyDailyTabsReport(
  data: MonthlyReportData,
  selectedDate?: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "DN House";
  wb.created = new Date();

  const summary = wb.addWorksheet("Tong quan");
  const head = summary.addRow([`${data.shopName} - Data thang ${data.month}`]);
  head.font = { bold: true, size: 14 };
  summary.addRow([]);
  const summaryHeader = summary.addRow(["Ngay", "So bill", "Doanh thu gop", "Giam", "Doanh thu thuc"]);
  styleHeader(summaryHeader);

  let grossTotal = 0;
  let discountTotal = 0;
  let netTotal = 0;
  for (const day of data.dailyRevenue) {
    summary.addRow([day.date, day.count, day.gross, day.discount, day.net]);
    grossTotal += day.gross;
    discountTotal += day.discount;
    netTotal += day.net;
  }
  const total = summary.addRow(["Tong", data.orders.length, grossTotal, discountTotal, netTotal]);
  total.font = { bold: true };
  summary.columns.forEach((column) => (column.width = 18));

  const dates = new Set(data.dailyRevenue.map((row) => row.date));
  if (selectedDate) dates.add(selectedDate);

  for (const date of [...dates].sort()) {
    const ws = wb.addWorksheet(daySheetName(date));
    const dayOrders = data.orders.filter((order) => dateOfOrder(order) === date);
    const title = ws.addRow([`${data.shopName} - ${date}`]);
    title.font = { bold: true, size: 13 };
    ws.addRow([]);

    const tableHeader = ws.addRow([
      "Ma bill",
      "Gio tao",
      "Khach",
      "SDT",
      "Tam tinh",
      "Giam",
      "Tong thu",
      "Ghi chu",
    ]);
    styleHeader(tableHeader);

    for (const order of dayOrders) {
      ws.addRow([
        order.order_no,
        new Date(order.received_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
        order.customer_name ?? "",
        order.customer_phone ?? "",
        order.subtotal,
        order.discount_total,
        order.final_total,
        order.note ?? "",
      ]);
    }

    const gross = dayOrders.reduce((sum, order) => sum + Number(order.subtotal), 0);
    const discount = dayOrders.reduce((sum, order) => sum + Number(order.discount_total), 0);
    const net = dayOrders.reduce((sum, order) => sum + Number(order.final_total), 0);
    const dayTotal = ws.addRow(["Tong ngay", dayOrders.length, "", "", gross, discount, net, ""]);
    dayTotal.font = { bold: true };
    ws.columns.forEach((column) => (column.width = 18));
  }

  const svc = wb.addWorksheet("Tong hop dich vu");
  const svcHead = svc.addRow(["Dich vu", "So luong", "Doanh thu"]);
  styleHeader(svcHead);
  for (const service of data.serviceSummary) {
    svc.addRow([service.service_name, service.quantity, service.revenue]);
  }
  svc.columns.forEach((column) => (column.width = 24));

  const notes = wb.addWorksheet("Ghi chu");
  notes.addRow(["File nay duoc app cap nhat lai khi Admin bam Tao & len Drive o bao cao ngay."]);
  notes.addRow(["Bill da danh dau xoa khong duoc dua vao file nay."]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
