mod commands;
mod error;
mod state;
mod utils;

use crate::state::AppState;
use std::path::PathBuf;
use std::sync::RwLock;
use tauri::Emitter;
use tauri_plugin_cli::CliExt;

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
            commands::get_base_dir,
            commands::set_base_dir,
            commands::list_markdown_files,
            commands::read_markdown_file,
            commands::write_markdown_file,
            commands::open_url,
            commands::parse_markdown
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
