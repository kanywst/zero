use pulldown_cmark::{html, Options, Parser};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::{Emitter, Manager, State};
use tauri_plugin_cli::CliExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error(transparent)]
    Io(#[from] std::io::Error),
    #[error("Path traversal detected or invalid path: {0}")]
    InvalidPath(String),
    #[error("{0}")]
    Generic(String),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_str())
    }
}

pub type Result<T> = std::result::Result<T, Error>;

pub struct AppState {
    pub base_dir: RwLock<PathBuf>,
}

pub fn parse_markdown_internal(content: String) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);

    let parser = Parser::new_ext(&content, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);

    let mut cleaner = ammonia::Builder::default();
    cleaner
        .add_generic_attributes(&["style", "class"])
        .add_tags(&["input"])
        .add_tag_attributes("input", &["type", "checked", "disabled"])
        .link_rel(Some("noopener noreferrer"));

    cleaner.clean(&html_output).to_string()
}

#[tauri::command]
fn parse_markdown(content: String) -> String {
    parse_markdown_internal(content)
}

pub fn get_default_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().home_dir().unwrap_or_else(|_| PathBuf::from("/"))
}

/// Helper to ensure the file path is within the base directory.
/// This prevents directory traversal attacks (e.g., "../../etc/passwd").
fn ensure_safe_path(base: &Path, file_name: &str) -> Result<PathBuf> {
    if file_name.contains("..") || file_name.starts_with('/') || file_name.contains('\\') {
        return Err(Error::InvalidPath(file_name.to_string()));
    }
    Ok(base.join(file_name))
}

pub fn get_resolved_base_dir(
    app: &tauri::AppHandle,
    state: &State<'_, AppState>,
) -> Result<PathBuf> {
    // 1. Try to get from state (read lock)
    {
        let dir = state
            .base_dir
            .read()
            .map_err(|_| Error::Generic("RwLock poisoned".into()))?;
        if !dir.as_os_str().is_empty() {
            return Ok(dir.clone());
        }
    }

    // 2. If empty, try to load from store
    let store_path = app
        .get_store("settings.json")
        .or_else(|| app.store("settings.json").ok())
        .and_then(|store| {
            store
                .get("base_dir")
                .and_then(|v| v.as_str().map(PathBuf::from))
        });

    if let Some(path) = store_path {
        if path.exists() {
            // Update state with write lock
            let mut dir = state
                .base_dir
                .write()
                .map_err(|_| Error::Generic("RwLock poisoned".into()))?;
            *dir = path.clone();
            return Ok(path);
        }
    }

    // 3. Fallback to default
    let default_dir = get_default_dir(app);
    let mut dir = state
        .base_dir
        .write()
        .map_err(|_| Error::Generic("RwLock poisoned".into()))?;
    *dir = default_dir.clone();

    Ok(default_dir)
}

#[tauri::command]
fn get_base_dir(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String> {
    let dir = get_resolved_base_dir(&app, &state)?;
    log::info!("Fetching base directory: {:?}", dir);
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn set_base_dir(app: tauri::AppHandle, state: State<'_, AppState>, new_path: String) -> Result<()> {
    let path = PathBuf::from(&new_path);
    if !path.exists() {
        log::warn!("Attempted to set non-existent directory: {}", new_path);
        return Err(Error::Generic("Selected directory does not exist.".into()));
    }

    // Update state
    {
        let mut dir = state
            .base_dir
            .write()
            .map_err(|_| Error::Generic("RwLock poisoned".into()))?;
        *dir = path.clone();
    }

    // Persist to store
    let store = app
        .get_store("settings.json")
        .or_else(|| app.store("settings.json").ok())
        .ok_or_else(|| Error::Generic("Failed to access settings store".into()))?;

    store.set("base_dir", serde_json::json!(new_path));
    store.save().map_err(|e| Error::Generic(e.to_string()))?;

    log::info!("Base directory updated to: {}", new_path);
    Ok(())
}

#[tauri::command]
fn list_markdown_files(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<Vec<String>> {
    let base_dir = get_resolved_base_dir(&app, &state)?;
    log::debug!("Listing files in: {:?}", base_dir);

    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(file_name) = path.file_name().and_then(|s| s.to_str()) {
                    if !file_name.starts_with('.')
                        && path.extension().is_some_and(|ext| ext == "md")
                    {
                        files.push(file_name.to_string());
                    }
                }
            }
        }
    }
    files.sort();
    Ok(files)
}

#[tauri::command]
async fn read_markdown_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    file_name: String,
) -> Result<String> {
    let base_dir = get_resolved_base_dir(&app, &state)?;
    let file_path = ensure_safe_path(&base_dir, &file_name)?;
    log::info!("Reading file: {:?}", file_path);

    let content = tokio::fs::read_to_string(&file_path).await.map_err(|e| {
        log::error!("Failed to read file {:?}: {}", file_path, e);
        Error::Io(e)
    })?;
    Ok(content)
}

#[tauri::command]
async fn write_markdown_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    file_name: String,
    content: String,
) -> Result<()> {
    let base_dir = get_resolved_base_dir(&app, &state)?;
    let file_path = ensure_safe_path(&base_dir, &file_name)?;
    log::info!("Writing file: {:?}", file_path);

    tokio::fs::write(&file_path, content).await.map_err(|e| {
        log::error!("Failed to write file {:?}: {}", file_path, e);
        Error::Io(e)
    })?;
    Ok(())
}

#[tauri::command]
fn open_url(app: tauri::AppHandle, url: String) -> Result<()> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| Error::Generic(e.to_string()))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            base_dir: RwLock::new(PathBuf::new()),
        })
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_cli::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            if let Some(file) = args.get(1) {
                let _ = app.emit("open-file", file);
            }
        }))
        .setup(|app| {
            if let Ok(matches) = app.cli().matches() {
                if let Some(arg) = matches.args.get("file") {
                    if let Some(file_path) = arg.value.as_str() {
                        let app_handle = app.handle().clone();
                        let file_path = file_path.to_string();
                        let _ = app_handle.emit("open-file", file_path);
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_base_dir,
            set_base_dir,
            list_markdown_files,
            read_markdown_file,
            write_markdown_file,
            open_url,
            parse_markdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_markdown_basic() {
        let input = "# Hello\nThis is **bold**.".to_string();
        let output = parse_markdown_internal(input);
        assert!(output.contains("<h1>Hello</h1>"));
        assert!(output.contains("<strong>bold</strong>"));
    }

    #[test]
    fn test_parse_markdown_sanitization() {
        let input = "Hello <script>alert('xss')</script> world".to_string();
        let output = parse_markdown_internal(input);
        assert!(!output.contains("<script>"));
        assert!(output.contains("Hello  world"));
    }

    #[test]
    fn test_parse_markdown_gfm() {
        let input = "- [x] Task 1\n- [ ] Task 2".to_string();
        let output = parse_markdown_internal(input);
        assert!(output.contains("type=\"checkbox\""));
    }
}