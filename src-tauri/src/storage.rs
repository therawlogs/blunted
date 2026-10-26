//! Storage-boundary operations with filesystem-only fixtures.
use serde::Serialize;
use std::{
    collections::BTreeSet,
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

pub fn configured_path(config: &Path) -> Result<Option<PathBuf>, String> {
    let value = match fs::read_to_string(config) {
        Ok(value) => value,
        Err(error) if error.kind() == ErrorKind::NotFound => {
            return match fs::symlink_metadata(config) {
                Err(error) if error.kind() == ErrorKind::NotFound => Ok(None),
                _ => Err("Library configuration exists but cannot be read".into()),
            };
        }
        Err(error) => return Err(format!("Library configuration is unreadable: {error}")),
    };
    let path = PathBuf::from(value.trim());
    if value.trim().is_empty() || !path.is_absolute() {
        return Err(
            "Library configuration contains an invalid location. Original configuration preserved."
                .into(),
        );
    }
    require_root(&path)?;
    Ok(Some(path))
}

pub fn require_root(path: &Path) -> Result<(), String> {
    if !fs::metadata(path)
        .map_err(|e| format!("Configured library is unavailable: {e}"))?
        .is_dir()
    {
        return Err("Configured library is not a directory".into());
    }
    // Opening the directory proves availability without creating parents.
    fs::read_dir(path).map_err(|e| format!("Configured library is unreadable: {e}"))?;
    Ok(())
}

#[derive(Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ArticleSaveReport {
    pub preferences_saved: bool,
    pub preferences_error: Option<String>,
}
// Article durability and preference durability are distinct acknowledgements.
pub fn save_article(
    root: &Path,
    doc: &serde_json::Value,
    prefs: &serde_json::Value,
) -> Result<ArticleSaveReport, String> {
    crate::library::save(root, doc)?;
    let preferences = (|| -> Result<(), String> {
        let path = root.join("prefs.json");
        let temporary = path.with_extension("tmp");
        fs::write(
            &temporary,
            serde_json::to_string_pretty(prefs).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        fs::rename(&temporary, &path).map_err(|e| e.to_string())
    })();
    Ok(ArticleSaveReport {
        preferences_saved: preferences.is_ok(),
        preferences_error: preferences.err(),
    })
}

#[derive(Serialize, Debug)]
pub struct ClearReport {
    pub status: &'static str,
    pub removed: Vec<String>,
    pub failed: Vec<String>,
}

pub fn clear(dirs: &[PathBuf], config: &Path) -> ClearReport {
    let mut report = ClearReport {
        status: "complete",
        removed: vec![],
        failed: vec![],
    };
    let mut uncertain_partial = false;
    let mut files = BTreeSet::new();
    for dir in dirs {
        let articles = dir.join("articles");
        match fs::remove_dir_all(&articles) {
            Ok(()) => report.removed.push(articles.display().to_string()),
            Err(error) if error.kind() == ErrorKind::NotFound => {}
            Err(error) => {
                // remove_dir_all can remove some children before returning an error.
                uncertain_partial = true;
                report.failed.push(format!(
                    "{}: {error}; some children may have been removed",
                    articles.display()
                ));
            }
        }
        match fs::read_to_string(dir.join("current-draft.txt")) {
            Ok(pointer) => {
                let candidate = pointer.trim();
                if Path::new(candidate).file_name().and_then(|v| v.to_str()) == Some(candidate)
                    && candidate.ends_with(".json")
                {
                    files.insert(dir.join(candidate));
                    let stem = candidate.strip_suffix(".json").unwrap();
                    for n in 1..=3 {
                        files.insert(dir.join(format!("{stem}.backup.{n}.json")));
                    }
                }
            }
            Err(error) if error.kind() == ErrorKind::NotFound => {}
            Err(error) => report.failed.push(format!(
                "{}: could not read draft pointer: {error}",
                dir.display()
            )),
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
            files.insert(dir.join(name));
        }
    }
    for path in files {
        remove_file(&path, &mut report);
    }
    // Keep the selected-root configuration if any intended removal failed. A
    // retry must target the same root rather than silently move to a default.
    if report.failed.is_empty() {
        remove_file(config, &mut report);
    }
    if !report.failed.is_empty() {
        report.status = if report.removed.is_empty() && !uncertain_partial {
            "failed"
        } else {
            "partial"
        };
    }
    report
}
fn remove_file(path: &Path, report: &mut ClearReport) {
    match fs::remove_file(path) {
        Ok(()) => report.removed.push(path.display().to_string()),
        Err(error) if error.kind() == ErrorKind::NotFound => {}
        Err(error) => report.failed.push(format!("{}: {error}", path.display())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn root() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "blunted-storage-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir(&root).unwrap();
        root
    }
    #[test]
    fn absent_invalid_and_missing_configuration_are_distinct() {
        let r = root();
        let config = r.join("config");
        assert_eq!(configured_path(&config).unwrap(), None);
        for bad in ["", "relative/path", "\n"] {
            fs::write(&config, bad).unwrap();
            assert!(configured_path(&config).is_err());
            assert_eq!(fs::read_to_string(&config).unwrap(), bad);
        }
        let missing = r.join("missing");
        fs::write(&config, missing.to_str().unwrap()).unwrap();
        assert!(configured_path(&config).is_err());
        assert!(!missing.exists());
        fs::write(&config, r.to_str().unwrap()).unwrap();
        assert_eq!(configured_path(&config).unwrap(), Some(r.clone()));
        fs::remove_file(&config).unwrap();
        fs::create_dir(&config).unwrap();
        assert!(configured_path(&config).is_err());
        fs::remove_dir_all(r).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn unreadable_config_and_root_preserve_selection_and_files() {
        use std::os::unix::fs::PermissionsExt;
        let r = root();
        let selected = r.join("selected");
        fs::create_dir(&selected).unwrap();
        fs::write(selected.join("original.txt"), "synthetic original").unwrap();
        let config = r.join("config");
        fs::write(&config, selected.to_str().unwrap()).unwrap();
        fs::set_permissions(&config, fs::Permissions::from_mode(0o000)).unwrap();
        let unreadable_config = configured_path(&config);
        fs::set_permissions(&config, fs::Permissions::from_mode(0o600)).unwrap();
        assert!(
            unreadable_config.is_err(),
            "fixture requires unprivileged process"
        );
        fs::set_permissions(&selected, fs::Permissions::from_mode(0o000)).unwrap();
        let unreadable_root = configured_path(&config);
        fs::set_permissions(&selected, fs::Permissions::from_mode(0o700)).unwrap();
        assert!(
            unreadable_root.is_err(),
            "fixture requires unprivileged process"
        );
        assert_eq!(
            fs::read_to_string(&config).unwrap(),
            selected.to_str().unwrap()
        );
        assert_eq!(
            fs::read_to_string(selected.join("original.txt")).unwrap(),
            "synthetic original"
        );
        fs::remove_dir_all(r).unwrap();
    }
    #[test]
    fn durable_article_is_acknowledged_separately_from_failed_preferences() {
        let r = root();
        fs::create_dir(r.join("prefs.json")).unwrap();
        let doc =
            serde_json::json!({"id":"one", "title":"Synthetic article", "body":"Durable writing"});
        let report = save_article(&r, &doc, &serde_json::json!({"theme":"dark"})).unwrap();
        assert!(!report.preferences_saved);
        assert!(report.preferences_error.is_some());
        assert_eq!(
            crate::library::inspect(&r).unwrap().articles[0]["body"],
            "Durable writing"
        );
        fs::remove_dir(r.join("prefs.json")).unwrap();
        let report = save_article(&r, &doc, &serde_json::json!({"theme":"light"})).unwrap();
        assert!(report.preferences_saved);
        assert!(report.preferences_error.is_none());
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(
                &fs::read_to_string(r.join("prefs.json")).unwrap()
            )
            .unwrap()["theme"],
            "light"
        );
        assert!(save_article(
            &r,
            &serde_json::json!({"id":"../invalid"}),
            &serde_json::json!({})
        )
        .is_err());
        fs::remove_dir_all(r).unwrap();
    }
    #[test]
    fn clear_reports_complete_absent_partial_and_failed_without_ignoring_errors() {
        let r = root();
        let config = r.join("config");
        fs::write(&config, "selected").unwrap();
        fs::write(r.join("doc.json"), "synthetic writing").unwrap();
        fs::create_dir(r.join("prefs.json")).unwrap();
        let report = clear(&[r.clone()], &config);
        assert_eq!(report.status, "partial");
        assert_eq!(report.removed.len(), 1);
        assert_eq!(report.failed.len(), 1);
        assert!(config.exists());
        let report = clear(&[r.clone()], &config);
        assert_eq!(report.status, "failed");
        assert!(config.exists());
        fs::remove_dir(r.join("prefs.json")).unwrap();
        let report = clear(&[r.clone()], &config);
        assert_eq!(report.status, "complete");
        assert!(!config.exists());
        assert_eq!(clear(&[r.clone()], &config).status, "complete");
        fs::remove_dir_all(r).unwrap();
    }
    #[test]
    fn clear_removes_named_legacy_copies_only_inside_selected_root() {
        let r = root();
        let config = r.join("config");
        fs::write(&config, "selected").unwrap();
        fs::write(r.join("current-draft.txt"), "Article.json").unwrap();
        for name in [
            "Article.json",
            "Article.backup.1.json",
            "Article.backup.2.json",
            "Article.backup.3.json",
        ] {
            fs::write(r.join(name), "disposable").unwrap();
        }
        fs::write(r.join("unrelated.txt"), "keep").unwrap();
        let report = clear(&[r.clone()], &config);
        assert_eq!(report.status, "complete");
        assert_eq!(report.removed.len(), 6);
        assert!(r.join("unrelated.txt").exists());
        fs::remove_dir_all(r).unwrap();
    }
}
