
use std::path::{Path, PathBuf};

use lancedb::connect;
use lancedb::query::*;
use walkdir::{DirEntry, WalkDir};
use arrow::json::ArrayWriter;
use futures::StreamExt;
use arrow::record_batch::RecordBatch;

use crate::models::{AppError, ErrorCategory, FieldInfo, ScanResult, TableDetails, TableSummary, TableData};

fn is_symlink(entry: &DirEntry) -> bool {
    entry.path_is_symlink()
}

fn looks_like_lancedb_dir(path: &Path) -> bool {
    path.join("_latest.manifest").exists()
        || path.join("_versions").is_dir()
        || path.join("_transactions").is_dir()
}

pub async fn scan_folder(path: &str) -> Result<ScanResult, AppError> {
    let root = PathBuf::from(path);
    if !root.exists() || !root.is_dir() {
        return Err(AppError::new(
            ErrorCategory::InvalidPath,
            "Folder path is invalid",
            Some(path.to_string()),
        ));
    }

    let mut tables: Vec<TableSummary> = Vec::new();
    let mut warnings: Vec<String> = Vec::new();

    let walker = WalkDir::new(&root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| !is_symlink(entry));

    for entry in walker {
        let entry = match entry {
            Ok(value) => value,
            Err(err) => {
                warnings.push(format!("walk error: {err}"));
                continue;
            }
        };

        if !entry.file_type().is_dir() {
            continue;
        }

        let path = entry.path();
        if !looks_like_lancedb_dir(path) {
            continue;
        }

        // Found a table directory. The database is the parent directory.
        // We connect to the parent (DB) and open the table (directory name).
        let parent = path.parent().unwrap_or(path);
        let db_path = parent.to_string_lossy().to_string();
        let name_str = path.file_name().unwrap_or_default().to_string_lossy();
        let table_name = if name_str.ends_with(".lance") {
            name_str.strip_suffix(".lance").unwrap_or(&name_str).to_string()
        } else {
            name_str.to_string()
        };

        match get_table_details(&db_path, &table_name).await {
            Ok(details) => {
                println!("Successfully scanned table: {}/{}", details.db_path, details.table_name);
                tables.push(TableSummary {
                    db_path: details.db_path,
                    table_name: details.table_name,
                    row_count: details.row_count,
                    has_vector: details.has_vector,
                    vector_dimension: details.vector_dimension,
                })
            },
            Err(err) => {
                let detail = err.detail.clone().unwrap_or_default();
                let msg = if !detail.is_empty() {
                    format!("{} ({})", err.message, detail)
                } else {
                    err.message.clone()
                };
                warnings.push(format!(
                    "table metadata failed: {db_path}/{table_name} - {}",
                    msg
                ));
                // Explicitly print to stderr for debugging
                eprintln!("LanceDB Scan Error: {db_path}/{table_name} - {}", msg);
            }
        }
    }

    Ok(ScanResult { tables, warnings })
}

pub async fn get_table_details(db_path: &str, table_name: &str) -> Result<TableDetails, AppError> {
    let db = connect(db_path).execute().await.map_err(|e| {
        AppError::new(
            ErrorCategory::OpenFailed,
            "Unable to open LanceDB dataset",
            Some(e.to_string()),
        )
    })?;

    let table = db.open_table(table_name).execute().await.map_err(|e| {
        AppError::new(
            ErrorCategory::MetadataUnavailable,
            "Unable to open table",
            Some(e.to_string()),
        )
    })?;

    let row_count = table.count_rows(None).await.ok().map(|c| c as u64);
    let schema = table.schema().await.map_err(|e| {
        AppError::new(
            ErrorCategory::MetadataUnavailable,
            "Unable to read schema",
            Some(e.to_string()),
        )
    })?;

    let mut fields = Vec::new();
    let mut has_vector = false;
    let mut vector_dimension = None;

    for field in schema.fields() {
        let data_type = format!("{:?}", field.data_type());
        let is_vector = data_type.contains("FixedSizeList") || data_type.contains("List");
        if is_vector && !has_vector {
            has_vector = true;
            vector_dimension = extract_dimension(&data_type);
        }
        fields.push(FieldInfo {
            name: field.name().to_string(),
            data_type,
            is_vector,
            dimension: vector_dimension,
        });
    }

    Ok(TableDetails {
        db_path: db_path.to_string(),
        table_name: table_name.to_string(),
        row_count,
        has_vector,
        vector_dimension,
        schema_fields: fields,
    })
}

fn extract_dimension(data_type: &str) -> Option<usize> {
    let marker = "FixedSizeList(";
    let idx = data_type.find(marker)? + marker.len();
    let tail = &data_type[idx..];
    let comma_idx = tail.find(',')?;
    tail[..comma_idx].trim().parse::<usize>().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dimension_parse() {
        assert_eq!(extract_dimension("FixedSizeList(128, Float32)"), Some(128));
        assert_eq!(extract_dimension("Utf8"), None);
    }

    #[tokio::test]
    async fn scan_invalid_path_returns_invalid_path_error() {
        let result = scan_folder("Z:\\this\\path\\should\\not\\exist\\for\\tests").await;
        assert!(result.is_err());
        let err = result.err().expect("error");
        match err.category {
            ErrorCategory::InvalidPath => {}
            other => panic!("unexpected category: {:?}", other),
        }
    }
}

pub async fn get_table_data(db_path: &str, table_name: &str, limit: usize) -> Result<TableData, AppError> {
    let db = connect(db_path).execute().await.map_err(|e| {
        AppError::new(
            ErrorCategory::OpenFailed,
            "Unable to open LanceDB dataset",
            Some(e.to_string()),
        )
    })?;

    let table = db.open_table(table_name).execute().await.map_err(|e| {
        AppError::new(
            ErrorCategory::MetadataUnavailable,
            "Unable to open table",
            Some(e.to_string()),
        )
    })?;

    let row_count = table.count_rows(None).await.unwrap_or(0);

    let mut stream = table
        .query()
        .limit(limit)
        .execute()
        .await
        .map_err(|e| AppError::new(ErrorCategory::Unknown, "Query failed", Some(e.to_string())))?;

    let mut batches: Vec<RecordBatch> = Vec::new();
    while let Some(batch_result) = stream.next().await {
        let batch = batch_result.map_err(|e| AppError::new(ErrorCategory::Unknown, "Batch error", Some(e.to_string())))?;
        batches.push(batch);
    }

    let columns = if let Some(batch) = batches.first() {
        batch.schema().fields().iter().map(|f| f.name().clone()).collect::<Vec<String>>()
    } else {
        table.schema().await.map(|s| s.fields().iter().map(|f| f.name().clone()).collect::<Vec<String>>()).unwrap_or_default()
    };

    let mut buf = Vec::new();
    {
        let mut writer = arrow::json::ArrayWriter::new(&mut buf);
        for batch in &batches {
            writer.write(batch).map_err(|e| AppError::new(ErrorCategory::Unknown, "JSON write error", Some(e.to_string())))?;
        }
        writer.finish().map_err(|e| AppError::new(ErrorCategory::Unknown, "JSON finish error", Some(e.to_string())))?;
    }
    let json_str = String::from_utf8(buf).map_err(|e| AppError::new(ErrorCategory::Unknown, "UTF8 conversion error", Some(e.to_string())))?;
    let rows: Vec<serde_json::Value> = serde_json::from_str(&json_str).map_err(|e| AppError::new(ErrorCategory::Unknown, "JSON parse error", Some(e.to_string())))?;

    Ok(TableData {
        total_rows: row_count,
        columns,
        rows,
    })
}