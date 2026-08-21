import { useId } from "react";

/**
 * Delimited section block for the admin analytics screens (Ventas, Embudo,
 * Clientes, Operación).
 *
 * Those screens used to stack bare `<section className="mb-8">` blocks whose
 * only separation was margin plus an `<h2>`, so consecutive sections read as
 * one continuous run of text — "Órdenes estancadas" and "Antigüedad promedio"
 * had no visible boundary between them. This wraps each one in its own
 * surface with a border, which reads as a discrete block in both themes.
 *
 * The background is `surface-container-low` rather than the page background,
 * so the cards inside (which sit on `surface-container-lowest`) still stand
 * out one step against it — that layering is what keeps the section readable
 * in dark mode, where every surface is close in luminosity.
 */
function SeccionAdmin({
  titulo,
  descripcion,
  etiqueta,
  accion,
  className = "",
  children,
}) {
  const tituloId = useId();

  return (
    <section
      // `aria-labelledby` points at the visible heading so the region and the
      // heading never drift apart; `etiqueta` overrides it only where the
      // screen wants a shorter name than the visible title.
      {...(etiqueta
        ? { "aria-label": etiqueta }
        : { "aria-labelledby": tituloId })}
      className={`mb-6 rounded-xl border border-outline-variant bg-surface-container-low p-5 md:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id={tituloId}
            className="font-headline-md text-headline-md text-primary"
          >
            {titulo}
          </h2>
          {descripcion && (
            <p className="font-body-md text-body-md mt-1 text-on-surface-variant">
              {descripcion}
            </p>
          )}
        </div>
        {accion && <div className="shrink-0">{accion}</div>}
      </div>
      {children}
    </section>
  );
}

export default SeccionAdmin;
