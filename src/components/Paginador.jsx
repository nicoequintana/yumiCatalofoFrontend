/**
 * Paginador numérico clásico, con la página en la URL del lado de quien lo usa
 * (este componente es presentacional: recibe `pagina` y avisa por `onCambiar`).
 *
 * Se eligió sobre scroll infinito porque un número de página es direccionable:
 * un link a la página 3 abre la página 3, y volver desde una ficha de producto
 * conserva la posición. Con scroll infinito ninguna de las dos cosas existe.
 *
 * Accesibilidad, que es la mitad del componente:
 * - Es un `<nav>` con nombre accesible propio (`etiqueta`), porque una página
 *   puede tener más de una región de navegación.
 * - Los controles son `<button>` reales, no divs clickeables: llegan por
 *   teclado, se anuncian como botones y `disabled` los saca del orden de foco.
 * - La página actual lleva `aria-current="page"`.
 * - Anterior/Siguiente van `disabled` en los extremos en vez de desaparecer:
 *   un control que se mueve de lugar entre páginas es peor que uno inactivo.
 * - Las elipsis son texto decorativo (`aria-hidden`), nunca un control.
 * - "Página N de M" da la posición a quien no ve la fila de números.
 */

/** Cuántas páginas se muestran a cada lado de la actual antes de condensar. */
const VECINAS = 1;

/**
 * Construye la secuencia visible: siempre la primera y la última, la actual
 * con sus vecinas, y `"…"` donde se saltearon páginas.
 */
function construirRango(pagina, totalPaginas) {
  const numeros = new Set([1, totalPaginas]);
  for (let n = pagina - VECINAS; n <= pagina + VECINAS; n++) {
    if (n >= 1 && n <= totalPaginas) numeros.add(n);
  }

  const ordenados = [...numeros].sort((a, b) => a - b);
  const conElipsis = [];
  for (const [indice, numero] of ordenados.entries()) {
    const anterior = ordenados[indice - 1];
    if (anterior !== undefined && numero - anterior > 1) conElipsis.push("…");
    conElipsis.push(numero);
  }
  return conElipsis;
}

const CLASE_BOTON =
  "font-label-md text-label-md inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-outline-variant px-3 text-on-surface-variant transition-colors hover:border-outline hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-outline-variant";

function Paginador({ pagina, totalPaginas, onCambiar, etiqueta }) {
  // Con una sola página no hay nada que navegar: mostrar un paginador inerte
  // sería ruido, y un `<nav>` vacío ensucia la lista de regiones del lector.
  if (totalPaginas <= 1) return null;

  const rango = construirRango(pagina, totalPaginas);

  return (
    <nav aria-label={etiqueta} className="mt-10 flex flex-col items-center gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          <button
            type="button"
            onClick={() => onCambiar(pagina - 1)}
            disabled={pagina <= 1}
            aria-label="Página anterior"
            className={CLASE_BOTON}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              chevron_left
            </span>
          </button>
        </li>

        {rango.map((entrada, indice) =>
          entrada === "…" ? (
            <li key={`elipsis-${indice}`} aria-hidden="true" className="px-1 text-on-surface-variant">
              …
            </li>
          ) : (
            <li key={entrada}>
              <button
                type="button"
                onClick={() => onCambiar(entrada)}
                aria-label={`Página ${entrada}`}
                aria-current={entrada === pagina ? "page" : undefined}
                className={
                  entrada === pagina
                    ? "font-label-md text-label-md inline-flex h-10 min-w-10 items-center justify-center rounded-lg border border-primary bg-primary px-3 text-on-primary"
                    : CLASE_BOTON
                }
              >
                {entrada}
              </button>
            </li>
          ),
        )}

        <li>
          <button
            type="button"
            onClick={() => onCambiar(pagina + 1)}
            disabled={pagina >= totalPaginas}
            aria-label="Página siguiente"
            className={CLASE_BOTON}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              chevron_right
            </span>
          </button>
        </li>
      </ul>

      <p className="font-body-md text-body-md text-on-surface-variant">
        Página {pagina} de {totalPaginas}
      </p>
    </nav>
  );
}

export default Paginador;
