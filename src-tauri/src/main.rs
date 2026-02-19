#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::select_folder,
            commands::scan_folder,
            commands::get_last_scanned_folder,
            commands::get_table_details
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
