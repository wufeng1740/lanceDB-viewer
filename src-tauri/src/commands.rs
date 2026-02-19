use crate::models::{AppError, ErrorCategory, ScanResult, TableDetails};
use crate::services::{scanner, settings};

#[tauri::command]
pub async fn select_folder() -> Result<Option<String>, AppError> {
    let picked = rfd::FileDialog::new()
        .set_title("Select folder to scan")
        .pick_folder();

    if let Some(path) = picked {
        if let Some(folder) = path.to_str() {
            let _ = settings::set_last_scanned_folder(folder);
            return Ok(Some(folder.to_string()));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn select_file() -> Result<Option<String>, AppError> {
    let picked = rfd::FileDialog::new()
        .set_title("Select KB Mapping JSON")
        .add_filter("JSON", &["json"])
        .pick_file();

    if let Some(path) = picked {
        if let Some(file_path) = path.to_str() {
            return Ok(Some(file_path.to_string()));
        }
    }

    Ok(None)
}

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, AppError> {
    std::fs::read_to_string(&path)
        .map_err(|e| AppError::new(ErrorCategory::Unknown, "Failed to read file", Some(e.to_string())))
}

#[tauri::command]
pub async fn scan_folder(path: String) -> Result<ScanResult, AppError> {
    scanner::scan_folder(&path).await.map_err(|e| match e.category {
        ErrorCategory::InvalidPath => e,
        _ => AppError::new(ErrorCategory::Unknown, "Scan failed", e.detail),
    })
}

#[tauri::command]
pub async fn get_last_scanned_folder() -> Result<Option<String>, AppError> {
    Ok(settings::get_last_scanned_folder())
}

#[tauri::command]
pub async fn get_mapping_file_path() -> Result<Option<String>, AppError> {
    Ok(settings::get_mapping_file_path())
}

#[tauri::command]
pub async fn set_mapping_file_path(path: String) -> Result<(), AppError> {
    settings::set_mapping_file_path(&path)
        .map_err(|e| AppError::new(ErrorCategory::Unknown, "Failed to save settings", Some(e)))
}

#[tauri::command]
pub async fn get_table_details(db_path: String, table_name: String) -> Result<TableDetails, AppError> {
    scanner::get_table_details(&db_path, &table_name).await
}

#[tauri::command]
pub async fn get_table_data(db_path: String, table_name: String, limit: usize) -> Result<crate::models::TableData, AppError> {
    scanner::get_table_data(&db_path, &table_name, limit).await
}
