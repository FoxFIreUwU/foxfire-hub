// Этот файл — точка входа десктопного приложения (Rust-часть Tauri).
// Он просто открывает окно и показывает то, что собрано из React (папка dist/).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("Ошибка при запуске приложения Tauri");
}
