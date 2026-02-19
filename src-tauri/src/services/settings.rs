use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
struct AppSettings {
    last_scanned_folder: Option<String>,
    mapping_file_path: Option<String>,
}

fn settings_path() -> PathBuf {
    if let Ok(path) = std::env::var("LANCEDB_VIEWER_SETTINGS_PATH") {
        return PathBuf::from(path);
    }

    let mut base = dirs::config_dir().unwrap_or_else(std::env::temp_dir);
    base.push("lancedb-viewer");
    base.push("settings.json");
    base
}

fn load_settings() -> AppSettings {
    let path = settings_path();
    if let Ok(content) = fs::read_to_string(path) {
        if let Ok(parsed) = serde_json::from_str(&content) {
            return parsed;
        }
    }
    AppSettings::default()
}

fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn get_last_scanned_folder() -> Option<String> {
    load_settings().last_scanned_folder
}

pub fn set_last_scanned_folder(folder: &str) -> Result<(), String> {
    let mut settings = load_settings();
    settings.last_scanned_folder = Some(folder.to_string());
    save_settings(&settings)
}

pub fn get_mapping_file_path() -> Option<String> {
    load_settings().mapping_file_path
}

pub fn set_mapping_file_path(path: &str) -> Result<(), String> {
    let mut settings = load_settings();
    settings.mapping_file_path = Some(path.to_string());
    save_settings(&settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn parse_missing_settings() {
        let dir = tempdir().expect("tempdir");
        let settings_file = dir.path().join("settings.json");
        std::env::set_var(
            "LANCEDB_VIEWER_SETTINGS_PATH",
            settings_file.to_string_lossy().to_string(),
        );
        let value = get_last_scanned_folder();
        assert!(value.is_none());
    }

    #[test]
    fn save_and_read_last_scanned_folder() {
        let dir = tempdir().expect("tempdir");
        let settings_file = dir.path().join("settings.json");
        std::env::set_var(
            "LANCEDB_VIEWER_SETTINGS_PATH",
            settings_file.to_string_lossy().to_string(),
        );

        set_last_scanned_folder("C:\\test\\dbs").expect("save settings");
        let value = get_last_scanned_folder();
        assert_eq!(value.as_deref(), Some("C:\\test\\dbs"));
    }

    #[test]
    fn save_multiple_settings() {
        let dir = tempdir().expect("tempdir");
        let settings_file = dir.path().join("settings.json");
        std::env::set_var(
            "LANCEDB_VIEWER_SETTINGS_PATH",
            settings_file.to_string_lossy().to_string(),
        );

        set_last_scanned_folder("C:\\test\\dbs").expect("save folder");
        set_mapping_file_path("C:\\map.json").expect("save mapping");

        let folder = get_last_scanned_folder();
        let mapping = get_mapping_file_path();

        assert_eq!(folder.as_deref(), Some("C:\\test\\dbs"));
        assert_eq!(mapping.as_deref(), Some("C:\\map.json"));
    }
}
