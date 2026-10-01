// blunted desktop shell — Tauri v2, macOS + Windows.
// No shell execution, no HTTP, no updater, no remote navigation.
// Drafts persist atomically under the app-data directory; arbitrary paths are
// never written except through the system save dialog (user-chosen destination).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
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
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("blunted");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn atomic_write(path: &PathBuf, content: &str) -> Result<(), String> {
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())?;
    Ok(())
}

fn valid_doc(v: Option<serde_json::Value>) -> Option<serde_json::Value> {
    match v {
        Some(serde_json::Value::Object(ref m)) => match m.get("body") {
            Some(serde_json::Value::String(_)) => v,
            _ => None,
        },
        _ => None,
    }
}

#[tauri::command]
fn blunted_load(app: AppHandle) -> Result<Persisted, String> {
    let dir = data_dir(&app)?;
    let read = |name: &str| -> Option<serde_json::Value> {
        let text = fs::read_to_string(dir.join(name)).ok()?;
        serde_json::from_str(&text).ok() // corrupt JSON -> None, never a crash
    };
    // Main slot first; fall back through the backup rotation (newest first).
    // A backup is only useful if it can restore.
    let mut doc = valid_doc(read("doc.json"));
    let mut recovered = false;
    if doc.is_none() {
        for name in ["doc.backup.1.json", "doc.backup.2.json", "doc.backup.3.json"] {
            doc = valid_doc(read(name));
            if doc.is_some() {
                recovered = true;
                break;
            }
        }
    }
    // Legacy single-slot backup from v1 installs.
    if doc.is_none() {
        doc = valid_doc(read("doc.backup.json"));
        if doc.is_some() {
            recovered = true;
        }
    }
    Ok(Persisted {
        doc,
        prefs: read("prefs.json"),
        recovered,
    })
}

#[tauri::command]
fn blunted_save(
    app: AppHandle,
    doc: serde_json::Value,
    prefs: serde_json::Value,
) -> Result<(), String> {
    let dir = data_dir(&app)?;
    let doc_path = dir.join("doc.json");
    if doc_path.exists() {
        // rotate last-good backups: .3 <- .2 <- .1 <- current doc
        let _ = fs::remove_file(dir.join("doc.backup.3.json"));
        let _ = fs::rename(dir.join("doc.backup.2.json"), dir.join("doc.backup.3.json"));
        let _ = fs::rename(dir.join("doc.backup.1.json"), dir.join("doc.backup.2.json"));
        let _ = fs::copy(&doc_path, dir.join("doc.backup.1.json"));
    }
    atomic_write(
        &doc_path,
        &serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?,
    )?;
    atomic_write(
        &dir.join("prefs.json"),
        &serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?,
    )?;
    Ok(())
}

#[tauri::command]
fn blunted_clear(app: AppHandle) -> Result<(), String> {
    let dir = data_dir(&app)?;
    for name in [
        "doc.json",
        "doc.backup.1.json",
        "doc.backup.2.json",
        "doc.backup.3.json",
        "doc.backup.json",
        "prefs.json",
    ] {
        let _ = fs::remove_file(dir.join(name));
    }
    Ok(())
}

#[tauri::command]
fn blunted_open_file(app: AppHandle) -> Result<Option<OpenFile>, String> {
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
fn blunted_save_as(app: AppHandle, name: String, content: String) -> Result<bool, String> {
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
            &MenuItem::with_id(
                app,
                "font-inc",
                "Increase Font Size",
                true,
                Some("CmdOrCtrl+Plus"),
            )?,
            &MenuItem::with_id(
                app,
                "font-dec",
                "Decrease Font Size",
                true,
                Some("CmdOrCtrl+Minus"),
            )?,
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
    Menu::with_items(app, &[&file, &edit, &view, &help])
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            blunted_load,
            blunted_save,
            blunted_clear,
            blunted_open_file,
            blunted_save_as,
            blunted_copy
        ])
        .menu(build_menu)
        .on_menu_event(|app, event| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.emit("blunted-menu", event.id.as_ref());
            }
        })
        .run(tauri::generate_context!())
        .expect("blunted failed to start");
}
