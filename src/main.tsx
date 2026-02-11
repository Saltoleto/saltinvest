import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Registra Service Worker (PWA) e expõe sinais para a UI sugerir atualização.
// A UI do app escuta os eventos 'pwa:needRefresh' e 'pwa:offlineReady'.
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, r) {
    // Checa periodicamente por novas versões (UX: avisa e o usuário decide atualizar).
    if (r) {
      setInterval(() => r.update(), 60 * 60 * 1000); // 1h
    }
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa:needRefresh"));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent("pwa:offlineReady"));
  }
});

// Expondo helper global para a UI poder aplicar a atualização.
// (com types em src/pwa.d.ts)
window.__PWA_UPDATE_SW__ = async (reload = true) => {
  await updateSW(reload);
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
