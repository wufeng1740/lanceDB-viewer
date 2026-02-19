use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldInfo {
    pub name: String,
    pub data_type: String,
    pub is_vector: bool,
    pub dimension: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableSummary {
    pub db_path: String,
    pub table_name: String,
    pub row_count: Option<u64>,
    pub has_vector: bool,
    pub vector_dimension: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableDetails {
    pub db_path: String,
    pub table_name: String,
    pub row_count: Option<u64>,
    pub has_vector: bool,
    pub vector_dimension: Option<usize>,
    pub schema_fields: Vec<FieldInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub tables: Vec<TableSummary>,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    InvalidPath,
    PermissionDenied,
    OpenFailed,
    MetadataUnavailable,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub category: ErrorCategory,
    pub message: String,
    pub detail: Option<String>,
}

impl AppError {
    pub fn new(category: ErrorCategory, message: impl Into<String>, detail: Option<String>) -> Self {
        Self {
            category,
            message: message.into(),
            detail,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableData {
    pub total_rows: usize,
    pub columns: Vec<String>,
    // We use serde_json::Value to represent arbitrary data types from LanceDB/Arrow
    pub rows: Vec<serde_json::Value>,
}
