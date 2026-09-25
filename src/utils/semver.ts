// semver.ts — простое сравнение версий вида "1.2.0" или "0.1.0-alpha.1".
// Не претендует на 100% соответствие спецификации semver.org, но покрывает
// всё, что нужно FoxFire Hub: сравнение мажор.минор.патч и стадий
// (alpha < beta < rc < релиз без суффикса).

// Порядок "серьёзности" стадии — чем больше число, тем ближе к финальному релизу.
const STAGE_WEIGHT: Record<string, number> = {
  alpha: 0,
  beta: 1,
  rc: 2
};

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  stageWeight: number; // 3 = обычный релиз без суффикса (самый "старший")
  stageNumber: number; // число после стадии, например "alpha.2" -> 2
}

// Разбирает строку версии на составные части. Если строка пустая или её не
// получилось разобрать — возвращает null, вызывающий код должен решить, что
// делать дальше (обычно — считать версии несравнимыми и не блокировать ничего).
export function parseVersion(raw: string | undefined | null): ParsedVersion | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/^v/i, "");
  const [core, stagePart] = trimmed.split("-");
  const parts = core.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length < 2 || parts.some((n) => Number.isNaN(n))) return null;

  const [major, minor, patch = 0] = parts;

  if (!stagePart) {
    return { major, minor, patch, stageWeight: 3, stageNumber: 0 };
  }

  const [stageName, stageNumRaw] = stagePart.split(".");
  const stageWeight = STAGE_WEIGHT[stageName.toLowerCase()] ?? 3;
  const stageNumber = Number.parseInt(stageNumRaw ?? "0", 10) || 0;

  return { major, minor, patch, stageWeight, stageNumber };
}

// Сравнивает две версии. Возвращает:
//   отрицательное число, если a < b
//   0, если версии равны (или обе не распознаны)
//   положительное число, если a > b
export function compareVersions(a: string, b: string): number {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (!va || !vb) return 0;

  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  if (va.patch !== vb.patch) return va.patch - vb.patch;
  if (va.stageWeight !== vb.stageWeight) return va.stageWeight - vb.stageWeight;
  return va.stageNumber - vb.stageNumber;
}

// true, если версия a строго новее версии b.
export function isNewerVersion(a: string, b: string): boolean {
  return compareVersions(a, b) > 0;
}

// true, если version >= min (когда min указан) и version <= max (когда max указан).
// Если min/max не заданы — ограничения по ним нет. Если саму version не удалось
// разобрать, по умолчанию считаем её подходящей (не блокируем пользователя из-за
// нашей же ошибки разбора строки).
export function satisfiesRange(version: string, min?: string, max?: string): boolean {
  if (!parseVersion(version)) return true;
  if (min && compareVersions(version, min) < 0) return false;
  if (max && compareVersions(version, max) > 0) return false;
  return true;
}
