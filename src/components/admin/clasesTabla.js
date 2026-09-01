/**
 * Clases compartidas de las tablas del panel admin.
 *
 * A propósito NO hay un componente `<TablaAdmin>`: las doce pantallas con tabla
 * difieren en cada celda (toggles, spinners, inputs inline, links al detalle),
 * así que un componente genérico necesitaría render-props por columna y
 * terminaría siendo más difícil de leer que el `<table>` que reemplaza. Lo que
 * SÍ se comparte son estos dos strings de clases, y —desde el mecanismo de
 * tabla apilada en mobile— `claseTablaApilada` más su contrato de atributos.
 *
 * `claseCelda` se compone con la clase de color de cada celda:
 * `` className={`${claseCelda} text-on-surface`} ``.
 */
export const claseCelda = "font-body-md text-body-md px-4 py-3 align-top";

export const claseEncabezado =
  "font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant";

/**
 * Clase que convierte una tabla del admin en una tabla apilada por CSS debajo
 * de `md` (767.98px): cada `<tr>` pasa a tarjeta y cada `<td>` muestra su
 * columna con `data-label` + `::before { content: attr(data-label) }`. El CSS
 * vive al final de `index.css`, fuera de `@layer` (tiene que ganarle a las
 * utilidades de escritorio de la propia celda: `px-4`, `whitespace-nowrap`,
 * `min-w-[…]`, `truncate`, `last:border-b-0`).
 *
 * Contrato de markup — cada `<td>` lleva EXACTAMENTE uno de estos cinco
 * atributos (nunca ninguno, nunca dos):
 *
 * - `data-label="<texto EXACTO del th de esa columna>"`: fila rótulo/valor,
 *   ancho completo. El texto tiene que coincidir letra por letra con el `th`.
 * - `data-celda="identidad"`: primera línea de la tarjeta, crece, sin rótulo
 *   (el nombre/producto que identifica la fila).
 * - `data-celda="control"`: primera línea, ancho de contenido, sin rótulo
 *   (checkbox, foto, badge de estado, flechas, `#` de ranking).
 * - `data-celda="acciones"`: última línea, `flex-wrap`, sin rótulo (botones).
 * - `data-celda="secundaria"`: oculta en mobile. Va en el `td` Y en el `th` de
 *   esa columna (el CSS oculta por `[data-celda="secundaria"]` sin distinguir
 *   fila de encabezado).
 *
 * Los roles ARIA (`table`/`rowgroup`/`row`/`columnheader`/`cell`) van
 * explícitos en TODOS los nodos de la tabla: Chrome/Safari descartan los
 * roles implícitos de tabla en cuanto `display` deja de ser `table-*`, y
 * jsdom no lo detecta — por eso hace falta declararlos a mano en el markup en
 * vez de confiar en el default.
 *
 * Helper de test: `esperarTablaApilada` en `src/test/tablaApilada.js`.
 */
export const claseTablaApilada = "tabla-apilada";
