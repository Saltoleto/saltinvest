import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { ToastProvider } from "./ui/feedback/Toast";
import { AuthProvider } from "./state/auth/AuthContext";
import "./index.css";

registerSW({
  onNeedRefresh() {
    // Simple refresh prompt (non-blocking). App also has an in-app toast.
    console.info("Nova versão disponível. Recarregue a página para atualizar.");
  },
  onOfflineReady() {
    console.info("App pronto para uso offline.");
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
