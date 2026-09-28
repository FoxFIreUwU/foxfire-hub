// AutoSettingsForm.tsx — автоматическая форма настроек, построенная по
// configSchema виджета. Раньше жила прямо внутри WidgetModal, теперь это
// отдельный переиспользуемый компонент: он нужен в разделе "Загруженное"
// (WidgetSettingsPanel) для виджетов БЕЗ собственной встроенной страницы
// настроек (settingsEntry) — см. SYSTEM_WIDGET_STYLE.md, раздел 11.
//
// Раньше все поля рисовались одним плоским списком подряд, без какого-либо
// визуального деления — при 8-10 настройках это превращалось в мешанину
// строк, непонятно к чему относящихся. Теперь поля группируются по
// необязательному ConfigField.group в отдельные подписанные блоки (как в
// собственных settings.html у более продвинутых виджетов), а сами строки
// получили общий фон блока и разделители между полями вместо "голых" строк
// вперемешку. Виджет, который вообще не указал group ни у одного поля,
// просто получает один блок "Основное" — выглядит так же аккуратно, только
// без деления на разделы.
import { SlidersHorizontal } from "lucide-react";
import { ConfigSchema, WidgetConfigValues } from "../types/widget";

interface AutoSettingsFormProps {
  schema: ConfigSchema;
  configValues: WidgetConfigValues;
  onConfigChange: (key: string, value: string | number | boolean) => void;
}

const UNGROUPED_LABEL = "Основное";

export default function AutoSettingsForm({ schema, configValues, onConfigChange }: AutoSettingsFormProps) {
  // Группируем поля по field.group, сохраняя порядок первого появления —
  // так порядок блоков предсказуемо следует порядку полей в configSchema
  // самого виджета, а не сортируется как-то ещё.
  const groups: { name: string; entries: [string, ConfigSchema[string]][] }[] = [];
  const groupIndex = new Map<string, number>();

  Object.entries(schema).forEach(([key, field]) => {
    const name = field.group?.trim() || UNGROUPED_LABEL;
    let idx = groupIndex.get(name);
    if (idx === undefined) {
      idx = groups.length;
      groupIndex.set(name, idx);
      groups.push({ name, entries: [] });
    }
    groups[idx].entries.push([key, field]);
  });

  // Один общий блок без заголовка групп, если делить настройки не на что —
  // не показываем "Основное" как единственный заголовок, это лишний шум.
  const showGroupHeaders = groups.length > 1 || (groups.length === 1 && groups[0].name !== UNGROUPED_LABEL);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <div key={group.name} className="overflow-hidden rounded-xl border border-border bg-black/20">
          {showGroupHeaders && (
            <div className="flex items-center gap-2 border-b border-border/70 bg-white/[0.03] px-3.5 py-2">
              <SlidersHorizontal size={12} className="text-accent-fire" />
              <span className="font-mono-ui text-[11px] font-semibold uppercase tracking-wider text-accent-fire">
                {group.name}
              </span>
            </div>
          )}
          <div className="divide-y divide-border/50">
            {group.entries.map(([key, field]) => {
              const value = configValues[key] ?? field.default;
              return (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-sm text-warmwhite/80"
                >
                  <span className="min-w-0 flex-1 truncate">{field.label}</span>

                  {field.type === "color" && (
                    <input
                      type="color"
                      value={String(value)}
                      onChange={(e) => onConfigChange(key, e.target.value)}
                      className="h-8 w-12 flex-shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
                    />
                  )}

                  {field.type === "number" && (
                    <input
                      type="number"
                      value={Number(value)}
                      onChange={(e) => onConfigChange(key, Number(e.target.value))}
                      className="w-24 flex-shrink-0 rounded-md border border-border bg-card px-2 py-1 text-right text-warmwhite outline-none focus:border-accent-fire/50"
                    />
                  )}

                  {field.type === "text" && (
                    <input
                      type="text"
                      value={String(value)}
                      onChange={(e) => onConfigChange(key, e.target.value)}
                      className="w-40 flex-shrink-0 rounded-md border border-border bg-card px-2 py-1 text-warmwhite outline-none focus:border-accent-fire/50"
                    />
                  )}

                  {field.type === "boolean" && (
                    <button
                      onClick={() => onConfigChange(key, !value)}
                      className={`h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
                        value ? "bg-accent-fire" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${
                          value ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  )}

                  {field.type === "select" && field.options && (
                    <select
                      value={String(value)}
                      onChange={(e) => onConfigChange(key, e.target.value)}
                      className="flex-shrink-0 rounded-md border border-border bg-card px-2 py-1 text-warmwhite outline-none focus:border-accent-fire/50"
                    >
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
