import { LayoutGrid, Compass, Gamepad2, HardDrive, Sliders } from "lucide-react";
import { NavSection } from "../types/widget";

interface BottomNavProps {
  active: NavSection;
  onChange: (section: NavSection) => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: typeof LayoutGrid }[] = [
  { id: "mods", label: "Моды", icon: LayoutGrid },
  { id: "overview", label: "Обзор", icon: Compass },
  { id: "games", label: "Игры", icon: Gamepad2 },
  { id: "downloaded", label: "Загруженное", icon: HardDrive },
  { id: "settings", label: "Настройки", icon: Sliders }
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-20 border-t border-border bg-appbg2/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-4 py-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-1 rounded-xl px-4 py-1.5 transition-colors"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
                  isActive
                    ? "border-accent-fire/40 bg-accent-fire/15 text-accent-fire shadow-glow-sm"
                    : "border-transparent text-muted"
                }`}
              >
                <Icon size={19} />
              </span>
              <span className={`text-[11px] font-medium ${isActive ? "text-accent-fire" : "text-muted"}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
