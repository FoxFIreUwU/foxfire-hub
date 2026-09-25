// widgetInstall.ts — вызовы в Rust-часть Tauri, которая реально скачивает и
// удаляет файлы виджета на диске. Сама Rust-логика — src-tauri/src/main.rs.
import { invoke } from "@tauri-apps/api/tauri";

// Скачивает zip-архив по downloadUrl версии виджета и распаковывает его в
// destDir (см. resolveWidgetInstallDir в localState.ts).
export async function downloadAndExtractWidget(url: string, destDir: string): Promise<void> {
  await invoke("download_and_extract_widget", { url, destDir });
}

// Полностью стирает папку с файлами виджета на диске.
export async function removeWidgetDir(dir: string): Promise<void> {
  await invoke("remove_widget_dir", { dir });
}
