const SECRET = 'DNHOUSE_SECRET_123';

const SHEET_ORDERS = 'DON_HANG';
const SHEET_REPORT = 'BAO_CAO';

const HEADERS = [
  'Ngày tạo',
  'Mã đơn',
  'Tên khách',
  'Số điện thoại',
  'Dịch vụ',
  'Số lượng',
  'Đơn giá',
  'Tạm tính',
  'Giảm giá',
  'Tổng thu',
  'Ghi chú',
  'Đã trả đồ',
  'Thời gian trả',
  'Trạng thái',
  'Thời gian xóa'
];

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orders = getOrCreateSheet_(ss, SHEET_ORDERS);

  // Do not clear real data. Only normalize the header row.
  orders.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  orders.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#2e4094')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');
  orders.setFrozenRows(1);
  orders.autoResizeColumns(1, HEADERS.length);

  const report = getOrCreateSheet_(ss, SHEET_REPORT);
  report.clear();
  report.getRange('A1').setValue('Chỉ số');
  report.getRange('B1').setValue('Giá trị');
  report.getRange('A2').setValue('Tổng số đơn');
  report.getRange('B2').setFormula(`=COUNTA(${SHEET_ORDERS}!B2:B)`);
  report.getRange('A3').setValue('Tổng doanh thu');
  report.getRange('B3').setFormula(`=SUM(${SHEET_ORDERS}!J2:J)`);
  report.getRange('A4').setValue('Tổng giảm giá');
  report.getRange('B4').setFormula(`=SUM(${SHEET_ORDERS}!I2:I)`);
  report.getRange('A5').setValue('Số đơn hoàn thành');
  report.getRange('B5').setFormula(`=COUNTIF(${SHEET_ORDERS}!L2:L, TRUE)`);
  report.getRange('A6').setValue('Số đơn chưa hoàn thành');
  report.getRange('B6').setFormula(`=COUNTIFS(${SHEET_ORDERS}!L2:L, FALSE, ${SHEET_ORDERS}!N2:N, "<>Đã xóa")`);
  report.getRange('A7').setValue('Số đơn đã xóa');
  report.getRange('B7').setFormula(`=COUNTIF(${SHEET_ORDERS}!N2:N, "Đã xóa")`);
  report.getRange('A1:B1').setFontWeight('bold');
  report.autoResizeColumns(1, 2);
}

function doGet() {
  return jsonResponse({
    ok: true,
    message: 'DN House POS webhook is running',
    actions: ['create_order', 'complete_order', 'delete_order']
  });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (body.secret !== SECRET && body.token !== SECRET && body.api_key !== SECRET) {
      return jsonResponse({ ok: false, error: 'Unauthorized' });
    }

    if (body.action === 'create_order') return createOrder(body);
    if (body.action === 'complete_order') return completeOrder(body);
    if (body.action === 'delete_order') return deleteOrder(body);

    return jsonResponse({ ok: false, error: 'Unknown action', action: body.action || '' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function createOrder(data) {
  setupSheet();
  const sheet = getOrdersSheet();
  const orderNo = String(data.order_no || '').trim();

  if (!orderNo) return jsonResponse({ ok: false, error: 'Missing order_no' });
  if (findOrderRow(orderNo)) return jsonResponse({ ok: false, error: 'Order already exists', order_no: orderNo });

  sheet.appendRow([
    data.created_at ? new Date(data.created_at) : new Date(),
    orderNo,
    data.customer_name || '',
    data.customer_phone || data.phone || '',
    data.service_name || '',
    Number(data.quantity || 0),
    Number(data.unit_price || 0),
    Number(data.subtotal || 0),
    Number(data.discount_value || 0),
    Number(data.final_total || 0),
    data.note || '',
    false,
    '',
    '',
    ''
  ]);

  return jsonResponse({ ok: true, message: 'Order created', order_no: orderNo });
}

function completeOrder(data) {
  setupSheet();
  const sheet = getOrdersSheet();
  const orderNo = String(data.order_no || '').trim();

  if (!orderNo) return jsonResponse({ ok: false, error: 'Missing order_no' });

  const row = findOrderRow(orderNo);
  if (!row) return jsonResponse({ ok: false, error: 'Order not found', order_no: orderNo });

  sheet.getRange(row, 12).setValue(true);
  sheet.getRange(row, 13).setValue(data.completed_at ? new Date(data.completed_at) : new Date());

  return jsonResponse({ ok: true, message: 'Order completed', order_no: orderNo });
}

function deleteOrder(data) {
  setupSheet();
  const sheet = getOrdersSheet();
  const orderNo = String(data.order_no || '').trim();

  if (!orderNo) return jsonResponse({ ok: false, error: 'Missing order_no' });

  const row = findOrderRow(orderNo);
  if (!row) return jsonResponse({ ok: false, error: 'Order not found', order_no: orderNo });

  // Soft delete only: keep the row for daily review/accounting.
  sheet.getRange(row, 14).setValue('Đã xóa');
  sheet.getRange(row, 15).setValue(new Date());

  return jsonResponse({ ok: true, message: 'Order marked as deleted', order_no: orderNo });
}

function findOrderRow(orderNo) {
  const sheet = getOrdersSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (let i = 0; i < values.length; i += 1) {
    if (String(values[i][0]) === String(orderNo)) return i + 2;
  }
  return null;
}

function getOrdersSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return getOrCreateSheet_(ss, SHEET_ORDERS);
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
