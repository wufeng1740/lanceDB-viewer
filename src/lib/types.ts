export type ErrorCategory =
  | 'invalid_path'
  | 'permission_denied'
  | 'open_failed'
  | 'metadata_unavailable'
  | 'unknown';

export interface AppError {
  category: ErrorCategory;
  message: string;
  detail?: string;
}

export interface FieldInfo {
  name: string;
  dataType: string;
  isVector: boolean;
  dimension?: number;
}

export interface TableSummary {
  dbPath: string;
  tableName: string;
  rowCount?: number;
  hasVector: boolean;
  vectorDimension?: number;
}

export interface TableDetails extends TableSummary {
  schemaFields: FieldInfo[];
}

export interface ScanResult {
  tables: TableSummary[];
  warnings: string[];
}
