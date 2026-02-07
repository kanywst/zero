use crate::error::{Error, Result};
use pulldown_cmark::{html, Options, Parser};
use std::path::{Path, PathBuf};
use tauri::Manager;

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

pub fn get_default_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().home_dir().unwrap_or_else(|_| PathBuf::from("/"))
}

/// Helper to ensure the file path is within the base directory.
/// This prevents directory traversal attacks (e.g., "../../etc/passwd").
pub fn ensure_safe_path(base: &Path, file_name: &str) -> Result<PathBuf> {
    if file_name.contains("..") || file_name.starts_with('/') || file_name.contains('\\') {
        return Err(Error::InvalidPath(file_name.to_string()));
    }
    Ok(base.join(file_name))
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
