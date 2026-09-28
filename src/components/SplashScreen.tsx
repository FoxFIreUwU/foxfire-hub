import { useEffect, useRef, useState } from "react";
import splashSoundUrl from "../assets/foxfire-appear.mp3";
import { loadAppearance } from "../utils/appearance";

interface SplashScreenProps {
  // true, когда стартовые данные готовы (локальное состояние загружено, а
  // каталог виджетов либо загрузился, либо точно не загрузится — см. App.tsx,
  // isRegistryLoading) и сплэш можно скрывать.
  ready: boolean;
}

// Та же кривая, что и у остальных "пружинных" переходов в приложении —
// iOS/macOS-стиль: быстрый разгон, мягкое дотормаживание, без резких углов.
const EASE = "cubic-bezier(.22, 1, .36, 1)";
const ANIM_DURATION = "4.03s"; // ровно длина src/assets/foxfire-appear.mp3

// Звук сведён почти впритык к 0дБ (проверено ffmpeg volumedetect на исходнике)
// — на полной системной громкости это било бы по ушам, поэтому громкость
// внутри приложения намеренно ниже. Второй уровень защиты — переключатель
// "Звук при запуске" в разделе "Внешний вид" (AppearanceSettings.tsx →
// settings.splashSound), которым это можно выключить насовсем.
const SAFE_VOLUME = 0.55;

// Минимальное время показа карточки — ровно до конца "звона" после пика на
// 1.08с (см. keyframes в index.css: splash-icon-appear и соседние) — так
// анимация никогда не обрывается на середине, даже если каталог виджетов
// загрузился мгновенно. Раньше здесь было 700мс (под старую анимацию с
// простым пульсом), под новую — сознательно длиннее.
const MIN_VISIBLE_MS = 1650;

// Компактная карточка загрузки по центру окна — без сплошной "шторки" на
// весь экран и без свечения по контуру. Сзади сразу видно окно приложения
// таким, какое оно есть по умолчанию (тёмный фон .app-window), без слоёв
// фона и без самого интерфейса — они спрятаны через opacity в App.tsx и
// плавно проявляются только когда эта карточка исчезает (см. contentReady
// в App.tsx). Так пользовательский фон/тема (см. src/utils/appearance.ts)
// не выскакивает разом вместе с интерфейсом, а мягко "включается" уже после
// полной загрузки.
//
// Сама анимация иконки покадрово разобрана под конкретный звук
// (src/assets/foxfire-appear.mp3) — см. подробный тайминг в комментарии
// над keyframes в index.css. Здесь важно помнить одно: ready может прийти
// и раньше, и позже конца анимации — карточка в любом случае не уйдёт
// раньше MIN_VISIBLE_MS (глушить пик на середине — хуже, чем просто
// подождать лишние доли секунды), а если каталог грузится дольше — иконка
// просто спокойно стоит в уже "осевшем" состоянии, ожидая ready.
export default function SplashScreen({ ready }: SplashScreenProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [visible, setVisible] = useState(false); // fade-in карточки при маунте
  const [fading, setFading] = useState(false); // fade-out перед скрытием
  const [mounted, setMounted] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Карточка сама плавно появляется при маунте, а не выскакивает разом —
  // и в тот же кадр, если звук не выключен в настройках, стартует
  // audio.play(): тайминги в keyframes рассчитаны от 0-й секунды именно
  // звука, поэтому важно, чтобы они стартовали синхронно.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));

    if (loadAppearance().splashSound && audioRef.current) {
      audioRef.current.volume = SAFE_VOLUME;
      audioRef.current.play().catch(() => {
        // Автовоспроизведение со звуком заблокировано политикой webview —
        // не критично: сама анимация всё равно доиграет как задумано,
        // просто молча. Это ожидаемый безопасный дефолт, а не баг.
      });
    }

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_VISIBLE_MS);
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

  // Как только карточка реально уходит из разметки — сразу глушим звук, а
  // не даём затухающему хвосту бубнить фоном поверх уже проявившегося
  // интерфейса (unmount самого <audio> тоже остановил бы его, но pause()
  // — надёжнее и без миллисекундного зазора).
  useEffect(() => {
    if (!mounted) audioRef.current?.pause();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      <audio ref={audioRef} src={splashSoundUrl} preload="auto" />

      <div
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && fading) setMounted(false);
        }}
        className={`surface flex h-[190px] w-[320px] flex-shrink-0 flex-col items-center justify-center gap-4 overflow-hidden rounded-[var(--radius-window)] transition-opacity duration-300 ease-out ${
          visible && !fading ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
          {/* Мягкий ореол за иконкой — раздувается ровно к пику удара (1.08с) */}
          <span
            className="pointer-events-none absolute -inset-3 rounded-full bg-accent-fire opacity-0 blur-md"
            style={{ animation: `splash-glow-bloom ${ANIM_DURATION} ${EASE} 1 both` }}
          />
          {/* Тонкое расходящееся кольцо — один импульс в момент удара, как
              ripple при разблокировке на iPhone */}
          <span
            className="pointer-events-none absolute inset-0 rounded-2xl border border-accent-fire opacity-0"
            style={{ animation: `splash-ring-pulse ${ANIM_DURATION} ${EASE} 1 both` }}
          />

          <span
            className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-accent-fire/30 bg-accent-fire/10 text-accent-fire opacity-0 shadow-glow"
            style={{
              animation: `splash-icon-appear ${ANIM_DURATION} ${EASE} 1 both`,
              transformOrigin: "center"
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width={26}
              height={26}
              fill="currentColor"
              style={{ animation: `splash-bolt-fill ${ANIM_DURATION} ${EASE} 1 both` }}
            >
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
            </svg>
            <span
              className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent-green opacity-0"
              style={{
                animation: `splash-dot-pop ${ANIM_DURATION} ${EASE} 1 both`,
                boxShadow: "0 0 8px rgba(34, 197, 94, .8)"
              }}
            />
          </span>
        </div>

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
