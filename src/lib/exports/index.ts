/**
 * Export Utility Library
 * Generates CSV, Excel, and PDF exports for leads and partners data.
 */

import { Parser } from "json2csv";
import xlsx from "node-xlsx";

// Export format types
export type ExportFormat = "csv" | "excel" | "pdf" | "json";

// Generic data row interface
export interface ExportableData {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Generate CSV from data array
 */
export function generateCSV<T extends ExportableData>(
  data: T[],
  fields?: string[]
): string {
  if (data.length === 0) {
    return "";
  }

  const parser = new Parser({
    fields: fields || Object.keys(data[0]),
  });

  return parser.parse(data);
}

/**
 * Convert JSON data to 2D array format for node-xlsx
 */
function jsonTo2DArray<T extends ExportableData>(
  data: T[]
): (string | number | boolean | null | undefined)[][] {
  if (data.length === 0) {
    return [];
  }

  // Extract headers from first object
  const headers = Object.keys(data[0]);

  // Create rows: first row is headers, then data rows
  const rows: (string | number | boolean | null | undefined)[][] = [headers];

  for (const item of data) {
    const row = headers.map((key) => item[key]);
    rows.push(row);
  }

  return rows;
}

/**
 * Generate Excel workbook buffer from data array
 */
export function generateExcel<T extends ExportableData>(
  data: T[],
  sheetName: string = "Sheet1"
): Buffer {
  // Convert JSON data to 2D array format
  const sheetData = jsonTo2DArray(data);

  // Build workbook with node-xlsx
  return xlsx.build([{ name: sheetName, data: sheetData, options: {} }]);
}

/**
 * Generate JSON string from data
 */
export function generateJSON<T extends ExportableData>(data: T[]): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Lead export fields
 */
export const LEAD_EXPORT_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "company",
  "title",
  "phone",
  "linkedin_url",
  "pipeline_stage",
  "score",
  "source",
  "created_at",
];

/**
 * Partner export fields
 */
export const PARTNER_EXPORT_FIELDS = [
  "name",
  "website",
  "contact_email",
  "partner_type",
  "status",
  "industry",
  "score",
  "source",
  "created_at",
];

/**
 * Content brief export fields
 */
export const BRIEF_EXPORT_FIELDS = [
  "title",
  "primary_keyword",
  "content_type",
  "status",
  "target_word_count",
  "scheduled_date",
  "created_at",
];

/**
 * Get content type header for export format
 */
export function getExportContentType(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "text/csv";
    case "excel":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pdf":
      return "application/pdf";
    case "json":
    default:
      return "application/json";
  }
}

/**
 * Get file extension for export format
 */
export function getExportExtension(format: ExportFormat): string {
  switch (format) {
    case "csv":
      return "csv";
    case "excel":
      return "xlsx";
    case "pdf":
      return "pdf";
    case "json":
    default:
      return "json";
  }
}

/**
 * Generate export data in specified format
 */
export function generateExport<T extends ExportableData>(
  data: T[],
  format: ExportFormat,
  options?: {
    fields?: string[];
    sheetName?: string;
  }
): string | Buffer {
  switch (format) {
    case "csv":
      return generateCSV(data, options?.fields);
    case "excel":
      return generateExcel(data, options?.sheetName);
    case "json":
    default:
      return generateJSON(data);
  }
}
