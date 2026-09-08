// Tipagem mínima do reCAPTCHA v3 carregado por script externo (issue #123).
// Evita depender de um pacote @types para três chamadas.
interface Grecaptcha {
  ready(callback: () => void): void;
  execute(siteKey: string, options: { action: string }): Promise<string>;
}

interface Window {
  grecaptcha?: Grecaptcha;
}
