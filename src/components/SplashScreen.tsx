import { useEffect, useState, type CSSProperties } from "react";
import splashSoundUrl from "../assets/foxfire-splash.mp3";
import { loadAppearance } from "../utils/appearance";
import { APP_STAGE_LABEL, APP_VERSION } from "../appConfig";

interface SplashScreenProps {
  // true, когда стартовые данные готовы (локальное состояние загружено, а
  // каталог виджетов либо загрузился, либо точно не загрузится — см. App.tsx,
  // isRegistryLoading) и сплэш можно скрывать.
  ready: boolean;
  // Вызывается в момент, когда карточка начинает исчезать. App.tsx по этому
  // сигналу начинает проявлять интерфейс — получается плавный "перекрёстный"
  // переход, а не интерфейс, который проступает из-под ещё висящей карточки.
  onExit?: () => void;
}

// Та же кривая, что и у остальных "пружинных" переходов в приложении.
const EASE = "cubic-bezier(.22, 1, .36, 1)";

// Длина звука src/assets/foxfire-splash.mp3 (4.032 c). Вся анимация в
// index.css (splash-*) растянута ровно на это время и привязана к огибающей
// громкости звука: пик — на 1.0 c (≈ 25% анимации).
const SOUND_DURATION_MS = 4032;
const ANIM_DURATION = `${SOUND_DURATION_MS}ms`;

// Звук сведён вплотную к 0 дБ — на полной системной громкости он бил бы по
// ушам, поэтому внутри приложения громкость намеренно ниже. Второй уровень
// защиты — переключатель "Звук при запуске" в разделе "Внешний вид"
// (AppearanceSettings.tsx → settings.splashSound).
const SAFE_VOLUME = 0.55;

// Минимальное время показа карточки, когда звука нет (выключен в настройках
// или webview не разрешил автовоспроизведение): к этому моменту анимация уже
// "осела" (пик на 1.0 c + короткий звон), так что не выглядит оборванной.
const SILENT_MIN_VISIBLE_MS = 2200;

// Запас на случай, если событие "ended" у звука почему-то не придёт: карточка
// в любом случае уйдёт, а не зависнет навсегда.
const SOUND_SAFETY_MS = SOUND_DURATION_MS + 800;

// ВАЖНО: звук живёт ВНЕ React-компонента. Раньше <audio> был внутри карточки и
// при её исчезновении (через 1.65 c) размонтировался / ставился на паузу —
// поэтому звук обрывался, не дойдя и до половины. Теперь это один общий объект
// Audio: его никто не останавливает, и он доигрывает до самого конца, даже если
// компонент размонтируется. Флаг защищает от повторного запуска (React
// StrictMode в режиме разработки монтирует компонент дважды).
let splashAudio: HTMLAudioElement | null = null;
let splashSoundStarted = false;

// Лучики, разлетающиеся в момент удара. Угол — в градусах.
const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

export default function SplashScreen({ ready, onExit }: SplashScreenProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  // Звук доиграл (или его нет / он заблокирован) — можно уходить.
  const [soundDone, setSoundDone] = useState(false);
  // Звук сейчас реально играет — показываем анимированный эквалайзер.
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [visible, setVisible] = useState(false); // fade-in карточки при маунте
  const [fading, setFading] = useState(false); // fade-out перед скрытием
  const [mounted, setMounted] = useState(true);

  // Карточка плавно появляется, и в тот же кадр стартует звук: тайминги
  // анимации рассчитаны от 0-й секунды именно звука.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));

    let cancelled = false;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let cleanupListeners = () => {};

    if (!loadAppearance().splashSound) {
      setSoundDone(true);
    } else {
      if (!splashAudio) {
        splashAudio = new Audio(splashSoundUrl);
        splashAudio.preload = "auto";
        splashAudio.volume = SAFE_VOLUME;
      }
      const audio = splashAudio;

      const finish = () => {
        if (cancelled) return;
        setSoundPlaying(false);
        setSoundDone(true);
      };
      audio.addEventListener("ended", finish);
      audio.addEventListener("error", finish);
      cleanupListeners = () => {
        audio.removeEventListener("ended", finish);
        audio.removeEventListener("error", finish);
      };
      safetyTimer = setTimeout(finish, SOUND_SAFETY_MS);

      if (!splashSoundStarted) {
        splashSoundStarted = true;
        audio.currentTime = 0;
        audio.play().then(
          () => {
            if (!cancelled) setSoundPlaying(true);
          },
          () => {
            // Автовоспроизведение со звуком заблокировано политикой webview —
            // не критично: анимация всё равно доиграет, просто молча.
            finish();
          }
        );
      } else if (!audio.paused && !audio.ended) {
        // Повторный монтаж (StrictMode): звук уже идёт — просто подхватываем.
        setSoundPlaying(true);
      } else {
        finish();
      }
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (safetyTimer) clearTimeout(safetyTimer);
      cleanupListeners();
      // Звук здесь НЕ останавливаем — он обязан доиграть до конца.
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), SILENT_MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && minTimeElapsed && soundDone) setFading(true);
  }, [ready, minTimeElapsed, soundDone]);

  useEffect(() => {
    if (!fading) return;
    onExit?.();
    // Подстраховка на случай, если transitionend по какой-то причине не
    // долетит — убираем сплэш из разметки чуть позже конца fade-out.
    const timeout = setTimeout(() => setMounted(false), 600);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fading]);

  if (!mounted) return null;

  const anim = (name: string) => `${name} ${ANIM_DURATION} ${EASE} 1 both`;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center"
      style={{ pointerEvents: fading ? "none" : "auto" }}
    >
      {/* Мягкий свет за карточкой — даёт глубину, но не закрывает окно целиком */}
      <div
        className={`splash-ambient pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out ${
          visible && !fading ? "opacity-100" : "opacity-0"
        }`}
      />

      <div
        onTransitionEnd={(e) => {
          if (e.propertyName === "opacity" && e.target === e.currentTarget && fading) setMounted(false);
        }}
        className={`splash-card relative flex w-[340px] flex-shrink-0 flex-col items-center overflow-hidden rounded-[calc(var(--radius-window)+6px)] px-8 pb-6 pt-9 transition-[opacity,transform] duration-500 ${
          visible && !fading ? "translate-y-0 scale-100 opacity-100" : fading ? "-translate-y-1 scale-[.985] opacity-0" : "translate-y-2 scale-[.97] opacity-0"
        }`}
        style={{ transitionTimingFunction: EASE }}
      >
        {/* Тёплый отсвет сверху карточки — вспыхивает вместе со звуком */}
        <span
          className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-accent-fire opacity-0 blur-3xl"
          style={{ animation: anim("splash-halo") }}
        />

        {/* ===== Иконка ===== */}
        <div className="relative flex h-[76px] w-[76px] flex-shrink-0 items-center justify-center">
          <span
            className="pointer-events-none absolute -inset-4 rounded-full bg-accent-fire opacity-0 blur-xl"
            style={{ animation: anim("splash-glow-bloom") }}
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-[24px] border border-accent-fire opacity-0"
            style={{ animation: anim("splash-ring-pulse") }}
          />
          <span
            className="pointer-events-none absolute inset-0 rounded-[24px] border border-accent-fire opacity-0"
            style={{ animation: anim("splash-ring-pulse-2") }}
          />

          {SPARKS.map((angle) => (
            <span
              key={angle}
              className="pointer-events-none absolute left-1/2 top-1/2 -ml-[1.5px] -mt-[1.5px] h-[3px] w-[3px] rounded-full bg-accent-fire opacity-0"
              style={
                {
                  "--a": `${angle}deg`,
                  boxShadow: "0 0 6px var(--color-fire-glow)",
                  animation: anim("splash-spark")
                } as CSSProperties
              }
            />
          ))}

          <span
            className="splash-icon-tile relative flex h-[76px] w-[76px] flex-shrink-0 items-center justify-center rounded-[24px] text-accent-fire opacity-0"
            style={{ animation: anim("splash-icon-appear"), transformOrigin: "center" }}
          >
            <svg
              viewBox="0 0 24 24"
              width={34}
              height={34}
              fill="currentColor"
              style={{ animation: anim("splash-bolt-fill") }}
            >
              <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
            </svg>
            <span
              className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-accent-green opacity-0"
              style={{
                animation: anim("splash-dot-pop"),
                boxShadow: "0 0 10px rgba(34, 197, 94, .85)"
              }}
            />
          </span>
        </div>

        {/* ===== Название ===== */}
        <div className="mt-6 flex flex-shrink-0 flex-col items-center gap-1.5">
          <span
            className="scanline-text text-[22px] font-extrabold leading-none tracking-tight text-warmwhite opacity-0"
            style={{ animation: anim("splash-title-in") }}
          >
            FoxFire Hub
          </span>
          <span
            className="text-[11px] font-medium text-muted opacity-0"
            style={{ animation: anim("splash-title-in"), animationDelay: "90ms" }}
          >
            Каталог виджетов для стримеров
          </span>
        </div>

        {/* ===== Прогресс ===== */}
        <div className="mt-7 flex w-full flex-shrink-0 flex-col gap-2.5">
          <div className="splash-track relative h-[3px] w-full overflow-hidden rounded-full">
            {/* Заполнение синхронно со звуком: ровно за время его проигрывания */}
            <div
              className="splash-fill absolute inset-y-0 left-0 w-full origin-left rounded-full"
              style={{ animation: `splash-progress ${ANIM_DURATION} cubic-bezier(.45, .05, .25, 1) 1 both` }}
            />
            {/* Если каталог грузится дольше звука — по заполненной полосе бежит блик */}
            {soundDone && !ready && (
              <div className="absolute inset-y-0 left-0 w-1/3 animate-[splash-sweep_1.1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono-ui text-[11px] text-muted">
              {ready && minTimeElapsed && soundDone ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-green shadow-[0_0_8px_rgba(34,197,94,.8)]" />
                  Готово
                </>
              ) : (
                <>
                  <span className="splash-eq" data-active={soundPlaying} aria-hidden="true">
                    <i />
                    <i />
                    <i />
                    <i />
                  </span>
                  {ready ? "Запуск…" : "Загрузка каталога…"}
                </>
              )}
            </span>
            <span className="font-mono-ui text-[10.5px] text-muted/70">
              v{APP_VERSION} · {APP_STAGE_LABEL.toLowerCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
