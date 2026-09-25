import { WidgetVersion } from "../types/widget";

// Сортирует версии от новых к старым по releaseDate (строки вида "YYYY-MM-DD"
// сравниваются как обычные строки — это работает благодаря такому формату даты).
export function sortVersionsDesc(versions: WidgetVersion[]): WidgetVersion[] {
  return [...versions].sort((a, b) => {
    if (a.releaseDate === b.releaseDate) return 0;
    return a.releaseDate > b.releaseDate ? -1 : 1;
  });
}

// Версия, которая должна быть выбрана по умолчанию: самая новая среди status === "stable".
// Если стабильных версий нет — берём просто самую новую версию из всех.
export function getDefaultVersion(versions: WidgetVersion[]): WidgetVersion {
  const sorted = sortVersionsDesc(versions);
  const stable = sorted.find((v) => v.status === "stable");
  return stable ?? sorted[0];
}
