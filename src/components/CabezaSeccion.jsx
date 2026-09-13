import { Link } from "react-router-dom";

const TONO_EYEBROW = {
  secondary: "text-secondary",
  tertiary: "text-tertiary-container",
};

/**
 * Rótulo chico sobre el título de una sección de la home (mockup
 * `.cabeza__eyebrow`): ícono + texto en mayúsculas. 11 px es el piso del sitio.
 */
export function EyebrowSeccion({ icono, tono = "secondary", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-label-sm text-[11px] font-bold uppercase leading-[14px] tracking-[0.1em] ${TONO_EYEBROW[tono]}`}
    >
      {icono ? (
        <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
          {icono}
        </span>
      ) : null}
      {children}
    </span>
  );
}

/**
 * Encabezado compartido de las secciones de la home (mockup `.cabeza`):
 * eyebrow, `<h2>`, bajada y el link "ver más" a la derecha.
 *
 * Siempre `<h2>`: el único `<h1>` de la home es el del hero.
 *
 * @param {import("react").ReactNode} [eyebrow] lo que va arriba del título
 * @param {string} titulo
 * @param {import("react").ReactNode} [bajada] texto (string → `<p>`) o nodo (ej. el reloj)
 * @param {{texto: string, to: string}} [enlace]
 */
export default function CabezaSeccion({ eyebrow = null, titulo, bajada = null, enlace = null }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-5 gap-y-2.5 md:mb-6">
      <div>
        {eyebrow}
        <h2 className="mt-1 font-headline-md text-[24px] font-semibold leading-[30px] tracking-[-0.015em] text-primary md:text-[30px] md:leading-[38px]">
          {titulo}
        </h2>
        {typeof bajada === "string" ? (
          <p className="mt-1 font-body-md text-[13px] leading-[18px] text-on-surface-variant md:text-[15px] md:leading-[22px]">
            {bajada}
          </p>
        ) : (
          bajada
        )}
      </div>
      {enlace ? (
        <Link
          to={enlace.to}
          className="group inline-flex min-h-11 items-center gap-1 whitespace-nowrap font-label-md text-[13px] font-bold leading-[18px] text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          {enlace.texto}
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-[17px] transition-transform motion-safe:group-hover:translate-x-[3px]"
          >
            arrow_forward
          </span>
        </Link>
      ) : null}
    </div>
  );
}
