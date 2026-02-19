import { invoke } from '@tauri-apps/api/core';
import type { AppError, ScanResult, TableDetails } from './types';

function normalizeError(error: unknown): AppError {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as Partial<AppError>;
    if (candidate.category && candidate.message) {
      return {
        category: candidate.category,
        message: candidate.message,
        detail: candidate.detail
      } as AppError;
    }
  }

  return {
    category: 'unknown',
    message: 'Unexpected error.',
    detail: String(error)
  };
}

export async function selectFolder(): Promise<string | null> {
  return invoke<string | null>('select_folder');
}

export async function scanFolder(path: string): Promise<ScanResult> {
  try {
    return await invoke<ScanResult>('scan_folder', { path });
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function getLastScannedFolder(): Promise<string | null> {
  return invoke<string | null>('get_last_scanned_folder');
}

export async function getTableDetails(dbPath: string, tableName: string): Promise<TableDetails> {
  try {
    return await invoke<TableDetails>('get_table_details', { dbPath, tableName });
  } catch (error) {
    throw normalizeError(error);
  }
}
