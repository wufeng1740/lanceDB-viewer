#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;


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
            commands::get_table_details,
            commands::get_table_data,
            commands::select_file,
            commands::read_text_file,
            commands::get_mapping_file_path,
            commands::set_mapping_file_path,
        ])
        .on_window_event(|_window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                std::process::exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
