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
    needs_folder: bool,
}

fn default_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("blunted");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn configured_dir(app: &AppHandle) -> Result<Option<PathBuf>, String> {
    let path = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("blunted-folder.txt");
    let value = match fs::read_to_string(path) {
        Ok(v) => v,
        Err(_) => return Ok(None),
    };
    let dir = PathBuf::from(value.trim());
    if dir.is_dir() {
        Ok(Some(dir))
    } else {
        Ok(None)
    }
}

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = configured_dir(app)?.unwrap_or(default_dir(app)?);
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
    let configured = configured_dir(&app)?;
    let legacy = default_dir(&app)?;
    let dir = configured.clone().unwrap_or(legacy.clone());
    let read = |name: &str| -> Option<serde_json::Value> {
        let text = fs::read_to_string(dir.join(name)).ok()?;
        serde_json::from_str(&text).ok() // corrupt JSON -> None, never a crash
    };
    // Main slot first; fall back through the backup rotation (newest first).
    // A backup is only useful if it can restore.
    let current_name =
        fs::read_to_string(dir.join("current-draft.txt")).unwrap_or_else(|_| "doc.json".into());
    let candidate = current_name.trim();
    let current_name = if PathBuf::from(candidate)
        .file_name()
        .and_then(|v| v.to_str())
        == Some(candidate)
        && candidate.ends_with(".json")
    {
        candidate.to_string()
    } else {
        "doc.json".into()
    };
    let stem = current_name.strip_suffix(".json").unwrap_or(&current_name);
    let mut doc = valid_doc(read(&current_name));
    let mut recovered = false;
    if doc.is_none() {
        let backups = [
            format!("{}.backup.1.json", stem),
            format!("{}.backup.2.json", stem),
            format!("{}.backup.3.json", stem),
        ];
        for name in backups {
            doc = valid_doc(read(&name));
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
    if doc.is_none() && configured.is_some() {
        let old = fs::read_to_string(legacy.join("doc.json"))
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok());
        doc = valid_doc(old);
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
    })
}

#[tauri::command]
fn blunted_choose_folder(app: AppHandle) -> Result<Option<String>, String> {
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
    fs::create_dir_all(path).map_err(|e| e.to_string())?;
    let config = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&config).map_err(|e| e.to_string())?;
    atomic_write(&config.join("blunted-folder.txt"), &path.to_string_lossy())?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn blunted_save(
    app: AppHandle,
    doc: serde_json::Value,
    prefs: serde_json::Value,
) -> Result<(), String> {
    let dir = data_dir(&app)?;
    let body = doc.get("body").and_then(|v| v.as_str()).unwrap_or("");
    let title = body
        .lines()
        .find(|line| !line.trim().is_empty())
        .unwrap_or("untitled");
    let mut stem: String = title
        .chars()
        .filter(|c| {
            !matches!(
                c,
                '\\' | '/'
                    | ':'
                    | '*'
                    | '?'
                    | '"'
                    | '<'
                    | '>'
                    | '|'
                    | '#'
                    | '%'
                    | '&'
                    | '{'
                    | '}'
                    | '$'
                    | '!'
                    | '@'
                    | '+'
                    | '`'
                    | '='
            )
        })
        .take(48)
        .collect();
    stem = stem.trim().trim_end_matches(['.', ' ']).to_string();
    if stem.is_empty() {
        stem = "untitled".into();
    }
    if [
        "con", "prn", "aux", "nul", "com1", "com2", "com3", "com4", "com5", "com6", "com7", "com8",
        "com9", "lpt1", "lpt2", "lpt3", "lpt4", "lpt5", "lpt6", "lpt7", "lpt8", "lpt9",
    ]
    .contains(&stem.to_lowercase().as_str())
    {
        stem.insert(0, '_');
    }
    let doc_name = format!("{}.json", stem);
    let doc_path = dir.join(&doc_name);
    let old_name =
        fs::read_to_string(dir.join("current-draft.txt")).unwrap_or_else(|_| "doc.json".into());
    let old_candidate = old_name.trim();
    let old_name = if PathBuf::from(old_candidate)
        .file_name()
        .and_then(|v| v.to_str())
        == Some(old_candidate)
        && old_candidate.ends_with(".json")
    {
        old_candidate.to_string()
    } else {
        "doc.json".into()
    };
    let old_stem = old_name
        .strip_suffix(".json")
        .unwrap_or(&old_name)
        .to_string();
    if old_name != doc_name && dir.join(&old_name).exists() {
        if doc_path.exists() {
            let _ = fs::remove_file(&doc_path);
        }
        fs::rename(dir.join(&old_name), &doc_path).map_err(|e| e.to_string())?;
        for n in 1..=3 {
            let old_backup = dir.join(format!("{}.backup.{}.json", old_stem, n));
            let new_backup = dir.join(format!("{}.backup.{}.json", stem, n));
            if old_backup.exists() {
                if new_backup.exists() {
                    let _ = fs::remove_file(&new_backup);
                }
                let _ = fs::rename(old_backup, new_backup);
            }
        }
    }
    if doc_path.exists() {
        // rotate last-good backups: .3 <- .2 <- .1 <- current doc
        let _ = fs::remove_file(dir.join(format!("{}.backup.3.json", stem)));
        let _ = fs::rename(
            dir.join(format!("{}.backup.2.json", stem)),
            dir.join(format!("{}.backup.3.json", stem)),
        );
        let _ = fs::rename(
            dir.join(format!("{}.backup.1.json", stem)),
            dir.join(format!("{}.backup.2.json", stem)),
        );
        let _ = fs::copy(&doc_path, dir.join(format!("{}.backup.1.json", stem)));
    }
    atomic_write(
        &doc_path,
        &serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())?,
    )?;
    atomic_write(
        &dir.join("prefs.json"),
        &serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?,
    )?;
    atomic_write(&dir.join("current-draft.txt"), &doc_name)?;
    Ok(())
}

#[tauri::command]
fn blunted_clear(app: AppHandle) -> Result<(), String> {
    let mut dirs = vec![data_dir(&app)?];
    let legacy = default_dir(&app)?;
    if !dirs.contains(&legacy) {
        dirs.push(legacy);
    }
    for dir in dirs {
        if let Ok(name) = fs::read_to_string(dir.join("current-draft.txt")) {
            let candidate = name.trim();
            let name = if PathBuf::from(candidate)
                .file_name()
                .and_then(|v| v.to_str())
                == Some(candidate)
                && candidate.ends_with(".json")
            {
                candidate
            } else {
                "doc.json"
            };
            let _ = fs::remove_file(dir.join(name));
            let stem = name.strip_suffix(".json").unwrap_or(name);
            for n in 1..=3 {
                let _ = fs::remove_file(dir.join(format!("{}.backup.{}.json", stem, n)));
            }
        }
        for name in [
            "doc.json",
            "doc.backup.1.json",
            "doc.backup.2.json",
            "doc.backup.3.json",
            "doc.backup.json",
            "prefs.json",
            "current-draft.txt",
        ] {
            let _ = fs::remove_file(dir.join(name));
        }
    }
    let folder_config = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?
        .join("blunted-folder.txt");
    let _ = fs::remove_file(folder_config);
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
            blunted_choose_folder,
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
