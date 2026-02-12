export {};

declare global {
  /**
   * Evento padrão usado pelo Chrome/Edge para permitir prompt de instalação.
   * Não existe nos types do TS por padrão.
   */
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  }

  interface Navigator {
    /** iOS Safari */
    standalone?: boolean;
  }

  interface Window {
    __PWA_UPDATE_SW__?: (reload?: boolean) => Promise<void>;
    __PWA_CHECK_UPDATES__?: () => Promise<void>;
  }
}
