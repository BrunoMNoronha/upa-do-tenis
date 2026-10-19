import type { ReactNode } from "react";

/**
 * Ícones da landing: SVG inline de traço (estilo Heroicons outline), mesmo
 * padrão de `src/config/navigation.tsx`. Decorativos por padrão
 * (`aria-hidden`); o texto ao lado dá o significado.
 */

type IconeProps = {
  className?: string;
};

function base(props: IconeProps, children: ReactNode) {
  return (
    <svg
      className={props.className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconeCamadas(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M4 7l8-4 8 4-8 4-8-4z" />
      <path d="M4 12l8 4 8-4" />
      <path d="M4 17l8 4 8-4" />
    </>,
  );
}

export function IconeCheck(props: IconeProps) {
  return base(props, <path d="M5 12l5 5L20 7" />);
}

export function IconeWhatsApp(props: IconeProps) {
  return base(props, <path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L4 21l1.6-4.3A8.5 8.5 0 1 1 21 12z" />);
}

export function IconeCamera(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>,
  );
}

export function IconeLink(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M10 14a4 4 0 0 1 0-5.7l2.3-2.3a4 4 0 0 1 5.7 5.7l-1 1" />
      <path d="M14 10a4 4 0 0 1 0 5.7l-2.3 2.3a4 4 0 0 1-5.7-5.7l1-1" />
    </>,
  );
}

export function IconeEstrela(props: IconeProps) {
  return base(
    props,
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  );
}

export function IconeDocumento(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </>,
  );
}

export function IconeRaio(props: IconeProps) {
  return base(props, <path d="M13 2L4 14h7l-1 8 9-12h-7z" />);
}

export function IconeCarrinho(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M3 4h2l2.5 11h11L21 7H6" />
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="17" cy="20" r="1.5" />
    </>,
  );
}

export function IconeCaixa(props: IconeProps) {
  return base(
    props,
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <path d="M7 15h3" />
    </>,
  );
}

export function IconeGrafico(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20H2" />
    </>,
  );
}

export function IconeLoja(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M3 21h18" />
      <path d="M5 21V8l7-4 7 4v13" />
      <path d="M9 21v-6h6v6" />
    </>,
  );
}

export function IconeSeta(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>,
  );
}

export function IconeMenu(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>,
  );
}

export function IconeFaisca(props: IconeProps) {
  return base(
    props,
    <>
      <path d="M12 3v3" />
      <path d="M12 18v3" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
      <circle cx="12" cy="12" r="4" />
    </>,
  );
}
