import { WidgetVersion } from "../types/widget";
import { compareVersions } from "./semver";

// Сортирует версии от новых к старым — по номеру версии (semver: major.minor.patch
// + стадия alpha/beta/rc), а НЕ по releaseDate.
//
// Раньше тут сравнивались строки releaseDate ("YYYY-MM-DD"). Проблема: если
// две версии выложены в один день (например, забыли поменять дату при повторной
// публикации), a.releaseDate === b.releaseDate давало 0, и сортировка молча
// оставляла версии в том порядке, в котором они лежат в registry.json — то
// есть какая из них "новее" зависело от случая, а не от номера версии. Именно
// это и путало приложение (getDefaultVersion, проверка "update-available" и т.д.).
// Теперь дата вообще не участвует в определении того, что новее — только сам
// номер версии, через compareVersions (см. semver.ts).
export function sortVersionsDesc(versions: WidgetVersion[]): WidgetVersion[] {
  return [...versions].sort((a, b) => compareVersions(b.version, a.version));
}

// Версия, которая должна быть выбрана по умолчанию: самая новая среди status === "stable".
// Если стабильных версий нет — берём просто самую новую версию из всех.
export function getDefaultVersion(versions: WidgetVersion[]): WidgetVersion {
  const sorted = sortVersionsDesc(versions);
  const stable = sorted.find((v) => v.status === "stable");
  return stable ?? sorted[0];
}
