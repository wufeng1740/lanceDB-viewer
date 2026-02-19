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
pub async fn get_table_details(db_path: String, table_name: String) -> Result<TableDetails, AppError> {
    scanner::get_table_details(&db_path, &table_name).await
}
