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
use std::time::Duration;

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

// ===== YouTube: бесплатный поиск текущей трансляции по каналу (для виджета
// unified-chat, см. widgets/unified-chat в репозитории foxfire-hub-widgets) =====
//
// У YouTube есть человеческая ссылка "/@handle/live" (или "/channel/UC.../live"),
// которая делает редирект прямо на текущий эфир, если он идёт — точно так же
// работает кнопка "Live" на самом канале. Из браузерного JS внутри виджета этот
// запрос сделать нельзя (CORS блокирует чтение итогового адреса кросс-доменного
// редиректа), а вот из Rust — можно, тут никакого CORS нет. Это НЕ официальный
// Data API и не тратит квоту ключа: просто один обычный HTTP GET, ровно то же
// самое, что делает браузер, когда человек сам кликает "Live" на канале.
//
// Если трансляции нет — YouTube просто не делает редирект на /watch, и функция
// возвращает Ok(None) (это нормальный, а не ошибочный случай).
fn normalize_youtube_channel_input(raw: &str) -> Result<String, String> {
    let input = raw.trim();
    if input.is_empty() {
        return Err("Не указан канал YouTube".to_string());
    }

    // Полная ссылка на канал — вытаскиваем часть пути после youtube.com/.
    if let Some(pos) = input.find("youtube.com/") {
        let mut path = input[pos + "youtube.com/".len()..].to_string();
        if let Some(q) = path.find(['?', '#']) {
            path.truncate(q);
        }
        let path = path.trim_matches('/');
        let first_segment = path.split('/').next().unwrap_or("").to_string();
        if !first_segment.is_empty() {
            return Ok(first_segment);
        }
    }

    // Уже похоже на handle (@name) или на ID канала (UC...) — используем как есть.
    if input.starts_with('@') || input.starts_with("UC") {
        return Ok(input.to_string());
    }

    // Иначе считаем, что это просто handle без "@" — добавляем сами, так
    // пользователю не нужно помнить точный формат.
    Ok(format!("@{input}"))
}

#[tauri::command]
fn resolve_youtube_live_video(channel: String) -> Result<Option<String>, String> {
    let segment = normalize_youtube_channel_input(&channel)?;
    let url = format!("https://www.youtube.com/{segment}/live");

    let client = reqwest::blocking::Client::builder()
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) FoxFireHub/1.0 Safari/537.36")
        .build()
        .map_err(|e| format!("Не удалось создать HTTP-клиент: {e}"))?;

    let response = client
        .get(&url)
        .send()
        .map_err(|e| format!("Не удалось обратиться к YouTube: {e}"))?;

    let final_url = response.url().to_string();

    if let Some(idx) = final_url.find("watch?v=") {
        let rest = &final_url[idx + "watch?v=".len()..];
        let video_id: String = rest.chars().take_while(|c| *c != '&').collect();
        if video_id.len() >= 8 {
            return Ok(Some(video_id));
        }
    }

    // Редиректа на /watch не случилось — эфира сейчас нет, это не ошибка.
    Ok(None)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            download_and_extract_widget,
            remove_widget_dir,
            resolve_youtube_live_video
        ])
        .run(tauri::generate_context!())
        .expect("Ошибка при запуске приложения Tauri");
}
