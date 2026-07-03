import ExcelJS from "exceljs";

/**
 * Excel declaration template mapping.
 * - sheet: worksheet name (defaults to first sheet)
 * - startRow: 1-based row where the first data row is written
 * - columns: { <declaration_field>: "<ColumnLetter>" }, e.g. { order_no: "B", final_total: "F" }
 */
export interface ExcelMapping {
  sheet?: string;
  startRow: number;
  columns: Record<string, string>;
}

export interface SheetInfo {
  name: string;
  rowCount: number;
  columnCount: number;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** List sheets in an uploaded .xlsx template. */
export async function inspectSheets(bytes: Uint8Array): Promise<SheetInfo[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(toArrayBuffer(bytes));
  return wb.worksheets.map((ws) => ({ name: ws.name, rowCount: ws.rowCount, columnCount: ws.columnCount }));
}

/**
 * Fill an uploaded Excel template with declaration rows, preserving all other
 * cells (headers, formulas, styling). Returns the edited workbook as a Buffer.
 * The file stays editable (not locked).
 */
export async function fillExcelTemplate(
  templateBytes: Uint8Array,
  mapping: ExcelMapping,
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(toArrayBuffer(templateBytes));
  const ws = mapping.sheet ? wb.getWorksheet(mapping.sheet) : wb.worksheets[0];
  if (!ws) throw new Error(`Sheet not found: ${mapping.sheet ?? "(first)"}`);

  rows.forEach((row, i) => {
    const excelRow = ws.getRow(mapping.startRow + i);
    for (const [field, col] of Object.entries(mapping.columns)) {
      if (!col) continue;
      const value = row[field];
      excelRow.getCell(col).value = (value as any) ?? null;
    }
    excelRow.commit();
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
