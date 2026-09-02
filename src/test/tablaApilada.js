import { expect } from "vitest";

/**
 * Helper de test compartido para el contrato de "tabla apilada" (Task 1A del
 * plan de responsive del admin). Contrato completo documentado en
 * `components/admin/clasesTabla.js` y en el CSS de `index.css`
 * (`.tabla-apilada`).
 *
 * `esperarTablaApilada(tabla)` verifica, sobre el DOM real:
 *
 * - La tabla tiene la clase `tabla-apilada` y `role="table"`.
 * - `thead`/`tbody` llevan `role="rowgroup"`; cada `th` lleva
 *   `role="columnheader"`; cada `tbody > tr` lleva `role="row"`.
 * - Cada fila de datos tiene tantas celdas (`td`) como columnas (`th`).
 * - Cada `td` lleva `role="cell"` y EXACTAMENTE uno de:
 *   - `data-label` igual al texto (trim) del `th` de su columna, no vacío; o
 *   - `data-celda` ∈ {identidad, control, acciones, secundaria}, sin `data-label`.
 * - Si el `td` es `secundaria`, el `th` de esa columna también lo es.
 *
 * No se prueba el CSS en sí (jsdom no aplica `@media`): esto solo fija el
 * contrato de markup del que depende el CSS.
 */

const VALORES_DATA_CELDA = new Set(["identidad", "control", "acciones", "secundaria"]);

export function esperarTablaApilada(tabla) {
  expect(tabla, "no se recibió ninguna tabla").toBeTruthy();
  expect(
    tabla.classList.contains("tabla-apilada"),
    'la tabla no tiene la clase "tabla-apilada"',
  ).toBe(true);
  expect(tabla.getAttribute("role"), 'la tabla no tiene role="table"').toBe("table");

  const thead = tabla.querySelector(":scope > thead");
  const tbody = tabla.querySelector(":scope > tbody");
  expect(thead, "la tabla no tiene un <thead> hijo directo").toBeTruthy();
  expect(tbody, "la tabla no tiene un <tbody> hijo directo").toBeTruthy();
  expect(thead.getAttribute("role"), 'el <thead> no tiene role="rowgroup"').toBe("rowgroup");
  expect(tbody.getAttribute("role"), 'el <tbody> no tiene role="rowgroup"').toBe("rowgroup");

  const filaEncabezado = thead.querySelector(":scope > tr");
  expect(filaEncabezado, "el <thead> no tiene una fila de encabezado").toBeTruthy();
  expect(filaEncabezado.getAttribute("role"), 'la fila de encabezado no tiene role="row"').toBe(
    "row",
  );

  const encabezados = Array.from(filaEncabezado.querySelectorAll(":scope > th"));
  expect(encabezados.length, "la tabla no tiene columnas (<th>)").toBeGreaterThan(0);
  encabezados.forEach((th, indiceColumna) => {
    expect(
      th.getAttribute("role"),
      `th[${indiceColumna}] ("${th.textContent.trim()}") no tiene role="columnheader"`,
    ).toBe("columnheader");
  });

  const filas = Array.from(tbody.querySelectorAll(":scope > tr"));
  expect(filas.length, "la tabla no tiene filas de datos (<tbody> vacío)").toBeGreaterThan(0);

  filas.forEach((fila, indiceFila) => {
    expect(fila.getAttribute("role"), `tbody > tr[${indiceFila}] no tiene role="row"`).toBe(
      "row",
    );

    const celdas = Array.from(fila.querySelectorAll(":scope > td"));
    expect(
      celdas.length,
      `fila ${indiceFila}: tiene ${celdas.length} <td> pero el encabezado declara ${encabezados.length} columnas`,
    ).toBe(encabezados.length);

    celdas.forEach((td, indiceColumna) => {
      const th = encabezados[indiceColumna];
      const ubicacion = `fila ${indiceFila}, columna ${indiceColumna} ("${th.textContent.trim()}")`;

      expect(td.getAttribute("role"), `${ubicacion}: el <td> no tiene role="cell"`).toBe("cell");

      const dataLabel = td.getAttribute("data-label");
      const dataCelda = td.getAttribute("data-celda");

      if (dataLabel !== null && dataCelda !== null) {
        throw new Error(
          `${ubicacion}: el <td> lleva data-label ("${dataLabel}") Y data-celda ("${dataCelda}") a la vez — tiene que ser exactamente uno de los dos.`,
        );
      }
      if (dataLabel === null && dataCelda === null) {
        throw new Error(
          `${ubicacion}: el <td> no lleva ni data-label ni data-celda — tiene que llevar exactamente uno de los dos.`,
        );
      }

      if (dataLabel !== null) {
        expect(dataLabel.trim(), `${ubicacion}: data-label está vacío`).not.toBe("");
        // `data-titulo` es la extensión del contrato para encabezados
        // INTERACTIVOS (los th ordenables del listado de productos): su
        // textContent lleva el botón, la flecha y el fallback textual de
        // mobile, así que el texto canónico de la columna se declara aparte.
        // Un th sin control sigue comparándose por su texto, como siempre.
        const textoEncabezado = (th.getAttribute("data-titulo") ?? th.textContent).trim();
        expect(
          dataLabel,
          `${ubicacion}: data-label ("${dataLabel}") no coincide con el texto del th ("${textoEncabezado}")`,
        ).toBe(textoEncabezado);
      } else {
        expect(
          VALORES_DATA_CELDA.has(dataCelda),
          `${ubicacion}: data-celda="${dataCelda}" no es uno de identidad/control/acciones/secundaria`,
        ).toBe(true);

        if (dataCelda === "secundaria") {
          expect(
            th.getAttribute("data-celda"),
            `${ubicacion}: el td es secundaria pero su th no lleva data-celda="secundaria"`,
          ).toBe("secundaria");
        }
      }
    });
  });
}
