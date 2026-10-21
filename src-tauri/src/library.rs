//! Independent article files. Titles never participate in paths.
use serde::Serialize;
use serde_json::Value;
use std::{fs, path::Path};

#[derive(Serialize)]
pub struct Library {
    pub articles: Vec<Value>,
    pub recovered: Vec<String>,
}

// Read the old single-draft pointer and its backups, including title-derived names.
pub fn read_legacy(root: &Path) -> (Option<Value>, bool) {
    let pointer =
        fs::read_to_string(root.join("current-draft.txt")).unwrap_or_else(|_| "doc.json".into());
    let candidate = pointer.trim();
    let name = if Path::new(candidate).file_name().and_then(|s| s.to_str()) == Some(candidate)
        && candidate.ends_with(".json")
    {
        candidate
    } else {
        "doc.json"
    };
    let stem = name.strip_suffix(".json").unwrap_or(name);
    let mut names = vec![name.to_string()];
    names.extend((1..=3).map(|n| format!("{stem}.backup.{n}.json")));
    names.push("doc.backup.json".into());
    for (i, name) in names.iter().enumerate() {
        let doc = fs::read_to_string(root.join(name))
            .ok()
            .and_then(|s| serde_json::from_str::<Value>(&s).ok());
        if doc
            .as_ref()
            .is_some_and(|v| v.get("body").is_some_and(Value::is_string))
        {
            return (doc, i > 0);
        }
    }
    (None, false)
}

pub fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 100 && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
}
pub fn validate(doc: &Value) -> Result<&str, String> {
    let id = doc
        .get("id")
        .and_then(Value::as_str)
        .ok_or("Missing article ID")?;
    if !valid_id(id)
        || !doc.get("body").is_some_and(Value::is_string)
        || !doc.get("title").is_some_and(Value::is_string)
    {
        return Err("Invalid article".into());
    }
    Ok(id)
}
// Write and flush before replacing. std::fs::rename replaces a file on Mac and Windows.
fn write(path: &Path, value: &str) -> Result<(), String> {
    use std::io::Write;
    let tmp = path.with_extension("tmp");
    let mut file = fs::File::create(&tmp).map_err(|e| e.to_string())?;
    file.write_all(value.as_bytes())
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())?;
    fs::rename(tmp, path).map_err(|e| e.to_string())
}
fn read(path: &Path) -> Option<Value> {
    let doc: Value = serde_json::from_str(&fs::read_to_string(path).ok()?).ok()?;
    validate(&doc).ok()?;
    Some(doc)
}
pub fn save(root: &Path, doc: &Value) -> Result<(), String> {
    let id = validate(doc)?;
    let dir = root.join("articles");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{id}.json"));
    if read(&path).is_some() {
        for n in (1..=2).rev() {
            let source = dir.join(format!("{id}.backup.{n}.json"));
            if source.exists() {
                fs::copy(&source, dir.join(format!("{id}.backup.{}.json", n + 1)))
                    .map_err(|e| e.to_string())?;
            }
        }
        fs::copy(&path, dir.join(format!("{id}.backup.1.json"))).map_err(|e| e.to_string())?;
    }
    write(
        &path,
        &serde_json::to_string_pretty(doc).map_err(|e| e.to_string())?,
    )
}
pub fn load(root: &Path, legacy: Option<Value>) -> Result<Library, String> {
    let dir = root.join("articles");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let marker = dir.join("migration-v1.done");
    if !marker.exists() {
        if let Some(mut doc) = legacy {
            // Deterministic ID makes retry after a crash safe; original legacy files remain untouched.
            doc["id"] = Value::String("legacy-draft".into());
            if !doc.get("title").is_some_and(Value::is_string) {
                doc["title"] = Value::String("Recovered draft".into());
            }
            if !dir.join("legacy-draft.json").exists() {
                save(root, &doc)?;
            }
        }
        write(&marker, "migrated")?;
    }
    let mut ids = std::collections::BTreeSet::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().into_owned();
        if let Some(stem) = name.strip_suffix(".json") {
            let id = stem.split(".backup.").next().unwrap_or(stem);
            if valid_id(id) {
                ids.insert(id.to_string());
            }
        }
    }
    let mut result = Library {
        articles: vec![],
        recovered: vec![],
    };
    for id in ids {
        let mut doc = read(&dir.join(format!("{id}.json")));
        if doc.is_none() {
            for n in 1..=3 {
                doc = read(&dir.join(format!("{id}.backup.{n}.json")));
                if doc.is_some() {
                    result.recovered.push(id.clone());
                    break;
                }
            }
        }
        let doc = doc.ok_or_else(|| format!("Article {id} is unreadable and no backup worked. Original files have been preserved."))?;
        if doc.get("id").and_then(Value::as_str) != Some(&id) {
            return Err(format!("Article {id} has mismatched identity"));
        }
        result.articles.push(doc);
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    static NEXT_ROOT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    fn root() -> std::path::PathBuf {
        let p = std::env::temp_dir().join(format!(
            "blunted-library-{}-{}-{}",
            std::process::id(),
            NEXT_ROOT.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&p).unwrap();
        p
    }
    fn doc(id: &str, body: &str) -> Value {
        serde_json::json!({"id":id,"body":body,"title":"Same title","createdAt":"today","updatedAt":"today"})
    }
    #[test]
    fn legacy_named_pointer_and_backups_migrate_into_a_new_folder() {
        let old = root();
        let new = root();
        fs::write(old.join("current-draft.txt"), "Opening sentence.json").unwrap();
        fs::write(old.join("Opening sentence.json"), "corrupt").unwrap();
        fs::write(
            old.join("Opening sentence.backup.1.json"),
            serde_json::to_string(&doc("old", "Recovered legacy content")).unwrap(),
        )
        .unwrap();
        let (legacy, recovered) = read_legacy(&old);
        assert!(recovered);
        assert_eq!(
            load(&new, legacy).unwrap().articles[0]["body"],
            "Recovered legacy content"
        );
        assert_eq!(
            fs::read_to_string(old.join("Opening sentence.json")).unwrap(),
            "corrupt"
        );
        fs::remove_dir_all(old).unwrap();
        fs::remove_dir_all(new).unwrap();
    }
    #[test]
    fn migration_and_same_titles_are_independent() {
        let r = root();
        let a = load(&r, Some(doc("old", "legacy"))).unwrap();
        assert_eq!(a.articles.len(), 1);
        save(&r, &doc("second", "other")).unwrap();
        assert_eq!(
            load(&r, Some(doc("old", "changed")))
                .unwrap()
                .articles
                .len(),
            2
        );
        assert_eq!(
            read(&r.join("articles/legacy-draft.json")).unwrap()["body"],
            "legacy"
        );
        fs::remove_dir_all(r).unwrap();
    }
    #[test]
    fn corrupt_or_missing_main_recovers_and_trash_survives() {
        let r = root();
        let mut a = doc("one", "first");
        save(&r, &a).unwrap();
        a["body"] = "second".into();
        a["trashedAt"] = "today".into();
        save(&r, &a).unwrap();
        save(&r, &a).unwrap();
        fs::write(r.join("articles/one.json"), "broken").unwrap();
        let l = load(&r, None).unwrap();
        assert_eq!(l.recovered, vec!["one"]);
        assert_eq!(l.articles[0]["trashedAt"], "today");
        fs::remove_file(r.join("articles/one.json")).unwrap();
        assert_eq!(load(&r, None).unwrap().articles.len(), 1);
        fs::remove_dir_all(r).unwrap();
    }
    #[test]
    fn invalid_paths_and_write_failure() {
        let r = root();
        assert!(save(&r, &doc("../escape", "bad")).is_err());
        fs::write(r.join("articles"), "blocked").unwrap();
        assert!(save(&r, &doc("one", "retained in caller")).is_err());
        fs::remove_dir_all(r).unwrap();
    }
    #[test]
    fn unreadable_article_fails_without_destroying_original() {
        let r = root();
        fs::create_dir(r.join("articles")).unwrap();
        fs::write(r.join("articles/one.json"), "broken").unwrap();
        assert!(load(&r, None).is_err());
        assert_eq!(
            fs::read_to_string(r.join("articles/one.json")).unwrap(),
            "broken"
        );
        fs::remove_dir_all(r).unwrap();
    }
}
