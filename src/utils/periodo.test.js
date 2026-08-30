import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DESFASE_ARGENTINA_MS,
  calcularRango,
  claveDiaArgentino,
  enHorarioArgentino,
  inicioDelDiaArgentino,
} from "./periodo.js";

/**
 * La MISMA tabla de casos que `backend/src/lib/horarioArgentino.test.js`.
 *
 * No es duplicación por descuido: los dos repos se publican por separado y no
 * se pueden comparar en la misma corrida, así que compartir el set de casos es
 * la única defensa contra que las dos copias de la definición de "día" se
 * desincronicen. Un caso que se agregue de un lado va también del otro.
 *
 * Todos caen en la franja de 21:00 a 24:00 hora local, que es donde el día UTC
 * y el argentino NO coinciden — y donde más se compra.
 */

afterEach(() => {
  vi.useRealTimers();
});

describe("claveDiaArgentino", () => {
  it("una venta de las 22:30 ART pertenece a SU día, no al UTC del día siguiente", () => {
    // 2026-08-16T01:30Z === 2026-08-15T22:30 en Buenos Aires.
    expect(claveDiaArgentino(new Date("2026-08-16T01:30:00Z"))).toBe("2026-08-15");
  });

  it("las 00:30 ART siguen siendo el día que empezó", () => {
    expect(claveDiaArgentino(new Date("2026-08-16T03:30:00Z"))).toBe("2026-08-16");
  });

  it("las 02:00 UTC de un 1 de mes todavía son el último día del mes anterior", () => {
    expect(claveDiaArgentino(new Date("2026-09-01T02:00:00Z"))).toBe("2026-08-31");
  });
});

describe("inicioDelDiaArgentino", () => {
  it("devuelve el instante UTC de la medianoche de Buenos Aires", () => {
    expect(inicioDelDiaArgentino("2026-08-15")).toEqual(new Date("2026-08-15T03:00:00.000Z"));
  });

  it("es la inversa exacta de claveDiaArgentino", () => {
    for (const clave of ["2026-01-01", "2026-08-15", "2026-12-31"]) {
      expect(claveDiaArgentino(inicioDelDiaArgentino(clave))).toBe(clave);
    }
  });

  it("devuelve null ante una clave ilegible, sin lanzar", () => {
    expect(inicioDelDiaArgentino("no-es-fecha")).toBeNull();
  });
});

describe("enHorarioArgentino", () => {
  it("aplica un desfase fijo de -3 horas, sin horario de verano", () => {
    expect(DESFASE_ARGENTINA_MS).toBe(-3 * 60 * 60 * 1000);
    // Enero (verano austral) y agosto (invierno) se desplazan igual: Argentina
    // no aplica DST desde 2009.
    expect(enHorarioArgentino(new Date("2026-01-10T12:00:00Z")).getUTCHours()).toBe(9);
    expect(enHorarioArgentino(new Date("2026-08-10T12:00:00Z")).getUTCHours()).toBe(9);
  });

  it("devuelve null ante un valor ausente o ilegible", () => {
    expect(enHorarioArgentino(null)).toBeNull();
    expect(enHorarioArgentino(undefined)).toBeNull();
    expect(enHorarioArgentino("cualquier cosa")).toBeNull();
  });
});

describe("calcularRango", () => {
  it("a las 22:00 ART el 'hasta' es HOY, no el día UTC siguiente", () => {
    // 2026-08-16T01:00Z === 2026-08-15T22:00 en Buenos Aires. Con la clave
    // calculada en UTC, `hasta` daba "2026-08-16": un día futuro garantizado
    // vacío como último punto de la serie, y el día más viejo de la ventana
    // caído en silencio.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T01:00:00Z"));

    expect(calcularRango(7)).toEqual({ desde: "2026-08-09", hasta: "2026-08-15" });
  });

  it("fuera de la franja nocturna el rango es el mismo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T15:00:00Z"));

    expect(calcularRango(7)).toEqual({ desde: "2026-08-09", hasta: "2026-08-15" });
  });

  it("una ventana de un día es hoy y solo hoy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T02:59:00Z"));

    expect(calcularRango(1)).toEqual({ desde: "2026-08-15", hasta: "2026-08-15" });
  });

  it("la resta de días no se sale del calendario argentino al cruzar de mes", () => {
    // El ancla de la resta es la medianoche ARGENTINA (03:00 UTC). Restando
    // sobre una medianoche UTC armada a mano, cada extremo volvía a pasar por
    // el desfase y se corría un día más para atrás.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-01T02:00:00Z"));

    expect(calcularRango(30)).toEqual({ desde: "2026-08-02", hasta: "2026-08-31" });
  });
});
