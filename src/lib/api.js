import { invoke } from '@tauri-apps/api/core';
function normalizeError(error) {
    if (typeof error === 'object' && error !== null) {
        const candidate = error;
        if (candidate.category && candidate.message) {
            return {
                category: candidate.category,
                message: candidate.message,
                detail: candidate.detail
            };
        }
    }
    return {
        category: 'unknown',
        message: 'Unexpected error.',
        detail: String(error)
    };
}
export async function selectFolder() {
    return invoke('select_folder');
}
export async function scanFolder(path) {
    try {
        return await invoke('scan_folder', { path });
    }
    catch (error) {
        throw normalizeError(error);
    }
}
export async function getLastScannedFolder() {
    return invoke('get_last_scanned_folder');
}
export async function getTableDetails(dbPath, tableName) {
    try {
        return await invoke('get_table_details', { dbPath, tableName });
    }
    catch (error) {
        throw normalizeError(error);
    }
}
