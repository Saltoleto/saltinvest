import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import Modal from "@/ui/primitives/Modal";
import Button from "@/ui/primitives/Button";
import { cn } from "@/ui/utils/cn";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandalone() {
  // Chromium + most
  if (window.matchMedia?.("(display-mode: standalone)")?.matches) return true;
  // iOS Safari
  // @ts-expect-error - iOS only
  if (window.navigator?.standalone) return true;
  return false;
}

function isIOS() {
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isSafariOnIOS() {
  if (!isIOS()) return false;
  const ua = window.navigator.userAgent.toLowerCase();
  // iOS browsers all use WebKit; this roughly catches Safari
  const isCriOS = ua.includes("crios");
  const isFxiOS = ua.includes("fxios");
  return !isCriOS && !isFxiOS;
}

export default function PwaPrompts() {
  // -----------------
  // Update prompt
  // -----------------
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker
  } = useRegisterSW({
    immediate: true
  });

  const [hideUpdateModal, setHideUpdateModal] = React.useState(false);

  React.useEffect(() => {
    if (needRefresh) setHideUpdateModal(false);
  }, [needRefresh]);

  // Optional: log offline-ready for debugging
  React.useEffect(() => {
    if (offlineReady) console.info("App pronto para uso offline.");
  }, [offlineReady]);

  // -----------------
  // Install prompt
  // -----------------
  const [installEvt, setInstallEvt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = React.useState(false);
  const [installed, setInstalled] = React.useState(false);
  const [showIOSHelp, setShowIOSHelp] = React.useState(false);

  React.useEffect(() => {
    setInstalled(isStandalone());

    function onAppInstalled() {
      setInstalled(true);
      setInstallEvt(null);
      setInstallDismissed(true);
    }

    function onBeforeInstallPrompt(e: Event) {
      // Chrome / Edge: capture event for a custom prompt
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  const shouldSuggestInstall = !installed && !installDismissed;
  const canShowNativeInstall = shouldSuggestInstall && !!installEvt;
  const canShowIOSInstall = shouldSuggestInstall && !installEvt && isSafariOnIOS();
  const canShowBrowserInstallHelp = shouldSuggestInstall && !installEvt && !isSafariOnIOS();

  async function handleInstall() {
    if (!installEvt) return;
    try {
      await installEvt.prompt();
      const choice = await installEvt.userChoice;
      if (choice.outcome === "accepted") {
        setInstallDismissed(true);
      } else {
        // User dismissed; keep subtle suggestion but don't spam
        setInstallDismissed(true);
      }
    } catch {
      setInstallDismissed(true);
    }
  }

  // Banner sempre que não estiver instalado.
  // Nem sempre o beforeinstallprompt dispara (critérios do navegador), então oferecemos instruções como fallback.
  const showInstallBanner = canShowNativeInstall || canShowIOSInstall || canShowBrowserInstallHelp;

  return (
    <>
      {/* Update modal: required when a new version is available */}
      <Modal
        open={needRefresh && !hideUpdateModal}
        title="Atualização disponível"
        onClose={() => setHideUpdateModal(true)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setHideUpdateModal(true)} className="h-10 px-4">
              Depois
            </Button>
            <Button
              onClick={() => updateServiceWorker(true)}
              className="h-10 px-4"
              title="Recarrega o app para aplicar a nova versão"
            >
              Atualizar agora
            </Button>
          </>
        }
      >
        <div className="text-slate-800">
          Uma nova versão do <span className="font-semibold">SaltInvest</span> está pronta.
        </div>
        <div className="mt-2 text-sm text-slate-700">
          Para garantir segurança e a melhor experiência, atualize para aplicar as melhorias.
        </div>
      </Modal>

      {/* If user closed the modal but needRefresh is still true, keep a small banner */}
      {needRefresh && hideUpdateModal ? (
        <div className="fixed bottom-4 left-4 right-4 z-[9998] sm:left-auto sm:right-4 sm:w-[420px]">
          <div className="rounded-xl2 border border-amber-200 bg-amber-50 backdrop-blur-md shadow-soft p-4 flex items-start gap-3">
            <div className="flex-1">
              <div className="text-slate-900 font-medium">Nova versão disponível</div>
              <div className="text-sm text-slate-700 mt-0.5">Atualize para aplicar as mudanças.</div>
            </div>
            <Button onClick={() => updateServiceWorker(true)} className="h-9 px-4">
              Atualizar
            </Button>
          </div>
        </div>
      ) : null}

      {/* Install suggestion banner */}
      {showInstallBanner ? (
        <div className="fixed bottom-4 left-4 right-4 z-[9997] sm:left-auto sm:right-4 sm:w-[420px]">
          <div
            className={cn(
              "rounded-xl2 border bg-white backdrop-blur-md shadow-soft p-4 flex items-start gap-3",
              "border-slate-200"
            )}
          >
            <div className="flex-1">
              <div className="text-slate-900 font-medium">Instale o SaltInvest</div>
              <div className="text-sm text-slate-700 mt-0.5">
                Tenha acesso rápido e uma experiência mais fluida, como um app.
              </div>
            </div>

            {canShowNativeInstall ? (
              <Button onClick={handleInstall} className="h-9 px-4">
                Instalar
              </Button>
            ) : canShowIOSInstall ? (
              <Button onClick={() => setShowIOSHelp(true)} className="h-9 px-4">
                Como instalar
              </Button>
            ) : (
              <Button onClick={() => setShowIOSHelp(true)} className="h-9 px-4">
                Como instalar
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => setInstallDismissed(true)}
              className="h-9 px-3"
              title="Fechar"
            >
              ✕
            </Button>
          </div>
        </div>
      ) : null}

      {/* iOS instructions */}
      <Modal
        open={showIOSHelp}
        title={isSafariOnIOS() ? "Instalar no iPhone/iPad" : "Como instalar o app"}
        onClose={() => setShowIOSHelp(false)}
        footer={
          <Button onClick={() => setShowIOSHelp(false)} className="h-10 px-4">
            Entendi
          </Button>
        }
      >
        {isSafariOnIOS() ? (
          <>
            <div className="text-slate-800">
              No Safari, toque no botão de <span className="font-semibold">Compartilhar</span> e depois em{" "}
              <span className="font-semibold">“Adicionar à Tela de Início”</span>.
            </div>
            <div className="mt-2 text-sm text-slate-700">
              Após instalar, o SaltInvest abre em tela cheia e funciona melhor como PWA.
            </div>
          </>
        ) : (
          <>
            <div className="text-slate-800">
              Se o botão <span className="font-semibold">Instalar</span> não apareceu automaticamente, você ainda pode
              instalar pelo menu do navegador.
            </div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
              <li>
                <span className="font-medium text-slate-800">Chrome/Edge (Desktop):</span> clique no ícone de instalação
                na barra de endereço ou no menu ⋮ → <span className="font-semibold">Instalar app</span>.
              </li>
              <li>
                <span className="font-medium text-slate-800">Chrome (Android):</span> menu ⋮ →{" "}
                <span className="font-semibold">Instalar app</span> / <span className="font-semibold">Adicionar à tela inicial</span>.
              </li>
            </ul>
          </>
        )}
      </Modal>
    </>
  );
}
