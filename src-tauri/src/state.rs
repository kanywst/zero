use std::path::PathBuf;
use std::sync::RwLock;

pub struct AppState {
    pub base_dir: RwLock<PathBuf>,
}
