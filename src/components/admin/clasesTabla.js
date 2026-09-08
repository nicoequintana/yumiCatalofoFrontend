/**
 * Clases compartidas de las tablas del panel admin.
 *
 * A propósito NO hay un componente `<TablaAdmin>`: las quince pantallas con
 * tabla, más el componente compartido `TablaErroresImportacion.jsx`, difieren
 * en cada celda (toggles, spinners, inputs inline, links al detalle), así que
 * un componente genérico necesitaría render-props por columna y terminaría
 * siendo más difícil de leer que el `<table>` que reemplaza. Lo que SÍ se
 * comparte son estos dos strings de clases, y —desde el mecanismo de tabla
 * apilada en mobile— `claseTablaApilada` más su contrato de atributos.
 *
 * Son 19 las instancias de `<table>` que apilan (`AdminOperacion` y `AdminLogs`
 * tienen más de una). Fueron 17 mientras `AdminOrdenes` era el tablero Kanban;
 * el 07/09/2026 volvió a ser una tabla, y en el recuento apareció además
 * `AdminEtiquetas`, que había entrado con su submódulo sin sumarse acá. De las
 * 25 `<table>` del panel, 6 no llevan `claseTablaApilada`: las cuatro de
 * promociones (`AdminPromociones`, `TablaComercial`, `EditorPromocion`,
 * `AlertaConflictos`), que viven dentro de diálogos y cajas propias, más estas
 * dos, cada una por su motivo:
 *
 * - la tabla de previsualización dentro del diálogo de confirmación de
 *   `AdminPrecios`: ya vive en una caja angosta con su propio scroll, no es el
 *   contenido principal de una pantalla;
 * - la de `AdminCampanias`: esa pantalla es **solo escritorio** y nunca se
 *   renderiza por debajo de `lg` (ver `SoloEscritorio.jsx`), así que el CSS de
 *   apilado —que arranca en `md`— no puede dispararse nunca. Ponerlo sería un
 *   contrato de `data-label` que hay que mantener para un caso inalcanzable.
 *
 * `claseCelda` se compone con la clase de color de cada celda:
 * `` className={`${claseCelda} text-on-surface`} ``.
 */
export const claseCelda = "font-body-md text-body-md px-4 py-3 align-top";

/**
 * La variante de `claseCelda` para las celdas que muestran un NÚMERO (precio,
 * stock, unidades, facturación, "5/10").
 *
 * Dos cosas, y las dos importan para lo mismo — comparar una columna de un
 * vistazo en vez de leer fila por fila:
 *
 * - `text-right`: alinea las unidades, las decenas y los miles en la misma
 *   columna vertical. Con los números pegados a la izquierda, "$ 40.643" y
 *   "$ 9.900" arrancan juntos y terminan en cualquier lado; a la derecha, el
 *   más largo se ve más largo.
 * - `tabular-nums`: fija el ancho de cada dígito. La tipografía del panel usa
 *   cifras proporcionales, así que un 1 ocupa menos que un 8 y dos números del
 *   mismo largo no ocupan lo mismo — la alineación a la derecha sola no
 *   alcanza.
 *
 * ⚠️ **No se usa para IDENTIFICADORES que sean números**, como el `#` de
 * ranking o el número de orden: ahí no se compara magnitud, se lee una
 * etiqueta.
 *
 * ⚠️ **Va con prefijo `md:`, o sea SOLO en la tabla de verdad.** Por debajo de
 * `md` la celda deja de ser una columna y pasa a ser una fila `rótulo | valor`
 * en grid (ver el bloque `.tabla-apilada` de `index.css`), y ahí `text-align`
 * lo hereda también el `::before` que dibuja el rótulo: medido en navegador a
 * 390px, "PRECIO" y "STOCK" se pegaban al centro mientras "SKU" y "CATÁLOGO"
 * seguían a la izquierda, dejando los rótulos de la tarjeta desalineados entre
 * sí. La alternativa —devolverle el `text-align` al `::before`— vive en
 * `index.css` y no hace falta: en una tarjeta cada número está solo con su
 * rótulo, así que no hay ninguna columna que comparar y la alineación no
 * compra nada.
 *
 * Se exporta también el modificador SOLO (`claseNumero`) porque
 * `AdminProductos` y `AdminPrecios` no usan `claseCelda`: sus tablas son más
 * densas y llevan su propio padding (`px-2 py-2 xl:px-3 xl:py-3`). Sin el
 * modificador suelto, esas pantallas tendrían que reescribir las dos
 * utilidades a mano y las definiciones se desincronizarían.
 */
export const claseNumero = "md:text-right md:tabular-nums";

export const claseCeldaNumerica = `${claseCelda} ${claseNumero}`;

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
