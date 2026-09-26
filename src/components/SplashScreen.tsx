import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

interface SplashScreenProps {
  // true, когда стартовые данные готовы (локальное состояние загружено, а
  // каталог виджетов либо загрузился, либо точно не загрузится — см. App.tsx,
  // isRegistryLoading) и сплэш можно скрывать.
  ready: boolean;
}

// Компактная карточка загрузки по центру окна — без сплошной "шторки" на
// весь экран и без свечения по контуру. Сзади сразу видно окно приложения
// таким, какое оно есть по умолчанию (тёмный фон .app-window), без слоёв
// фона и без самого интерфейса — они спрятаны через opacity в App.tsx и
// плавно проявляются только когда эта карточка исчезает (см. contentReady
// в App.tsx). Так пользовательский фон/тема (см. src/utils/appearance.ts)
// не выскакивает разом вместе с интерфейсом, а мягко "включается" уже после
// полной загрузки.
export default function SplashScreen({ ready }: SplashScreenProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [visible, setVisible] = useState(false); // fade-in карточки при маунте
  const [fading, setFading] = useState(false); // fade-out перед скрытием
  const [mounted, setMounted] = useState(true);

  // Карточка сама плавно появляется при маунте, а не выскакивает разом.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Минимальное время показа — чтобы сплэш не мелькал на долю секунды, если
  // данные вдруг загрузились совсем мгновенно (это выглядело бы как баг, а не
  // как красивая загрузка).
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 700);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && minTimeElapsed) setFading(true);
  }, [ready, minTimeElapsed]);

  useEffect(() => {
    if (!fading) return;
    // Подстраховка на случай, если transitionend по какой-то причине не
    // долетит — убираем сплэш из разметки чуть позже конца fade-out в любом случае.
    const timeout = setTimeout(() => setMounted(false), 500);
    return () => clearTimeout(timeout);
  }, [fading]);

  if (!mounted) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      <div
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && fading) setMounted(false);
        }}
        className={`surface flex h-[190px] w-[320px] flex-shrink-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-[var(--radius-window)] transition-opacity duration-300 ease-out ${
          visible && !fading ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-accent-fire/30 bg-accent-fire/10 text-accent-fire shadow-glow animate-pulse">
          <Flame size={28} />
        </span>

        <div className="flex flex-shrink-0 flex-col items-center gap-1">
          <span className="scanline-text text-base font-extrabold tracking-tight text-warmwhite">FoxFire Hub</span>
          <span className="font-mono-ui text-[11px] text-muted">Загрузка каталога…</span>
        </div>

        <div className="h-1 w-32 flex-shrink-0 overflow-hidden rounded-full bg-white/5">
          <div className="h-full w-1/3 animate-[splash-sweep_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-accent-fire to-transparent" />
        </div>
      </div>
    </div>
  );
}
