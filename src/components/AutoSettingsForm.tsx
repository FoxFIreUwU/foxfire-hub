// AutoSettingsForm.tsx — автоматическая форма настроек, построенная по
// configSchema виджета. Раньше жила прямо внутри WidgetModal, теперь это
// отдельный переиспользуемый компонент: он нужен в разделе "Загруженное"
// (WidgetSettingsPanel) для виджетов БЕЗ собственной встроенной страницы
// настроек (settingsEntry) — см. SYSTEM_WIDGET_STYLE.md, раздел 11.
import { ConfigSchema, WidgetConfigValues } from "../types/widget";

interface AutoSettingsFormProps {
  schema: ConfigSchema;
  configValues: WidgetConfigValues;
  onConfigChange: (key: string, value: string | number | boolean) => void;
}

export default function AutoSettingsForm({ schema, configValues, onConfigChange }: AutoSettingsFormProps) {
  return (
    <div className="flex flex-col gap-3">
      {Object.entries(schema).map(([key, field]) => {
        const value = configValues[key] ?? field.default;
        return (
          <label key={key} className="flex items-center justify-between gap-3 text-sm text-warmwhite/80">
            <span>{field.label}</span>

            {field.type === "color" && (
              <input
                type="color"
                value={String(value)}
                onChange={(e) => onConfigChange(key, e.target.value)}
                className="h-8 w-12 cursor-pointer rounded-md border border-border bg-transparent"
              />
            )}

            {field.type === "number" && (
              <input
                type="number"
                value={Number(value)}
                onChange={(e) => onConfigChange(key, Number(e.target.value))}
                className="w-24 rounded-md border border-border bg-card px-2 py-1 text-right text-warmwhite outline-none focus:border-accent-fire/50"
              />
            )}

            {field.type === "text" && (
              <input
                type="text"
                value={String(value)}
                onChange={(e) => onConfigChange(key, e.target.value)}
                className="w-40 rounded-md border border-border bg-card px-2 py-1 text-warmwhite outline-none focus:border-accent-fire/50"
              />
            )}

            {field.type === "boolean" && (
              <button
                onClick={() => onConfigChange(key, !value)}
                className={`h-6 w-11 rounded-full transition-colors ${value ? "bg-accent-fire" : "bg-white/10"}`}
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
                className="rounded-md border border-border bg-card px-2 py-1 text-warmwhite outline-none focus:border-accent-fire/50"
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
  );
}
