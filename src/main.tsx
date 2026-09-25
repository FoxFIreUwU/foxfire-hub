import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyAppearance, loadAppearance } from "./utils/appearance";
import "./index.css";

// Применяем сохранённые настройки внешнего вида до первой отрисовки — иначе
// пользователь на долю секунды увидит цвета по умолчанию, а потом "прыжок" на
// свои. Сам раздел UI, где это меняется, — src/components/AppearanceSettings.tsx.
applyAppearance(loadAppearance());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
