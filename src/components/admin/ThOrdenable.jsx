import { AREA_TACTIL_ANCHA } from "../../utils/areaTactil.js";

/**
 * Encabezado de columna clickeable: cicla asc → desc → vuelta al default de
 * la pantalla (el `orden` que `useTablaAdmin` devuelve cuando la URL no trae
 * ninguno — `""` en `AdminProductos`, `"nombre"` en `AdminPrecios`).
 *
 * Compartido entre `AdminProductos` y `AdminPrecios`: vivía duplicado —cada
 * pantalla con su propia copia— y las dos usan exactamente el mismo
 * `className` base. Movido acá el 07/09/2026 al sumarle encabezados
 * ordenables a `AdminPrecios`.
 *
 * Solo es un CONTROL de `md` para arriba. Debajo, el `thead` es sr-only
 * (tabla apilada) y ordenar sigue siendo trabajo del select "Ordenar por",
 * que queda visible solo en mobile: el botón lleva `max-md:hidden` por lo
 * mismo que el checkbox de "seleccionar todos" — un control real dentro de un
 * thead recortado a 1px recibe foco invisible. El `<span md:hidden>` conserva
 * el TEXTO del encabezado para el lector de pantalla en mobile.
 *
 * La flecha inactiva va con `opacity-0`, no desmontada: reserva su ancho para
 * que activar una columna no corra el resto del encabezado.
 *
 * `claseExtra` (default `""`) extiende el `className` base del `<th>` sin
 * duplicar el componente: existe porque las columnas numéricas de
 * `AdminPrecios` (Costo, Coef., Vigente) necesitan además `text-right`, que
 * `AdminProductos` no usa en ninguna de sus columnas ordenables.
 */
export default function ThOrdenable({
  etiqueta,
  asc,
  desc,
  orden,
  onOrden,
  secundaria = false,
  claseExtra = "",
}) {
  const activo = orden === asc ? "asc" : orden === desc ? "desc" : null;
  const siguiente = activo === null ? asc : activo === "asc" ? desc : "";

  return (
    <th
      role="columnheader"
      aria-sort={activo === "asc" ? "ascending" : activo === "desc" ? "descending" : undefined}
      data-celda={secundaria ? "secundaria" : undefined}
      // El texto canónico de la columna, para el contrato de tabla apilada:
      // el textContent de este th suma botón + flecha + fallback de mobile,
      // y `esperarTablaApilada` compara data-label contra `data-titulo`
      // cuando existe.
      data-titulo={etiqueta}
      className={`px-2 py-2 font-label-sm uppercase tracking-wide text-on-surface-variant xl:px-3 xl:py-3 xl:tracking-widest${claseExtra ? ` ${claseExtra}` : ""}`}
    >
      <button
        type="button"
        onClick={() => onOrden(siguiente)}
        aria-label={`Ordenar por ${etiqueta}`}
        title={`Ordenar por ${etiqueta}`}
        // Área táctil: medido en navegador el 07/09/2026 sobre
        // `/catalogo/admin/productos` y `/productos/precios` con
        // `elementFromPoint` —el área EFECTIVA, no la caja declarada—, los seis
        // encabezados ordenables daban **20-21px de alto**: el `th` tiene su
        // `py-2`, pero el botón de adentro es texto pelado.
        //
        // Va con pseudo-elemento y no con `min-h-11`: estirar el botón
        // estiraría la fila entera del `thead`, que es justo la que no puede
        // pagar 24px extra sin empujar las 84 filas de abajo. El overhang
        // vertical del pseudo (44 sobre un botón de 20) cae dentro del
        // `py-2`/`xl:py-3` del propio `th` y del `py-2` de la primera fila de
        // datos, así que no tapa ningún control de esa fila.
        className={`max-md:hidden inline-flex items-center gap-1 uppercase hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${AREA_TACTIL_ANCHA} ${
          activo ? "text-on-surface" : ""
        }`}
      >
        {etiqueta}
        <span aria-hidden="true" className={activo ? "text-primary" : "opacity-0"}>
          {activo === "desc" ? "▼" : "▲"}
        </span>
      </button>
      <span className="md:hidden">{etiqueta}</span>
    </th>
  );
}
