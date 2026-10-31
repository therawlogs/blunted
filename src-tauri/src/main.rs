// blunted desktop shell — Tauri v2, macOS + Windows.
// No shell execution, no HTTP, no updater, no remote navigation.
// Articles persist atomically in app storage or the user-selected library folder.
// Arbitrary export destinations require the system save dialog.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod library;
mod storage;

use serde::{Deserialize, Serialize};
static ALLOW_EXIT: std::sync::atomic::AtomicBool = std::sync::atomic::AtomicBool::new(false);
static LIBRARY_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
use std::fs;
use std::path::PathBuf;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, Runtime};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_dialog::DialogExt;

#[derive(Serialize, Deserialize)]
struct Persisted {
    doc: Option<serde_json::Value>,
    prefs: Option<serde_json::Value>,
    #[serde(default)]
    recovered: bool,
    needs_folder: bool,
    location: String,
}

fn default_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("blunted"))
}
fn default_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = default_path(app)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}
fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("blunted-folder.txt"))
}
fn configured_dir(app: &AppHandle) -> Result<Option<PathBuf>, String> {
    storage::configured_path(&config_path(app)?)
}
fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    match configured_dir(app)? {
        Some(dir) => Ok(dir),
        None => default_dir(app), // legitimate first setup only
    }
}

fn atomic_write(path: &PathBuf, content: &str) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn blunted_load(app: AppHandle) -> Result<Persisted, String> {
    let configured = configured_dir(&app)?;
    let legacy = default_path(&app)?;
    let dir = match &configured {
        Some(dir) => dir.clone(),
        None => default_dir(&app)?,
    };
    let read = |name: &str| -> Option<serde_json::Value> {
        let text = fs::read_to_string(dir.join(name)).ok()?;
        serde_json::from_str(&text).ok() // corrupt JSON -> None, never a crash
    };
    let (mut doc, mut recovered) = library::read_legacy(&dir);
    if doc.is_none() && configured.is_some() {
        (doc, recovered) = library::read_legacy(&legacy);
    }
    Ok(Persisted {
        doc,
        prefs: read("prefs.json").or_else(|| {
            if configured.is_some() {
                fs::read_to_string(legacy.join("prefs.json"))
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
            } else {
                None
            }
        }),
        recovered,
        needs_folder: configured.is_none(),
        location: dir.to_string_lossy().into_owned(),
    })
}

#[tauri::command]
async fn blunted_choose_folder(app: AppHandle) -> Result<Option<String>, String> {
    let selected = app
        .dialog()
        .file()
        .set_title("Choose blunted autosave folder")
        .blocking_pick_folder();
    let Some(file_path) = selected else {
        return Ok(None);
    };
    let path = file_path
        .as_path()
        .ok_or_else(|| "unsupported folder path".to_string())?;
    storage::require_root(path)?;
    let config = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config).map_err(|e| e.to_string())?;
    atomic_write(&config.join("blunted-folder.txt"), &path.to_string_lossy())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn blunted_library_load(app: AppHandle) -> Result<library::Library, String> {
    let _guard = LIBRARY_LOCK.lock().map_err(|e| e.to_string())?;
    let legacy = blunted_load(app.clone())?;
    library::load(&data_dir(&app)?, legacy.doc)
}

#[tauri::command]
async fn blunted_library_retry(app: AppHandle) -> Result<serde_json::Value, String> {
    let _guard = LIBRARY_LOCK.lock().map_err(|e| e.to_string())?;
    let dir = data_dir(&app)?;
    let library = library::inspect(&dir)?;
    Ok(
        serde_json::json!({"articles": library.articles, "location": dir.to_string_lossy(), "recovered": library.recovered}),
    )
}

#[tauri::command]
async fn blunted_library_save(
    app: AppHandle,
    doc: serde_json::Value,
    prefs: serde_json::Value,
) -> Result<storage::ArticleSaveReport, String> {
    let _guard = LIBRARY_LOCK.lock().map_err(|e| e.to_string())?;
    storage::save_article(&data_dir(&app)?, &doc, &prefs)
}

#[tauri::command]
async fn blunted_save_prefs(app: AppHandle, prefs: serde_json::Value) -> Result<(), String> {
    let _guard = LIBRARY_LOCK.lock().map_err(|e| e.to_string())?;
    atomic_write(
        &data_dir(&app)?.join("prefs.json"),
        &serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?,
    )
}

#[tauri::command]
fn blunted_close(app: AppHandle) {
    ALLOW_EXIT.store(true, std::sync::atomic::Ordering::SeqCst);
    app.exit(0);
}

#[tauri::command]
async fn blunted_clear(app: AppHandle) -> Result<storage::ClearReport, String> {
    let _guard = LIBRARY_LOCK.lock().map_err(|e| e.to_string())?;
    let configured = configured_dir(&app)?;
    let legacy = default_path(&app)?;
    let mut dirs = vec![configured.unwrap_or_else(|| legacy.clone())];
    if !dirs.contains(&legacy) {
        dirs.push(legacy);
    }
    Ok(storage::clear(&dirs, &config_path(&app)?))
}

#[tauri::command]
async fn blunted_open_file(app: AppHandle) -> Result<Option<OpenFile>, String> {
    let picked = app
        .dialog()
        .file()
        .add_filter("Text & Markdown", &["txt", "md", "markdown"])
        .blocking_pick_file();
    match picked {
        None => Ok(None),
        Some(fp) => {
            let path = fp.as_path().ok_or_else(|| "unsupported path".to_string())?;
            let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
            Ok(Some(OpenFile {
                name: path
                    .file_name()
                    .map(|s| s.to_string_lossy().into_owned())
                    .unwrap_or_else(|| "untitled".to_string()),
                content,
            }))
        }
    }
}

#[derive(Serialize)]
struct OpenFile {
    name: String,
    content: String,
}

#[tauri::command]
async fn blunted_save_as(app: AppHandle, name: String, content: String) -> Result<bool, String> {
    let picked = app
        .dialog()
        .file()
        .set_file_name(&name)
        .blocking_save_file();
    match picked {
        None => Ok(false), // user cancelled — not an error
        Some(fp) => {
            let path = fp.as_path().ok_or_else(|| "unsupported path".to_string())?;
            fs::write(path, content).map_err(|e| e.to_string())?;
            Ok(true)
        }
    }
}

#[tauri::command]
fn blunted_copy(app: AppHandle, text: String) -> Result<(), String> {
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}

fn build_menu<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let file = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &MenuItem::with_id(app, "new", "New", true, Some("CmdOrCtrl+N"))?,
            &MenuItem::with_id(app, "open", "Open…", true, Some("CmdOrCtrl+O"))?,
            &MenuItem::with_id(app, "save-as", "Save As…", true, Some("CmdOrCtrl+S"))?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, Some("Close"))?,
        ],
    )?;
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "find", "Find in Document", true, Some("CmdOrCtrl+F"))?,
        ],
    )?;
    let view = Submenu::with_items(
        app,
        "View",
        true,
        &[
            &MenuItem::with_id(app, "view-write", "Write Mode", true, None::<&str>)?,
            &MenuItem::with_id(app, "view-review", "Review Mode", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "font-inc", "Increase Font Size", true, None::<&str>)?,
            &MenuItem::with_id(app, "font-dec", "Decrease Font Size", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "zoom-in", "Zoom In", true, Some("CmdOrCtrl+Plus"))?,
            &MenuItem::with_id(app, "zoom-out", "Zoom Out", true, Some("CmdOrCtrl+Minus"))?,
            &MenuItem::with_id(
                app,
                "zoom-reset",
                "Actual Size (100%)",
                true,
                Some("CmdOrCtrl+0"),
            )?,
            &MenuItem::with_id(app, "zoom-200", "Zoom to 200%", true, None::<&str>)?,
            &PredefinedMenuItem::separator(app)?,
            &MenuItem::with_id(app, "theme-system", "System Appearance", true, None::<&str>)?,
            &MenuItem::with_id(app, "theme-light", "Light Appearance", true, None::<&str>)?,
            &MenuItem::with_id(app, "theme-dark", "Dark Appearance", true, None::<&str>)?,
        ],
    )?;
    let help = Submenu::with_items(
        app,
        "Help",
        true,
        &[&PredefinedMenuItem::about(app, None, None)?],
    )?;
    #[cfg(target_os = "macos")]
    {
        let application = Submenu::with_items(
            app,
            "blunted",
            true,
            &[
                &PredefinedMenuItem::about(app, None, None)?,
                &PredefinedMenuItem::separator(app)?,
                &PredefinedMenuItem::quit(app, None)?,
            ],
        )?;
        Menu::with_items(app, &[&application, &file, &edit, &view, &help])
    }
    #[cfg(not(target_os = "macos"))]
    Menu::with_items(app, &[&file, &edit, &view, &help])
}

// Page zoom scales the complete WKWebView, including dialogs and controls.
// It is session-only and never changes article font preferences.
fn next_zoom(current: u32, action: &str) -> Option<u32> {
    const LEVELS: [u32; 10] = [50, 67, 80, 90, 100, 110, 125, 150, 175, 200];
    match action {
        "zoom-in" => Some(
            LEVELS
                .into_iter()
                .find(|level| *level > current)
                .unwrap_or(200),
        ),
        "zoom-out" => Some(
            LEVELS
                .into_iter()
                .rev()
                .find(|level| *level < current)
                .unwrap_or(50),
        ),
        "zoom-reset" => Some(100),
        "zoom-200" => Some(200),
        _ => None,
    }
}

#[cfg(test)]
mod zoom_tests {
    use super::next_zoom;
    #[test]
    fn zoom_reaches_exact_200_and_resets() {
        let mut zoom = 100;
        for _ in 0..5 {
            zoom = next_zoom(zoom, "zoom-in").unwrap();
        }
        assert_eq!(zoom, 200);
        assert_eq!(next_zoom(zoom, "zoom-reset"), Some(100));
        assert_eq!(next_zoom(50, "zoom-200"), Some(200));
    }
    #[test]
    fn zoom_is_bounded_and_does_not_handle_font_actions() {
        assert_eq!(next_zoom(200, "zoom-in"), Some(200));
        assert_eq!(next_zoom(50, "zoom-out"), Some(50));
        assert_eq!(next_zoom(100, "font-inc"), None);
        assert_eq!(next_zoom(100, "zoom-out"), Some(90));
    }
}

fn main() {
    let zoom = std::sync::atomic::AtomicU32::new(100);
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            blunted_load,
            blunted_library_load,
            blunted_library_retry,
            blunted_library_save,
            blunted_save_prefs,
            blunted_close,
            blunted_choose_folder,
            blunted_clear,
            blunted_open_file,
            blunted_save_as,
            blunted_copy
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.emit("blunted-close", ());
            }
        })
        .menu(build_menu)
        .on_menu_event(move |app, event| {
            if let Some(win) = app.get_webview_window("main") {
                if let Some(percent) = next_zoom(
                    zoom.load(std::sync::atomic::Ordering::Relaxed),
                    event.id.as_ref(),
                ) {
                    match win.set_zoom(f64::from(percent) / 100.0) {
                        Ok(()) => zoom.store(percent, std::sync::atomic::Ordering::Relaxed),
                        Err(error) => eprintln!("Page zoom failed: {error}"),
                    }
                } else {
                    let _ = win.emit("blunted-menu", event.id.as_ref());
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("blunted failed to start")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                if !ALLOW_EXIT.load(std::sync::atomic::Ordering::SeqCst) {
                    api.prevent_exit();
                    let _ = app.emit("blunted-close", ());
                }
            }
        });
}
