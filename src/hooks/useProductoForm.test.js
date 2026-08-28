import { describe, expect, it } from "vitest";
import { fusionarFotosPorPosicion } from "./useProductoForm.js";

/**
 * `fusionarFotosPorPosicion` es el corazón del fix del CRÍTICO 1 del review:
 * `refrescarFotos` (disparado al adoptar una imagen generada) mergeaba
 * concatenando (servidor primero, locales sin subir después), lo que
 * resucitaba una foto reemplazada en la posición 0/1 mientras mandaba el
 * reemplazo local al final — invirtiendo justo lo que el admin acababa de
 * hacer.
 *
 * Se testea la función pura en aislamiento porque el bug es de lógica de
 * merge, no de integración de componentes — más rápido de iterar y más fácil
 * de leer que reproducirlo a través de todo el árbol del editor.
 */
describe("fusionarFotosPorPosicion", () => {
  it("agregar una foto nueva a la galería: la recién adoptada se anexa LITERAL al final", () => {
    // Antes de refrescar: portada y "problema" persistidas, más una foto local
    // recién arrastrada a la galería (todavía sin subir).
    const valoresFotos = [
      { id: 11, url: "portada.jpg" },
      { id: 12, url: "problema.jpg" },
      { file: {}, url: "blob:local" },
    ];
    // El servidor ya tiene la tercera foto persistida (la recién adoptada).
    const fotosServidor = [
      { id: 11, url: "portada.jpg" },
      { id: 12, url: "problema.jpg" },
      { id: 13, url: "generada-adoptada.jpg" },
    ];
    const idsConocidos = new Set([11, 12]);

    const resultado = fusionarFotosPorPosicion(valoresFotos, fotosServidor, idsConocidos);

    // La local no se mueve de donde estaba (recorre `valoresFotos` en orden,
    // preservando posiciones); la recién adoptada se anexa DESPUÉS de todo,
    // sin heurística de "corte" que la cuele antes de una corrida de locales.
    expect(resultado.map((f) => f.id ?? f.url)).toEqual([11, 12, "blob:local", 13]);
  });

  it("reemplazar la SEGUNDA foto (¿qué problema resuelve?) en un producto de dos: no la corre a la galería", () => {
    // Re-review, hallazgo 2: el `corte` que separaba "la corrida final de
    // locales" del resto confundía este reemplazo con un simple append,
    // porque el local queda último en `valoresFotos` (no hay nada después de
    // él). Portada intacta, "problema" reemplazada por una local.
    const valoresFotos = [{ id: 11, url: "portada.jpg" }, { file: {}, url: "blob:local" }];
    // El servidor todavía tiene la "problema" VIEJA (id12, reemplazo no
    // persistido) más la recién adoptada.
    const fotosServidor = [
      { id: 11, url: "portada.jpg" },
      { id: 12, url: "problema.jpg" },
      { id: 13, url: "generada-adoptada.jpg" },
    ];
    const idsConocidos = new Set([11, 12]);

    const resultado = fusionarFotosPorPosicion(valoresFotos, fotosServidor, idsConocidos);

    // La local sigue en la posición 1 ("¿qué problema resuelve?"), no en la
    // galería (posición 2+).
    expect(resultado[1]).toMatchObject({ url: "blob:local" });
    expect(resultado.some((f) => f.id === 12)).toBe(false);
    expect(resultado.map((f) => f.id ?? f.url)).toEqual([11, "blob:local", 13]);
  });

  it("reemplazar la portada en un producto de UNA sola foto: la adoptada no le roba el lugar", () => {
    // Re-review, hallazgo 2, el caso más grave: sin este fix la imagen
    // generada se volvía la portada del producto.
    const valoresFotos = [{ file: {}, url: "blob:local" }];
    const fotosServidor = [
      { id: 11, url: "portada.jpg" },
      { id: 13, url: "generada-adoptada.jpg" },
    ];
    const idsConocidos = new Set([11]);

    const resultado = fusionarFotosPorPosicion(valoresFotos, fotosServidor, idsConocidos);

    expect(resultado[0]).toMatchObject({ url: "blob:local" });
    expect(resultado.some((f) => f.id === 11)).toBe(false);
    expect(resultado.map((f) => f.id ?? f.url)).toEqual(["blob:local", 13]);
  });

  it("reemplazar la portada: la local queda en posición 0 y la vieja del servidor NO vuelve", () => {
    // La portada se reemplazó localmente (ponerEn(0) la sacó del array por
    // completo); "problema" sigue intacta. El servidor todavía tiene la
    // portada VIEJA (id11) porque el reemplazo recién se persiste al guardar,
    // más una foto nueva adoptada mientras tanto.
    const valoresFotos = [{ file: {}, url: "blob:local" }, { id: 12, url: "problema.jpg" }];
    const fotosServidor = [
      { id: 11, url: "portada.jpg" },
      { id: 12, url: "problema.jpg" },
      { id: 13, url: "generada-adoptada.jpg" },
    ];
    const idsConocidos = new Set([11, 12]);

    const resultado = fusionarFotosPorPosicion(valoresFotos, fotosServidor, idsConocidos);

    // La local sigue en la posición 0 (portada).
    expect(resultado[0]).toMatchObject({ url: "blob:local" });
    // La vieja portada del servidor no reaparece en ningún lado del array.
    expect(resultado.some((f) => f.id === 11)).toBe(false);
    // La recién adoptada sí se agrega.
    expect(resultado.some((f) => f.id === 13)).toBe(true);
    expect(resultado.map((f) => f.id ?? f.url)).toEqual([
      "blob:local",
      12,
      13,
    ]);
  });

  it("sin cambios locales pendientes, solo actualiza las persistidas y agrega las nuevas", () => {
    const valoresFotos = [{ id: 11, url: "portada.jpg" }];
    const fotosServidor = [
      { id: 11, url: "portada-actualizada.jpg" },
      { id: 13, url: "nueva.jpg" },
    ];
    const idsConocidos = new Set([11]);

    const resultado = fusionarFotosPorPosicion(valoresFotos, fotosServidor, idsConocidos);

    expect(resultado).toEqual([
      { id: 11, url: "portada-actualizada.jpg" },
      { id: 13, url: "nueva.jpg" },
    ]);
  });

  it("una foto persistida que ya no está en el servidor se descarta (baja externa)", () => {
    const valoresFotos = [
      { id: 11, url: "portada.jpg" },
      { id: 12, url: "problema.jpg" },
    ];
    const fotosServidor = [{ id: 12, url: "problema.jpg" }];
    const idsConocidos = new Set([11, 12]);

    const resultado = fusionarFotosPorPosicion(valoresFotos, fotosServidor, idsConocidos);

    expect(resultado).toEqual([{ id: 12, url: "problema.jpg" }]);
  });
});
