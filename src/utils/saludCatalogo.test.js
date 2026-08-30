import { describe, it, expect } from "vitest";
import { construirChequeos } from "./saludCatalogo.js";
import { MIN_DESTACADOS } from "../hooks/useDestacados.js";

/**
 * Los umbrales de la pantalla de salud del catálogo.
 *
 * Se testea `construirChequeos` y no el render porque acá lo que puede estar
 * mal no es el markup: es la DECISIÓN de qué cuenta como problema y con qué
 * gravedad. Un umbral corrido no rompe nada visiblemente — simplemente deja de
 * avisar, o avisa de más hasta que el admin aprende a ignorar la pantalla.
 */

/** Un catálogo impecable: todo en cero y el carrusel de la home andando. */
function saludPerfecta(extra = {}) {
  return {
    total: 80,
    publicados: 80,
    ocultos: 0,
    agotados: 0,
    agotadosConVistas: 0,
    sinFotos: 0,
    publicadosSinFotos: 0,
    menosDeDosFotos: 0,
    sinCategoria: 0,
    sinCosto: 0,
    sinVistas: 0,
    publicadosSinVistas: 0,
    destacadosPublicados: MIN_DESTACADOS,
    ...extra,
  };
}

function filas(salud) {
  return construirChequeos(salud).flatMap((seccion) => seccion.filas);
}

function fila(salud, clave) {
  return filas(salud).find((f) => f.clave === clave);
}

describe("construirChequeos", () => {
  it("con todo en cero, ningún chequeo pide atención", () => {
    expect(filas(saludPerfecta()).every((f) => f.estado === "bien")).toBe(true);
  });

  // Un chequeo en cero es la RESPUESTA, no la ausencia de respuesta. Si se
  // filtraran las filas sanas no habría forma de distinguir "está todo bien"
  // de "el chequeo dejó de correr".
  it("las filas en cero siguen presentes", () => {
    const todas = filas(saludPerfecta());
    expect(todas.length).toBeGreaterThanOrEqual(9);
    expect(fila(saludPerfecta(), "publicados-sin-fotos")).toBeDefined();
    expect(fila(saludPerfecta(), "agotados-con-vistas").valor).toBe(0);
  });

  /*
   * Los tres GRAVES. Son los únicos casos en los que hay plata o presencia
   * pública en juego; el resto son avisos. Si alguno se degrada a "aviso", la
   * pantalla deja de distinguir lo urgente de lo prolijo.
   */
  it("es GRAVE que la home no llegue al mínimo de destacados", () => {
    const f = fila(saludPerfecta({ destacadosPublicados: MIN_DESTACADOS - 1 }), "destacados");
    expect(f.estado).toBe("grave");
    expect(f.detalle).toMatch(/NO se está mostrando/);
  });

  it("es BIEN cuando hay destacados de sobra", () => {
    const f = fila(saludPerfecta({ destacadosPublicados: MIN_DESTACADOS + 3 }), "destacados");
    expect(f.estado).toBe("bien");
  });

  it("es GRAVE un producto publicado sin ninguna foto", () => {
    expect(fila(saludPerfecta({ publicadosSinFotos: 1 }), "publicados-sin-fotos").estado).toBe(
      "grave",
    );
  });

  it("es GRAVE un agotado que igual recibe visitas", () => {
    expect(fila(saludPerfecta({ agotadosConVistas: 2 }), "agotados-con-vistas").estado).toBe(
      "grave",
    );
  });

  // Ocultar un producto es deliberado y agotarse es normal: avisan, no alarman.
  it("ocultos y agotados son solo AVISO", () => {
    expect(fila(saludPerfecta({ ocultos: 5 }), "ocultos").estado).toBe("aviso");
    expect(fila(saludPerfecta({ agotados: 5 }), "agotados").estado).toBe("aviso");
  });

  it("cada fila con acción apunta a una ruta del panel que existe", () => {
    const rutas = filas(saludPerfecta())
      .filter((f) => f.accion)
      .map((f) => f.accion.a.split("?")[0]);

    for (const ruta of rutas) {
      expect([
        "/catalogo/admin/productos",
        "/catalogo/admin/productos/precios",
      ]).toContain(ruta);
    }
  });

  // No hay forma de ordenar el listado por "menos vistas primero", así que
  // esta fila NO ofrece link. Un botón que no filtra es peor que ninguno:
  // manda a buscar a mano en 80 filas creyendo que ya está filtrado.
  it("la fila de sin visitas no ofrece acción, porque no hay a dónde llevar", () => {
    expect(fila(saludPerfecta({ publicadosSinVistas: 23 }), "sin-vistas").accion).toBeUndefined();
  });

  it("tolera una respuesta sin la clave de publicados sin romper el denominador", () => {
    const sinPublicados = { ...saludPerfecta(), publicados: undefined };
    expect(() => construirChequeos(sinPublicados)).not.toThrow();
    expect(fila(sinPublicados, "sin-vistas").de).toBe(0);
  });
});
