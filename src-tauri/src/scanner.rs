use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScannedFileInfo {
    pub name: String,
    pub relative_path: String,
    pub extension: String,
    pub size_bytes: i64,
    pub modified_at: i64,
}

const SKIPPED_DIRS: &[&str] = &[
    ".git",
    "node_modules",
    ".cache",
    "dist",
    "build",
    "$recycle.bin",
    "system volume information",
];

pub fn is_dir_skipped(dir_name: &str) -> bool {
    let lower = dir_name.to_lowercase();
    SKIPPED_DIRS.iter().any(|&d| d == lower)
}

pub fn scan_source_folder(root_path: &Path) -> Result<Vec<ScannedFileInfo>, String> {
    if !root_path.exists() || !root_path.is_dir() {
        return Err("Source directory does not exist or is not a directory".to_string());
    }

    let mut files = Vec::new();

    let walker = WalkDir::new(root_path)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if entry.file_type().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    if is_dir_skipped(name) {
                        return false;
                    }
                }
            }
            true
        });

    for entry in walker {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if entry.file_type().is_file() {
            let path = entry.path();
            let relative = match path.strip_prefix(root_path) {
                Ok(r) => r.to_string_lossy().replace('\\', "/"),
                Err(_) => continue,
            };

            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_string())
                .unwrap_or_default();

            let metadata = match fs::metadata(path) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let size_bytes = metadata.len() as i64;
            let modified_at = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_millis() as i64)
                .unwrap_or(0);

            files.push(ScannedFileInfo {
                name,
                relative_path: relative,
                extension: ext,
                size_bytes,
                modified_at,
            });
        }
    }

    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_dir_skipped_matches_all_spec_directories() {
        assert!(is_dir_skipped(".git"));
        assert!(is_dir_skipped(".GIT"));
        assert!(is_dir_skipped("node_modules"));
        assert!(is_dir_skipped("NODE_MODULES"));
        assert!(is_dir_skipped(".cache"));
        assert!(is_dir_skipped("dist"));
        assert!(is_dir_skipped("build"));
        assert!(is_dir_skipped("$RECYCLE.BIN"));
        assert!(is_dir_skipped("$recycle.bin"));
        assert!(is_dir_skipped("System Volume Information"));
        assert!(is_dir_skipped("system volume information"));

        assert!(!is_dir_skipped("documents"));
        assert!(!is_dir_skipped("client_files"));
    }
}
