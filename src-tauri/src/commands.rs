use crate::error::{Error, Result};
use crate::state::AppState;
use crate::utils::{ensure_safe_path, get_default_dir, parse_markdown_internal};
use std::fs;
use std::path::PathBuf;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;

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
pub fn parse_markdown(content: String) -> String {
    parse_markdown_internal(content)
}

#[tauri::command]
pub fn get_base_dir(app: tauri::AppHandle, state: State<'_, AppState>) -> Result<String> {
    let dir = get_resolved_base_dir(&app, &state)?;
    log::info!("Fetching base directory: {:?}", dir);
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn set_base_dir(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    new_path: String,
) -> Result<()> {
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
pub fn list_markdown_files(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Vec<String>> {
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
pub async fn read_markdown_file(
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
pub async fn write_markdown_file(
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
pub fn open_url(app: tauri::AppHandle, url: String) -> Result<()> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| Error::Generic(e.to_string()))?;
    Ok(())
}
