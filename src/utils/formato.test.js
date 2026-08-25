import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  formatFecha,
  formatFechaHora,
  formatPrecio,
  formatearPrecioInput,
  formatearPrecioParaEdicion,
  precioACentavos,
} from "./formato.js";

// Toda la suite corre en la zona horaria de Argentina (UTC-3), la del negocio.
// No es cosmético: los bugs de corrimiento de día solo aparecen en zonas al
// oeste de UTC, así que en un runner en UTC un formateador roto pasaría verde.
const TZ_ORIGINAL = process.env.TZ;

beforeAll(() => {
  process.env.TZ = "America/Argentina/Buenos_Aires";
});

afterAll(() => {
  process.env.TZ = TZ_ORIGINAL;
});

describe("formatFecha", () => {
  it("formatea un timestamp ISO con día y mes de dos dígitos", () => {
    expect(formatFecha("2026-08-09T14:03:22.000-03:00")).toBe("09/08/2026");
  });

  it("no corre un día una fecha sin hora (YYYY-MM-DD)", () => {
    // Este es el bug que motiva el parser propio. `new Date("2026-08-19")` se
    // parsea como medianoche UTC, que en Argentina es el 18 a las 21 h: usar
    // `Date` para una fecha sin hora muestra el día anterior. La aserción de
    // control de abajo prueba que la trampa es real, no teórica.
    expect(
      new Intl.DateTimeFormat("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date("2026-08-19")),
    ).toBe("18/08/2026");

    expect(formatFecha("2026-08-19")).toBe("19/08/2026");
    expect(formatFecha("2026-01-01")).toBe("01/01/2026");
  });

  it("acepta un objeto Date", () => {
    expect(formatFecha(new Date(2026, 7, 19, 14, 3))).toBe("19/08/2026");
  });

  it("devuelve el marcador de dato faltante ante una fecha inválida", () => {
    expect(formatFecha("no es una fecha")).toBe("—");
    expect(formatFecha(null)).toBe("—");
    expect(formatFecha(undefined)).toBe("—");
    expect(formatFecha("")).toBe("—");
  });
});

describe("formatFechaHora", () => {
  it("formatea un timestamp ISO en hora local, con reloj de 24 horas", () => {
    expect(formatFechaHora("2026-08-09T14:03:22.000-03:00")).toBe("09/08/2026, 14:03:22");
    expect(formatFechaHora("2026-08-09T00:07:05.000-03:00")).toBe("09/08/2026, 00:07:05");
  });

  it("trata una fecha sin hora como medianoche local, sin correr el día", () => {
    expect(formatFechaHora("2026-08-19")).toBe("19/08/2026, 00:00:00");
  });

  it("devuelve el marcador de dato faltante ante una fecha inválida", () => {
    expect(formatFechaHora("no es una fecha")).toBe("—");
    expect(formatFechaHora(null)).toBe("—");
  });
});

describe("formas ISO incompletas", () => {
  it("rechaza 'YYYY' y 'YYYY-MM' en vez de completarles el día", () => {
    // `Date` sí las acepta, y las interpreta como UTC: `new Date("2026-08")`
    // en Argentina cae el 31/07/2026. Mostrar esa fecha sería peor que no
    // mostrar ninguna, así que se rechazan explícitamente.
    expect(formatFecha("2026-08")).toBe("—");
    expect(formatFecha("2026")).toBe("—");
    expect(formatFechaHora("2026-08")).toBe("—");
  });
});

describe("precioACentavos", () => {
  it("convierte string y number a centavos enteros", () => {
    expect(precioACentavos("1500")).toBe(150000);
    expect(precioACentavos(1500)).toBe(150000);
    expect(precioACentavos("0.10")).toBe(10);
  });

  it("redondea al centavo más cercano", () => {
    expect(precioACentavos("10.005")).toBe(1001);
    expect(precioACentavos("10.004")).toBe(1000);
  });

  it("devuelve 0 ante un precio no numérico", () => {
    expect(precioACentavos("no es un precio")).toBe(0);
    expect(precioACentavos(undefined)).toBe(0);
  });

  it("acumula sin drift de punto flotante", () => {
    // 0.10 * 7 sumado diez veces en floats da 7.000000000000001.
    const centavos = Array.from({ length: 10 }).reduce(
      (total) => total + precioACentavos("0.10") * 7,
      0,
    );
    expect(centavos).toBe(700);
  });
});

describe("formatPrecio", () => {
  it("usa punto para miles y NO emite decimales", () => {
    expect(formatPrecio("45000")).toBe("$ 45.000");
    expect(formatPrecio(1500)).toBe("$ 1.500");
    expect(formatPrecio("999")).toBe("$ 999");
  });

  // Los montos del sistema son enteros (`Product.precio` es `Decimal(10, 0)`),
  // así que esto no debería llegar. Se fija igual: una respuesta cacheada de
  // antes de la migración, o un valor escrito a mano en la base, tiene que
  // mostrarse redondeado y no con una cola de decimales en medio de una
  // pantalla donde todo el resto va sin centavos.
  it("redondea un valor con centavos en vez de arrastrarlos", () => {
    expect(formatPrecio("1500.60")).toBe("$ 1.501");
    expect(formatPrecio("1500.40")).toBe("$ 1.500");
  });

  it("degrada a $ 0 ante un valor ilegible, sin romper la pantalla", () => {
    expect(formatPrecio("no es un precio")).toBe("$ 0");
    expect(formatPrecio(undefined)).toBe("$ 0");
  });
});

describe("formatearPrecioInput", () => {
  it("formatea los miles mientras se tipea", () => {
    expect(formatearPrecioInput("10000")).toEqual({ formateado: "10.000", crudo: "10000" });
  });

  it("descarta cualquier separador decimal: los precios son enteros", () => {
    // La coma no abre una parte decimal, se ignora como cualquier otro
    // carácter que no sea dígito. El backend rechaza los centavos con un 400,
    // así que el campo no tiene por qué dejar escribirlos.
    expect(formatearPrecioInput("1500,").crudo).toBe("1500");
    expect(formatearPrecioInput("$1.500 ").crudo).toBe("1500");
  });

  it("saca los ceros a la izquierda y tolera el campo vacío", () => {
    expect(formatearPrecioInput("007").crudo).toBe("7");
    expect(formatearPrecioInput("")).toEqual({ formateado: "", crudo: "" });
  });
});

describe("formatearPrecioParaEdicion", () => {
  it("precarga un valor entero del backend", () => {
    expect(formatearPrecioParaEdicion("1500")).toEqual({ formateado: "1.500", crudo: "1500" });
  });

  // ESTE es el motivo por el que la función no se reemplazó por
  // `formatearPrecioInput`: esa tira todo lo que no sea dígito, así que un
  // "1500.00" precargaría "150000" — un precio cien veces mayor, sin error ni
  // aviso. Puede llegar desde una respuesta cacheada de antes de la migración.
  it("interpreta el punto como separador decimal, no lo borra (bug de 100x)", () => {
    expect(formatearPrecioParaEdicion("1500.00")).toEqual({ formateado: "1.500", crudo: "1500" });
    expect(formatearPrecioInput("1500.00").crudo).toBe("150000");
  });

  it("redondea los centavos, porque el campo no puede representarlos", () => {
    expect(formatearPrecioParaEdicion("1500.60").crudo).toBe("1501");
  });

  it("devuelve campos vacíos ante un valor ilegible", () => {
    expect(formatearPrecioParaEdicion("abc")).toEqual({ formateado: "", crudo: "" });
  });
});
