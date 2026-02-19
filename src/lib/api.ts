import { invoke } from '@tauri-apps/api/core';
import type { AppError, ScanResult, TableDetails, TableData } from './types';

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

export async function getTableData(dbPath: string, tableName: string, limit: number): Promise<TableData> {
  try {
    return await invoke<TableData>('get_table_data', { dbPath, tableName, limit });
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function selectFile(): Promise<string | null> {
  return invoke<string | null>('select_file');
}

export async function readTextFile(path: string): Promise<string> {
  try {
    return await invoke<string>('read_text_file', { path });
  } catch (error) {
    throw normalizeError(error);
  }
}

export async function getMappingFilePath(): Promise<string | null> {
  return invoke<string | null>('get_mapping_file_path');
}

export async function setMappingFilePath(path: string): Promise<void> {
  try {
    await invoke('set_mapping_file_path', { path });
  } catch (error) {
    throw normalizeError(error);
  }
}
