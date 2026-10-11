use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceRow {
    pub id: String,
    pub name: String,
    pub folder_path: String,
    pub indexed_count: i64,
    pub skipped_count: i64,
    pub status: String,
    pub last_indexed_at: Option<i64>,
    pub created_at: i64,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileRow {
    pub id: String,
    pub workspace_id: String,
    pub name: String,
    pub relative_path: String,
    pub file_type: String,
    pub size_bytes: i64,
    pub modified_at: i64,
    pub index_status: String,
    pub skip_reason: Option<String>,
    pub created_at: i64,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChunkRow {
    pub id: String,
    pub workspace_id: String,
    pub file_id: String,
    pub chunk_index: i64,
    pub content: String,
    pub citation_label: String,
    pub source_file_name: String,
    pub page_number: Option<i64>,
    pub paragraph_number: Option<i64>,
    pub heading: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResultRow {
    pub id: String,
    pub workspace_id: String,
    pub file_id: String,
    pub content: String,
    pub citation_label: String,
    pub source_file_name: String,
    pub rank: f64,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryRow {
    pub id: String,
    pub workspace_id: String,
    pub workspace_name: String,
    pub entry_type: String,
    pub prompt: String,
    pub response: String,
    pub citations_json: String,
    pub has_uncited_warning: bool,
    pub created_at: i64,
}

#[allow(dead_code)]
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SettingsRow {
    pub endpoint: String,
    pub model_name: String,
}

pub fn get_local_db_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    let base_dir = std::env::var("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            let home = std::env::var("USERPROFILE").unwrap_or_else(|_| ".".to_string());
            PathBuf::from(home).join("AppData").join("Local")
        });

    #[cfg(target_os = "macos")]
    let base_dir = std::env::var("HOME")
        .map(|h| PathBuf::from(h).join("Library").join("Application Support"))
        .unwrap_or_else(|_| PathBuf::from("."));

    #[cfg(all(not(target_os = "windows"), not(target_os = "macos")))]
    let base_dir = std::env::var("HOME")
        .map(|h| PathBuf::from(h).join(".local").join("share"))
        .unwrap_or_else(|_| PathBuf::from("."));

    let hijin_dir = base_dir.join("Hijin");
    let legacy_localbrief = base_dir.join("LocalBrief");
    let legacy_agentalpha = base_dir.join("AgentAlpha");

    if !hijin_dir.exists() {
        let _ = fs::create_dir_all(&hijin_dir);
        if legacy_localbrief.join("localbrief.db").exists() && !hijin_dir.join("hijin.db").exists() {
            let _ = fs::copy(legacy_localbrief.join("localbrief.db"), hijin_dir.join("hijin.db"));
        } else if legacy_agentalpha.join("agent_alpha.db").exists() && !hijin_dir.join("hijin.db").exists() {
            let _ = fs::copy(legacy_agentalpha.join("agent_alpha.db"), hijin_dir.join("hijin.db"));
        }
    }

    hijin_dir.join("hijin.db")
}

pub fn init_db(db_path: &Path) -> Result<Connection> {
    let conn = Connection::open(db_path)?;
    conn.query_row("PRAGMA journal_mode = WAL", [], |_| Ok(()))?;
    conn.pragma_update(None, "synchronous", "NORMAL")?;
    init_db_tables(&conn)?;
    Ok(conn)
}

pub fn init_db_tables(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS workspaces (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            folder_path TEXT NOT NULL,
            indexed_count INTEGER DEFAULT 0,
            skipped_count INTEGER DEFAULT 0,
            status TEXT NOT NULL,
            last_indexed_at INTEGER,
            created_at INTEGER NOT NULL
        );",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            name TEXT NOT NULL,
            relative_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            size_bytes INTEGER NOT NULL,
            modified_at INTEGER NOT NULL,
            index_status TEXT NOT NULL,
            skip_reason TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        );",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS chunks (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            file_id TEXT NOT NULL,
            chunk_index INTEGER NOT NULL,
            content TEXT NOT NULL,
            citation_label TEXT NOT NULL,
            source_file_name TEXT NOT NULL,
            page_number INTEGER,
            paragraph_number INTEGER,
            heading TEXT
        );",
        [],
    )?;

    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
            content,
            citation_label UNINDEXED,
            workspace_id UNINDEXED,
            chunk_id UNINDEXED,
            source_file_name UNINDEXED,
            tokenize='porter unicode61'
        );",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS history (
            id TEXT PRIMARY KEY,
            workspace_id TEXT NOT NULL,
            workspace_name TEXT NOT NULL,
            entry_type TEXT NOT NULL,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL,
            citations_json TEXT NOT NULL,
            has_uncited_warning INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
        );",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS settings (
            id TEXT PRIMARY KEY,
            endpoint TEXT NOT NULL,
            model_name TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );",
        [],
    )?;

    conn.execute(
        "INSERT OR IGNORE INTO settings (id, endpoint, model_name, updated_at)
         VALUES ('default', 'http://127.0.0.1:11434', 'gemma3:latest', 0);",
        [],
    )?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_in_memory_fts5_search() {
        let conn = Connection::open_in_memory().unwrap();
        init_db_tables(&conn).unwrap();

        conn.execute(
            "INSERT INTO chunks_fts(content, citation_label, workspace_id, chunk_id, source_file_name)
             VALUES ('Brand strategy requires electric blue color palette', 'Brand Guide.docx, para. 3', 'ws1', 'chk1', 'Brand Guide.docx');",
            [],
        ).unwrap();

        let results = search_chunks(&conn, "ws1", "electric blue", 8).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].citation_label, "Brand Guide.docx, para. 3");

        let empty_results = search_chunks(&conn, "ws1", "unrelated query terms", 8).unwrap();
        assert_eq!(empty_results.len(), 0);
    }
}

pub fn search_chunks(
    conn: &Connection,
    workspace_id: &str,
    query: &str,
    limit: usize,
) -> Result<Vec<SearchResultRow>> {
    // Escape FTS5 special characters
    let cleaned_query: String = query
        .chars()
        .map(|c| if c.is_alphanumeric() || c.is_whitespace() { c } else { ' ' })
        .collect();

    let tokens: Vec<&str> = cleaned_query.split_whitespace().filter(|t| t.len() > 1).collect();
    if tokens.is_empty() {
        return Ok(Vec::new());
    }

    // Combine tokens with OR for broad coverage, ranked by BM25
    let fts_query = tokens.join(" OR ");

    let mut stmt = conn.prepare(
        "SELECT chunk_id, content, citation_label, source_file_name, bm25(chunks_fts) as rank
         FROM chunks_fts
         WHERE workspace_id = ?1 AND chunks_fts MATCH ?2
         ORDER BY rank ASC
         LIMIT ?3;",
    )?;

    let rows = stmt.query_map(params![workspace_id, fts_query, limit as i64], |row| {
        Ok(SearchResultRow {
            id: row.get(0)?,
            workspace_id: workspace_id.to_string(),
            file_id: String::new(),
            content: row.get(1)?,
            citation_label: row.get(2)?,
            source_file_name: row.get(3)?,
            rank: row.get(4)?,
        })
    })?;

    let mut results = Vec::new();
    for r in rows {
        results.push(r?);
    }

    Ok(results)
}
