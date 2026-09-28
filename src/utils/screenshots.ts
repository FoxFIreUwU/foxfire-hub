// screenshots.ts — загрузка галереи скриншотов виджета.
//
// Раньше галерея строилась только из previewUrl (обложки) и моковых картинок из
// data/mockScreenshots.ts, поэтому у реальных виджетов было видно одну обложку,
// а остальные файлы из папки screenshots/ игнорировались. Теперь порядок такой:
//
//   1. Если в манифесте есть явный список `screenshots` — берём его (быстро, без
//      запросов к GitHub API и без лимитов).
//   2. Иначе читаем папку widgets/<id>/screenshots через GitHub Contents API —
//      именно так описано в SYSTEM_WIDGET_STYLE.md, раздел 1. Владелец, репозиторий
//      и ветка берутся из REGISTRY_URL, отдельно ничего настраивать не нужно.
//   3. Если API недоступен (нет сети, лимит 60 запросов в час без токена) —
//      остаётся то, что есть: previewUrl и/или моковые картинки.
//
// Результат кэшируется на время работы приложения, чтобы не долбить API при каждом
// открытии модалки.
import { useEffect, useState } from "react";
import { REGISTRY_URL } from "../appConfig";
import { getScreenshotsFor } from "../data/mockScreenshots";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i;

interface RepoLocation {
  owner: string;
  repo: string;
  branch: string;
}

// https://raw.githubusercontent.com/OWNER/REPO/refs/heads/BRANCH/registry.json
// https://raw.githubusercontent.com/OWNER/REPO/BRANCH/registry.json
function parseRegistryUrl(url: string): RepoLocation | null {
  const match = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+)\/([^/]+)\/(?:refs\/heads\/)?([^/]+)\//);
  if (!match) return null;
  return { owner: match[1], repo: match[2], branch: match[3] };
}

const cache = new Map<string, string[]>();
const inFlight = new Map<string, Promise<string[]>>();

async function fetchFromGithub(widgetId: string): Promise<string[]> {
  const loc = parseRegistryUrl(REGISTRY_URL);
  if (!loc) return [];

  const apiUrl =
    `https://api.github.com/repos/${loc.owner}/${loc.repo}` +
    `/contents/widgets/${encodeURIComponent(widgetId)}/screenshots?ref=${encodeURIComponent(loc.branch)}`;

  const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) throw new Error(`GitHub API: ${response.status}`);

  const files = (await response.json()) as Array<{ name: string; type: string; download_url: string | null }>;
  if (!Array.isArray(files)) return [];

  return files
    .filter((f) => f.type === "file" && IMAGE_EXT.test(f.name) && f.download_url)
    // "01.png" < "02.png" < "10.png" — числовая сортировка, чтобы порядок был как задумал автор.
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    .map((f) => f.download_url as string);
}

function loadRemoteScreenshots(widgetId: string): Promise<string[]> {
  const cached = cache.get(widgetId);
  if (cached) return Promise.resolve(cached);

  const pending = inFlight.get(widgetId);
  if (pending) return pending;

  const promise = fetchFromGithub(widgetId)
    .then((urls) => {
      cache.set(widgetId, urls);
      return urls;
    })
    .finally(() => inFlight.delete(widgetId));
  inFlight.set(widgetId, promise);
  return promise;
}

// Склеивает списки без повторов, сохраняя порядок: обложка (previewUrl) всегда первая.
function mergeUnique(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const list of lists) {
    for (const url of list) {
      if (!seen.has(url)) {
        seen.add(url);
        result.push(url);
      }
    }
  }
  return result;
}

// Хук для модалки виджета: сразу отдаёт то, что известно без сети (обложку/моки),
// а когда список с GitHub загрузится — дополняет галерею.
export function useWidgetScreenshots(
  widgetId: string,
  previewUrl?: string,
  manifestScreenshots?: string[]
): { screenshots: string[]; loading: boolean } {
  const local = getScreenshotsFor(widgetId, previewUrl);
  const explicit = manifestScreenshots && manifestScreenshots.length > 0 ? manifestScreenshots : null;

  const [remote, setRemote] = useState<string[]>(() => cache.get(widgetId) ?? []);
  const [loading, setLoading] = useState<boolean>(() => !explicit && !cache.has(widgetId));

  useEffect(() => {
    if (explicit) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setRemote(cache.get(widgetId) ?? []);
    setLoading(!cache.has(widgetId));
    loadRemoteScreenshots(widgetId)
      .then((urls) => {
        if (!cancelled) setRemote(urls);
      })
      .catch(() => {
        // Нет сети / лимит GitHub API — молча остаёмся с обложкой и моками.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // explicit сравниваем по содержимому через join — сам массив может пересоздаваться.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId, explicit ? explicit.join("|") : ""]);

  const screenshots = explicit
    ? mergeUnique(previewUrl ? [previewUrl] : [], explicit)
    : mergeUnique(previewUrl ? [previewUrl] : [], remote, local);

  return { screenshots, loading };
}
