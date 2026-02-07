use pulldown_cmark::{html, Options, Parser};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{Emitter, Manager, State};
use tauri_plugin_cli::CliExt;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_store::StoreExt;

struct AppState {
    base_dir: Mutex<PathBuf>,
}

#[tauri::command]
fn parse_markdown(content: String) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_SMART_PUNCTUATION);

    let parser = Parser::new_ext(&content, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

fn get_default_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().home_dir().unwrap_or_else(|_| PathBuf::from("/"))
}

#[tauri::command]
fn get_base_dir(app: tauri::AppHandle, state: State<'_, AppState>) -> String {
    let mut dir = state.base_dir.lock().unwrap();
    if dir.as_os_str().is_empty() {
        // Load from store
        let store = app.get_store("settings.json").unwrap_or_else(|| {
            app.store("settings.json").unwrap()
        });
        
        if let Some(saved_path) = store.get("base_dir") {
            if let Some(path_str) = saved_path.as_str() {
                let path = PathBuf::from(path_str);
                if path.exists() {
                    *dir = path;
                }
            }
        }
        
        if dir.as_os_str().is_empty() {
            *dir = get_default_dir(&app);
        }
    }
    dir.to_string_lossy().to_string()
}

#[tauri::command]
fn set_base_dir(app: tauri::AppHandle, state: State<'_, AppState>, new_path: String) -> Result<(), String> {
    let path = PathBuf::from(&new_path);
    if !path.exists() {
        return Err("Selected directory does not exist.".to_string());
    }
    *state.base_dir.lock().unwrap() = path;
    
    let store = app.get_store("settings.json").unwrap_or_else(|| {
        app.store("settings.json").unwrap()
    });
    store.set("base_dir", serde_json::json!(new_path));
    let _ = store.save();
    Ok(())
}

#[tauri::command]
fn list_markdown_files(app: tauri::AppHandle, state: State<'_, AppState>) -> Vec<String> {
    let mut base_dir = state.base_dir.lock().unwrap();
    if base_dir.as_os_str().is_empty() {
        *base_dir = get_default_dir(&app);
    }

    let mut files = Vec::new();
    if let Ok(entries) = fs::read_dir(&*base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() && path.extension().is_some_and(|ext| ext == "md") {
                if let Some(name) = path.file_name().and_then(|s| s.to_str()) {
                    files.push(name.to_string());
                }
            }
        }
    }
    files
}

#[tauri::command]
fn read_markdown_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    file_name: String,
) -> Result<String, String> {
    let mut base_dir = state.base_dir.lock().unwrap();
    if base_dir.as_os_str().is_empty() {
        *base_dir = get_default_dir(&app);
    }
    let file_path = base_dir.join(file_name);
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_markdown_file(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    file_name: String,
    content: String,
) -> Result<(), String> {
    let mut base_dir = state.base_dir.lock().unwrap();
    if base_dir.as_os_str().is_empty() {
        *base_dir = get_default_dir(&app);
    }
    let file_path = base_dir.join(file_name);
    fs::write(file_path, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_url(app: tauri::AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState {
            base_dir: Mutex::new(PathBuf::new()),
        })
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
            // Check CLI args on startup
            if let Ok(matches) = app.cli().matches() {
                if let Some(arg) = matches.args.get("file") {
                    if let Some(file_path) = arg.value.as_str() {
                        let app_handle = app.handle().clone();
                        let file_path = file_path.to_string();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(500));
                            let _ = app_handle.emit("open-file", file_path);
                        });
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
