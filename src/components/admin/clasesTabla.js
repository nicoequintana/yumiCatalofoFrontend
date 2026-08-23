/**
 * Clases compartidas de las tablas del panel admin.
 *
 * A propósito NO hay un componente `<TablaAdmin>`: las seis pantallas con tabla
 * difieren en cada celda (toggles, spinners, inputs inline, links al detalle),
 * así que un componente genérico necesitaría render-props por columna y
 * terminaría siendo más difícil de leer que el `<table>` que reemplaza. Lo
 * único que estaba realmente duplicado eran estos dos strings de clases, que es
 * lo que se comparte.
 *
 * `claseCelda` se compone con la clase de color de cada celda:
 * `` className={`${claseCelda} text-on-surface`} ``.
 */
export const claseCelda = "font-body-md text-body-md px-4 py-3 align-top";

export const claseEncabezado =
  "font-label-sm text-label-sm px-4 py-3 uppercase tracking-widest text-on-surface-variant";
