import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Registra Service Worker (PWA) e expõe sinais para a UI sugerir atualização.
// A UI do app escuta os eventos 'pwa:needRefresh' e 'pwa:offlineReady'.
let swRegistration: ServiceWorkerRegistration | undefined;
let didSetupUpdateChecks = false;

const safeCheckForUpdate = async () => {
  try {
    await swRegistration?.update();
  } catch {
    // ignore
  }
};

const setupUpdateChecks = (r?: ServiceWorkerRegistration) => {
  if (didSetupUpdateChecks) return;
  didSetupUpdateChecks = true;

  // Guardamos a registration para forçar checagens de update.
  swRegistration = r;

  // Problema comum em PWAs instalados: o navegador pode demorar até 24h para checar updates.
  // Forçamos checagens periódicas + quando o app volta ao foco/online.
  void safeCheckForUpdate();

  // Intervalo curto o suficiente para o usuário perceber logo após um deploy.
  // (sem ser agressivo demais para redes móveis)
  setInterval(() => {
    void safeCheckForUpdate();
  }, 5 * 60 * 1000); // 5 min

  const onVisible = () => {
    if (document.visibilityState === "visible") void safeCheckForUpdate();
  };
  const onFocus = () => void safeCheckForUpdate();
  const onOnline = () => void safeCheckForUpdate();

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onFocus);
  window.addEventListener("online", onOnline);

  // Cleanup quando houver recarga
  window.addEventListener(
    "beforeunload",
    () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    },
    { once: true }
  );
};

// Algumas versões do vite-plugin-pwa expõem `onRegisteredSW` e outras `onRegistered`.
// Usamos um options `any` para ser compatível sem quebrar o build.
const swOptions: any = {
  immediate: true,
  onRegisteredSW(_swUrl: string, r?: ServiceWorkerRegistration) {
    setupUpdateChecks(r);
  },
  onRegistered(r?: ServiceWorkerRegistration) {
    setupUpdateChecks(r);
  },
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent("pwa:needRefresh"));
  },
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent("pwa:offlineReady"));
  },
};

const updateSW = registerSW(swOptions);

// Fallback: em alguns ambientes o callback de registro pode não disparar como esperado.
// Tentamos obter a registration diretamente e configurar as checagens.
if ("serviceWorker" in navigator) {
  setTimeout(async () => {
    if (didSetupUpdateChecks) return;
    try {
      const r = await navigator.serviceWorker.getRegistration();
      setupUpdateChecks(r ?? undefined);
    } catch {
      // ignore
    }
  }, 2000);
}

// Expondo helper global para a UI poder aplicar a atualização.
// (com types em src/pwa.d.ts)
window.__PWA_UPDATE_SW__ = async (reload = true) => {
  await updateSW(reload);
};

// (Opcional) helper para a UI/console forçar a checagem de update.
// Pode ser útil para debug em produção.
window.__PWA_CHECK_UPDATES__ = async () => {
  await safeCheckForUpdate();
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
