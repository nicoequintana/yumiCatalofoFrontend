import { describe, expect, it } from "vitest";

import {
  claveDeDia,
  desplazarMes,
  esDelMes,
  esHoy,
  etiquetaDeMes,
  semanasDelMes,
  tramoEnSemana,
  tramosDeLaSemana,
} from "./calendario.js";

/**
 * Guard de la matemática del calendario.
 *
 * La regla que sostiene todo este módulo: **una fecha de calendario es una
 * ETIQUETA, no un instante.** Se opera con `Date.UTC` y `getUTC*` de punta a
 * punta, así la zona horaria no entra nunca — que es la única forma de que el
 * 1 de septiembre caiga en la casilla del 1 de septiembre para todo el mundo.
 */

describe("semanasDelMes", () => {
  it("arranca las semanas en LUNES", () => {
    // Septiembre de 2026 empieza un martes, así que la primera fila tiene que
    // abrir con el lunes 31 de agosto.
    const semanas = semanasDelMes(2026, 8);

    expect(claveDeDia(semanas[0][0])).toBe("2026-08-31");
    expect(claveDeDia(semanas[0][1])).toBe("2026-09-01");
  });

  it("cada semana tiene exactamente siete días", () => {
    for (const semana of semanasDelMes(2026, 8)) {
      expect(semana).toHaveLength(7);
    }
  });

  it("cubre el mes entero, del primero al último día", () => {
    const dias = semanasDelMes(2026, 8).flat().map(claveDeDia);

    expect(dias).toContain("2026-09-01");
    expect(dias).toContain("2026-09-30");
  });

  it("completa la grilla con días de los meses vecinos", () => {
    const semanas = semanasDelMes(2026, 8);
    const ultima = semanas[semanas.length - 1];

    expect(esDelMes(semanas[0][0], 8)).toBe(false); // 31 de agosto
    expect(esDelMes(ultima[ultima.length - 1], 8)).toBe(false); // ya es octubre
  });

  it("un mes que arranca lunes no arrastra días del anterior", () => {
    // Junio de 2026 empieza un lunes.
    const semanas = semanasDelMes(2026, 5);

    expect(claveDeDia(semanas[0][0])).toBe("2026-06-01");
  });

  it("febrero de un año bisiesto llega hasta el 29", () => {
    const dias = semanasDelMes(2028, 1).flat().map(claveDeDia);

    expect(dias).toContain("2028-02-29");
  });
});

describe("desplazarMes", () => {
  it("avanza y retrocede dentro del año", () => {
    expect(desplazarMes({ ano: 2026, mes: 8 }, 1)).toEqual({ ano: 2026, mes: 9 });
    expect(desplazarMes({ ano: 2026, mes: 8 }, -1)).toEqual({ ano: 2026, mes: 7 });
  });

  it("cruza diciembre y enero sin quedarse en el mes 12", () => {
    expect(desplazarMes({ ano: 2026, mes: 11 }, 1)).toEqual({ ano: 2027, mes: 0 });
    expect(desplazarMes({ ano: 2026, mes: 0 }, -1)).toEqual({ ano: 2025, mes: 11 });
  });
});

describe("tramoEnSemana — dónde y cuánto ocupa una campaña", () => {
  // Semana del lunes 7 al domingo 13 de septiembre de 2026.
  const semana = semanasDelMes(2026, 8)[1];

  it("una campaña que cubre la semana entera ocupa las siete columnas", () => {
    const tramo = tramoEnSemana({ desde: "2026-09-01", hasta: "2026-09-30" }, semana);

    expect(tramo).toEqual({ columna: 1, span: 7 });
  });

  it("una campaña de un solo día ocupa una columna, en su lugar", () => {
    // El miércoles 9 es la tercera columna de una semana que arranca lunes.
    const tramo = tramoEnSemana({ desde: "2026-09-09", hasta: "2026-09-09" }, semana);

    expect(tramo).toEqual({ columna: 3, span: 1 });
  });

  it("una campaña que empieza antes de la semana se recorta al lunes", () => {
    const tramo = tramoEnSemana({ desde: "2026-09-03", hasta: "2026-09-09" }, semana);

    expect(tramo).toEqual({ columna: 1, span: 3 }); // lunes 7 → miércoles 9
  });

  it("una campaña que termina después de la semana se recorta al domingo", () => {
    const tramo = tramoEnSemana({ desde: "2026-09-11", hasta: "2026-09-25" }, semana);

    expect(tramo).toEqual({ columna: 5, span: 3 }); // viernes 11 → domingo 13
  });

  it("una campaña que no toca la semana devuelve null", () => {
    expect(tramoEnSemana({ desde: "2026-09-20", hasta: "2026-09-25" }, semana)).toBeNull();
    expect(tramoEnSemana({ desde: "2026-08-01", hasta: "2026-08-31" }, semana)).toBeNull();
  });

  it("el último día de la campaña ENTRA en el tramo", () => {
    // El fin es inclusivo en toda la feature: una campaña que termina el 9 vale
    // el 9 entero, y su barra tiene que llegar hasta esa casilla.
    const tramo = tramoEnSemana({ desde: "2026-09-07", hasta: "2026-09-07" }, semana);

    expect(tramo.span).toBe(1);
  });

  it("una campaña de un día justo en el borde de la semana se ubica bien", () => {
    expect(tramoEnSemana({ desde: "2026-09-13", hasta: "2026-09-13" }, semana)).toEqual({
      columna: 7,
      span: 1,
    });
  });
});

describe("tramosDeLaSemana — apilar campañas que se superponen", () => {
  const semana = semanasDelMes(2026, 8)[1]; // lunes 7 → domingo 13

  it("dos campañas que no se pisan comparten el carril 0", () => {
    // Apilarlas sin necesidad desperdiciaría alto en cada fila del calendario.
    const tramos = tramosDeLaSemana(
      [
        { id: 1, desde: "2026-09-07", hasta: "2026-09-08" },
        { id: 2, desde: "2026-09-10", hasta: "2026-09-11" },
      ],
      semana,
    );

    expect(tramos.map((t) => t.carril)).toEqual([0, 0]);
  });

  it("dos campañas que se pisan van a carriles distintos", () => {
    const tramos = tramosDeLaSemana(
      [
        { id: 1, desde: "2026-09-07", hasta: "2026-09-11" },
        { id: 2, desde: "2026-09-09", hasta: "2026-09-13" },
      ],
      semana,
    );

    expect(tramos.map((t) => t.carril)).toEqual([0, 1]);
  });

  it("una tercera que solo pisa a la primera reusa el carril de la segunda", () => {
    // El carril se reutiliza apenas queda libre: el calendario no crece de alto
    // por campañas que ya terminaron a la izquierda.
    const tramos = tramosDeLaSemana(
      [
        { id: 1, desde: "2026-09-07", hasta: "2026-09-13" },
        { id: 2, desde: "2026-09-07", hasta: "2026-09-08" },
        { id: 3, desde: "2026-09-10", hasta: "2026-09-11" },
      ],
      semana,
    );

    expect(tramos.map((t) => t.carril)).toEqual([0, 1, 1]);
  });

  it("descarta las campañas que no tocan la semana", () => {
    const tramos = tramosDeLaSemana(
      [
        { id: 1, desde: "2026-09-07", hasta: "2026-09-08" },
        { id: 2, desde: "2026-10-01", hasta: "2026-10-05" },
      ],
      semana,
    );

    expect(tramos).toHaveLength(1);
    expect(tramos[0].campania.id).toBe(1);
  });

  it("sin campañas devuelve una lista vacía, no null", () => {
    expect(tramosDeLaSemana([], semana)).toEqual([]);
    expect(tramosDeLaSemana(undefined, semana)).toEqual([]);
  });
});

describe("esHoy", () => {
  it("reconoce el día que le pasan como hoy", () => {
    const semana = semanasDelMes(2026, 8)[1];
    const miercoles = semana[2];

    expect(esHoy(miercoles, "2026-09-09")).toBe(true);
    expect(esHoy(miercoles, "2026-09-10")).toBe(false);
  });

  it("sin clave de hoy no marca nada", () => {
    // La clave del día la manda el BACKEND. Mientras no llegó, ninguna casilla
    // puede afirmar ser hoy: sería el reloj del navegador decidiéndolo, que es
    // justo lo que la feature evita.
    const semana = semanasDelMes(2026, 8)[1];

    expect(esHoy(semana[2], null)).toBe(false);
  });
});

describe("etiquetaDeMes", () => {
  it("nombra el mes en español", () => {
    expect(etiquetaDeMes({ ano: 2026, mes: 8 })).toBe("Septiembre 2026");
    expect(etiquetaDeMes({ ano: 2027, mes: 0 })).toBe("Enero 2027");
  });
});
