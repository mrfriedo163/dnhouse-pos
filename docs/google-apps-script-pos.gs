const SECRET = 'DNHOUSE_SECRET_123';

const SHEET_LEGACY = 'DON_HANG';
const SHEET_REPORT = 'BAO_CAO';
const SHEET_AI_GUIDE = 'HUONG_DAN_AI';

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
  'Thời gian xóa',
  'Người thao tác',
  'Vai trò',
  'Nguồn dữ liệu',
  'Tab dữ liệu'
];

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const now = new Date();

  normalizeOrderSheet_(getOrCreateSheet_(ss, SHEET_LEGACY));
  normalizeOrderSheet_(getMonthlySheet_(ss, now, false));
  normalizeOrderSheet_(getMonthlySheet_(ss, now, true));
  setupReport_(ss, now);
  setupAiGuide_(ss);
}

function doGet() {
  setupSheet();
  return jsonResponse({
    ok: true,
    message: 'DN House POS webhook is running',
    current_real_sheet: monthlySheetName_(new Date(), false),
    current_demo_sheet: monthlySheetName_(new Date(), true),
    actions: ['create_order', 'complete_order', 'delete_order', 'list_orders']
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
    if (body.action === 'list_orders') return listOrders(body);

    return jsonResponse({ ok: false, error: 'Unknown action', action: body.action || '' });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err) });
  }
}

function createOrder(data) {
  setupSheet();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const createdAt = parseDate_(data.created_at) || new Date();
  const isDemo = isDemo_(data);
  const sheet = getTargetSheet_(ss, createdAt, isDemo, data.target_sheet);
  const orderNo = String(data.order_no || '').trim();

  if (!orderNo) return jsonResponse({ ok: false, error: 'Missing order_no' });
  if (findOrder_(orderNo)) return jsonResponse({ ok: false, error: 'Order already exists', order_no: orderNo });

  sheet.appendRow([
    createdAt,
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
    Boolean(data.is_completed),
    data.completed_at ? parseDate_(data.completed_at) : '',
    '',
    '',
    data.actor_name || data.actor_id || '',
    data.actor_role || '',
    isDemo ? 'Demo' : 'Thật',
    sheet.getName()
  ]);

  return jsonResponse({ ok: true, message: 'Order created', order_no: orderNo, sheet_name: sheet.getName() });
}

function completeOrder(data) {
  setupSheet();
  const orderNo = String(data.order_no || '').trim();
  if (!orderNo) return jsonResponse({ ok: false, error: 'Missing order_no' });

  const found = findOrder_(orderNo, data.target_sheet);
  if (!found) return jsonResponse({ ok: false, error: 'Order not found', order_no: orderNo });

  found.sheet.getRange(found.row, 12).setValue(true);
  found.sheet.getRange(found.row, 13).setValue(data.completed_at ? parseDate_(data.completed_at) : new Date());

  return jsonResponse({ ok: true, message: 'Order completed', order_no: orderNo, sheet_name: found.sheet.getName() });
}

function deleteOrder(data) {
  setupSheet();
  const orderNo = String(data.order_no || '').trim();
  if (!orderNo) return jsonResponse({ ok: false, error: 'Missing order_no' });

  const found = findOrder_(orderNo, data.target_sheet);
  if (!found) return jsonResponse({ ok: false, error: 'Order not found', order_no: orderNo });

  // Soft delete only: keep the row for daily review/accounting.
  found.sheet.getRange(found.row, 14).setValue('Đã xóa');
  found.sheet.getRange(found.row, 15).setValue(new Date());

  return jsonResponse({ ok: true, message: 'Order marked as deleted', order_no: orderNo, sheet_name: found.sheet.getName() });
}

function listOrders(data) {
  setupSheet();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const date = parseDate_(data.month || data.created_at) || new Date();
  const includeDemo = Boolean(data.include_demo);
  const sheets = [getMonthlySheet_(ss, date, false)];
  if (includeDemo) sheets.push(getMonthlySheet_(ss, date, true));

  const orders = [];
  sheets.forEach((sheet) => {
    const values = sheet.getDataRange().getValues();
    for (let i = 1; i < values.length; i += 1) {
      const row = values[i];
      const status = String(row[13] || '');
      if (!row[1]) continue;
      orders.push({
        created_at: toIso_(row[0]),
        order_no: row[1],
        customer_name: row[2],
        customer_phone: row[3],
        service_name: row[4],
        quantity: Number(row[5] || 0),
        unit_price: Number(row[6] || 0),
        subtotal: Number(row[7] || 0),
        discount_value: Number(row[8] || 0),
        final_total: Number(row[9] || 0),
        note: row[10] || '',
        is_completed: Boolean(row[11]),
        completed_at: row[12] ? toIso_(row[12]) : '',
        status: status,
        status_code: status === 'Đã xóa' ? 'deleted' : 'active',
        data_mode: row[17] || 'Thật',
        target_sheet: sheet.getName()
      });
    }
  });

  return jsonResponse({ ok: true, month: monthlySheetName_(date, false), orders: orders });
}

function findOrder_(orderNo, preferredSheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = preferredSheetName
    ? [ss.getSheetByName(preferredSheetName)].filter(Boolean)
    : ss.getSheets().filter((sheet) => /^(DATA|DEMO)_T\d{2}_\d{4}$/.test(sheet.getName()) || sheet.getName() === SHEET_LEGACY);

  for (let s = 0; s < sheets.length; s += 1) {
    const sheet = sheets[s];
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    const values = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i += 1) {
      if (String(values[i][0]) === String(orderNo)) {
        return { sheet: sheet, row: i + 2 };
      }
    }
  }
  return null;
}

function getTargetSheet_(ss, date, isDemo, requestedSheetName) {
  const expected = monthlySheetName_(date, isDemo);
  const name = requestedSheetName && /^((DATA|DEMO)_T\d{2}_\d{4})$/.test(String(requestedSheetName))
    ? String(requestedSheetName)
    : expected;
  const sheet = getOrCreateSheet_(ss, name);
  normalizeOrderSheet_(sheet);
  return sheet;
}

function getMonthlySheet_(ss, date, isDemo) {
  const sheet = getOrCreateSheet_(ss, monthlySheetName_(date, isDemo));
  normalizeOrderSheet_(sheet);
  return sheet;
}

function monthlySheetName_(date, isDemo) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${isDemo ? 'DEMO' : 'DATA'}_T${month}_${date.getFullYear()}`;
}

function normalizeOrderSheet_(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#2e4094')
    .setFontColor('#ffffff')
    .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
}

function setupReport_(ss, date) {
  const realSheet = monthlySheetName_(date, false);
  const demoSheet = monthlySheetName_(date, true);
  const report = getOrCreateSheet_(ss, SHEET_REPORT);

  report.clear();
  report.getRange('A1').setValue('Chỉ số');
  report.getRange('B1').setValue('Giá trị');
  report.getRange('A2').setValue('Tab đơn thật hiện tại');
  report.getRange('B2').setValue(realSheet);
  report.getRange('A3').setValue('Tab demo hiện tại');
  report.getRange('B3').setValue(demoSheet);
  report.getRange('A4').setValue('Tổng số đơn thật');
  report.getRange('B4').setFormula(`=COUNTA(${realSheet}!B2:B)`);
  report.getRange('A5').setValue('Doanh thu thật chưa xóa');
  report.getRange('B5').setFormula(`=SUMIFS(${realSheet}!J2:J; ${realSheet}!N2:N; "<>Đã xóa")`);
  report.getRange('A6').setValue('Tổng giảm giá thật chưa xóa');
  report.getRange('B6').setFormula(`=SUMIFS(${realSheet}!I2:I; ${realSheet}!N2:N; "<>Đã xóa")`);
  report.getRange('A7').setValue('Số đơn đã xóa');
  report.getRange('B7').setFormula(`=COUNTIF(${realSheet}!N2:N; "Đã xóa")`);
  report.getRange('A8').setValue('Số đơn demo');
  report.getRange('B8').setFormula(`=COUNTA(${demoSheet}!B2:B)`);
  report.getRange('A1:B1').setFontWeight('bold');
  report.autoResizeColumns(1, 2);
}

function setupAiGuide_(ss) {
  const guide = getOrCreateSheet_(ss, SHEET_AI_GUIDE);
  guide.clear();
  const rows = [
    ['Mục', 'Hướng dẫn cho AI/Codex sau này'],
    ['Mục tiêu', 'Sheet này là nguồn dữ liệu POS DN House. Không xóa dữ liệu thật nếu không được yêu cầu rõ.'],
    ['Tab đơn thật', 'Mỗi tháng có tab DATA_TMM_YYYY, ví dụ DATA_T07_2026. App tự tạo tab mới khi sang tháng.'],
    ['Tab demo', 'Admin test sẽ ghi vào DEMO_TMM_YYYY. Không dùng tab DEMO để kê khai thuế/doanh thu thật.'],
    ['Dòng đã xóa', 'Không xóa khỏi Sheet. Cột Trạng thái = Đã xóa nghĩa là loại khỏi doanh thu kê khai.'],
    ['Kê khai tháng', 'Chỉ tính dòng trong tab DATA_TMM_YYYY có Trạng thái khác Đã xóa và Nguồn dữ liệu = Thật.'],
    ['Cột tiền', 'Tổng thu nằm ở cột J. Giảm giá nằm ở cột I.'],
    ['Realtime', 'Web app tự đọc lại list_orders định kỳ từ Apps Script để đồng bộ nhiều máy.'],
    ['Mẫu thuế', 'Không tự đoán mẫu pháp lý. Khi kê khai thật phải kiểm tra mẫu hiện hành của cơ quan thuế tại thời điểm nộp.']
  ];
  guide.getRange(1, 1, rows.length, 2).setValues(rows);
  guide.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#2e4094').setFontColor('#ffffff');
  guide.setFrozenRows(1);
  guide.autoResizeColumns(1, 2);
}

function isDemo_(data) {
  return data.is_demo === true || data.data_mode === 'demo' || String(data.target_sheet || '').indexOf('DEMO_') === 0;
}

function parseDate_(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso_(value) {
  if (value instanceof Date) return value.toISOString();
  const date = parseDate_(value);
  return date ? date.toISOString() : String(value || '');
}

function getOrCreateSheet_(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
