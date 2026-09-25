// Этот файл — точка входа десктопного приложения (Rust-часть Tauri).
// Кроме открытия окна, здесь же две команды, которые вызывает интерфейс
// (через invoke), чтобы РЕАЛЬНО скачивать и удалять файлы виджетов на диске:
// download_and_extract_widget и remove_widget_dir. Сама логика "что после
// этого считать установленным" и где хранятся настройки — в JS,
// src/utils/localState.ts (см. также SYSTEM_RULES.md, раздел 8).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::io::Cursor;
use std::path::{Path, PathBuf};

// Скачивает zip-архив виджета по ссылке downloadUrl (поле downloadUrl версии
// в widget.manifest.json) и распаковывает его в папку dest_dir. Если в этой
// папке уже что-то было (переустановка/обновление до другой версии) — сначала
// полностью её очищает, чтобы не оставались файлы от старой версии.
#[tauri::command]
fn download_and_extract_widget(url: String, dest_dir: String) -> Result<(), String> {
    let dest = PathBuf::from(&dest_dir);

    let response = reqwest::blocking::get(&url).map_err(|e| format!("Не удалось скачать файл: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("Сервер вернул ошибку {}", response.status()));
    }
    let bytes = response
        .bytes()
        .map_err(|e| format!("Не удалось прочитать скачанный файл: {e}"))?;

    if dest.exists() {
        fs::remove_dir_all(&dest).map_err(|e| format!("Не удалось очистить старую версию: {e}"))?;
    }
    fs::create_dir_all(&dest).map_err(|e| format!("Не удалось создать папку установки: {e}"))?;

    let mut archive = zip::ZipArchive::new(Cursor::new(bytes))
        .map_err(|e| format!("Скачанный файл — не рабочий zip-архив: {e}"))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Повреждённая запись внутри архива: {e}"))?;

        // enclosed_name() сама отбрасывает опасные пути вида "../../что-то" —
        // так виджет не может записать файл за пределы своей папки установки.
        let out_path = match entry.enclosed_name() {
            Some(path) => dest.join(path),
            None => continue,
        };

        if entry.name().ends_with('/') {
            fs::create_dir_all(&out_path).map_err(|e| format!("Не удалось создать папку: {e}"))?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("Не удалось создать папку: {e}"))?;
            }
            let mut out_file =
                fs::File::create(&out_path).map_err(|e| format!("Не удалось записать файл на диск: {e}"))?;
            std::io::copy(&mut entry, &mut out_file)
                .map_err(|e| format!("Не удалось записать файл на диск: {e}"))?;
        }
    }

    Ok(())
}

// Удаляет папку с файлами установленного виджета. Используется и при полном
// удалении, и при удалении "с сохранением настроек" — сами настройки виджета
// хранятся отдельно, в foxfire-state.json (не в этой папке), поэтому в обоих
// случаях достаточно просто стереть папку с файлами.
#[tauri::command]
fn remove_widget_dir(dir: String) -> Result<(), String> {
    let path = Path::new(&dir);
    if path.exists() {
        fs::remove_dir_all(path).map_err(|e| format!("Не удалось удалить папку виджета: {e}"))?;
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            download_and_extract_widget,
            remove_widget_dir
        ])
        .run(tauri::generate_context!())
        .expect("Ошибка при запуске приложения Tauri");
}
