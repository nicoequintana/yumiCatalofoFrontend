import { describe, expect, it } from "vitest";
import {
  PREFIJO_TAB,
  previsualizarMovimiento,
  resolverSoltar,
  soloDroppablesVisibles,
} from "./dragOrdenes.js";

/** Una tarjeta arrastrada, con la forma que le da `useDraggable`. */
function tarjeta(id, estadoActual) {
  return { id, data: { current: { estadoActual } } };
}

describe("resolverSoltar", () => {
  it("devuelve el movimiento cuando se suelta en otra columna", () => {
    expect(resolverSoltar(tarjeta(42, "PENDIENTE"), { id: "EN_PREPARACION" })).toEqual({
      ordenId: 42,
      origen: "PENDIENTE",
      destino: "EN_PREPARACION",
    });
  });

  it("acepta soltar sobre un TAB y le saca el prefijo", () => {
    // En celular no hay a dónde arrastrar: se ve una columna por vez. Los tabs
    // son la zona de destino ahí, y llevan id propio porque un droppable no
    // puede compartir id con la columna del mismo estado.
    expect(resolverSoltar(tarjeta(42, "PENDIENTE"), { id: `${PREFIJO_TAB}ENTREGADA` })).toEqual({
      ordenId: 42,
      origen: "PENDIENTE",
      destino: "ENTREGADA",
    });
  });

  it("un tab del estado en el que ya está tampoco hace nada", () => {
    expect(resolverSoltar(tarjeta(42, "PENDIENTE"), { id: `${PREFIJO_TAB}PENDIENTE` })).toBeNull();
  });

  it("no hace nada cuando se suelta fuera de toda zona", () => {
    // `over` es null cuando el puntero terminó fuera de cualquier droppable.
    // Es una cancelación, no un error: el diálogo no tiene que abrirse.
    expect(resolverSoltar(tarjeta(42, "PENDIENTE"), null)).toBeNull();
  });

  it("no hace nada cuando la columna destino es la de origen", () => {
    // Preguntarle al admin si quiere notificar un cambio que no cambia nada
    // es ruido puro, y encima dispara un PATCH inútil.
    expect(resolverSoltar(tarjeta(42, "PENDIENTE"), { id: "PENDIENTE" })).toBeNull();
  });

  it("no hace nada si la tarjeta no declara su columna de origen", () => {
    // Sin origen no se puede saber de qué columna sacarla, así que mover
    // igual dejaría la orden duplicada o desaparecida.
    expect(resolverSoltar({ id: 42 }, { id: "ENTREGADA" })).toBeNull();
  });

  it("no hace nada si el id de la tarjeta no es un número de orden", () => {
    expect(resolverSoltar(tarjeta("columna-fantasma", "PENDIENTE"), { id: "ENTREGADA" })).toBeNull();
  });

  it("normaliza el id a número: dnd-kit lo devuelve como string o number", () => {
    expect(resolverSoltar(tarjeta("42", "PENDIENTE"), { id: "CANCELADA" })).toEqual({
      ordenId: 42,
      origen: "PENDIENTE",
      destino: "CANCELADA",
    });
  });
});

describe("soloDroppablesVisibles", () => {
  /** Lo que dnd-kit le pasa a una estrategia de detección de colisión. */
  function args(rects) {
    return {
      droppableRects: new Map(rects.map(([id, rect]) => [id, rect])),
      droppableContainers: rects.map(([id]) => ({ id })),
      collisionRect: { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 },
    };
  }

  const CAJA = { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 };
  const SIN_AREA = { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };

  it("descarta las zonas sin área antes de decidir", () => {
    // ⚠️ Es lo que hace inofensivo el arrastre en celular. Abajo de `lg` las
    // cuatro columnas siguen MONTADAS —hacen falta las cuatro respuestas para
    // que los contadores de los tabs digan la verdad— pero tres están en
    // `display: none`, y dnd-kit las mide 0×0. Sin este filtro, la detección
    // de colisión podría resolver hacia una columna invisible y disparar un
    // cambio de estado que nadie eligió.
    const filtrados = [];
    const estrategia = soloDroppablesVisibles((argumentos) => {
      filtrados.push(...argumentos.droppableContainers.map((c) => c.id));
      return [];
    });

    estrategia(args([["PENDIENTE", CAJA], ["ENTREGADA", SIN_AREA]]));

    expect(filtrados).toEqual(["PENDIENTE"]);
  });

  it("es el MISMO mecanismo el que apaga los tabs en escritorio", () => {
    // Los tabs son `lg:hidden`: en escritorio miden 0×0 y quedan afuera por la
    // misma regla, sin ninguna rama por breakpoint ni `matchMedia`.
    const filtrados = [];
    const estrategia = soloDroppablesVisibles((argumentos) => {
      filtrados.push(...argumentos.droppableContainers.map((c) => c.id));
      return [];
    });

    estrategia(args([["PENDIENTE", CAJA], [`${PREFIJO_TAB}ENTREGADA`, SIN_AREA]]));

    expect(filtrados).toEqual(["PENDIENTE"]);
  });

  it("no colisiona con nada cuando ninguna zona se ve", () => {
    const estrategia = soloDroppablesVisibles(() => [{ id: "no-deberia-llegar" }]);

    expect(estrategia(args([["PENDIENTE", SIN_AREA]]))).toEqual([]);
  });
});

describe("previsualizarMovimiento", () => {
  function columna(ordenes, total) {
    return { ordenes, total, page: 1, cargando: false, error: null, errorPagina: null };
  }

  const COLUMNAS = {
    PENDIENTE: columna([{ id: 1, createdAt: "2026-09-01T12:00:00.000Z" }], 3),
    EN_PREPARACION: columna([], 0),
  };

  it("devuelve las columnas tal cual cuando no hay movimiento pendiente", () => {
    // Identidad de referencia: sin movimiento no tiene que haber ni un objeto
    // nuevo, o React re-renderiza el tablero entero por nada.
    expect(previsualizarMovimiento(COLUMNAS, null)).toBe(COLUMNAS);
  });

  it("muestra la orden en la columna destino mientras se confirma", () => {
    // Sin esto, al soltar la card se ve VOLVER a su columna original detrás
    // del modal — el movimiento real recién ocurre cuando el PATCH responde.
    const previa = previsualizarMovimiento(COLUMNAS, {
      ordenId: 1,
      origen: "PENDIENTE",
      destino: "EN_PREPARACION",
    });

    expect(previa.PENDIENTE.ordenes).toHaveLength(0);
    expect(previa.EN_PREPARACION.ordenes.map((o) => o.id)).toEqual([1]);
  });

  it("mueve también los contadores, para que la vista no se contradiga", () => {
    const previa = previsualizarMovimiento(COLUMNAS, {
      ordenId: 1,
      origen: "PENDIENTE",
      destino: "EN_PREPARACION",
    });

    expect(previa.PENDIENTE.total).toBe(2);
    expect(previa.EN_PREPARACION.total).toBe(1);
  });

  it("NO toca las columnas ajenas al movimiento", () => {
    const conTercera = { ...COLUMNAS, CANCELADA: columna([{ id: 9 }], 1) };
    const previa = previsualizarMovimiento(conTercera, {
      ordenId: 1,
      origen: "PENDIENTE",
      destino: "EN_PREPARACION",
    });

    expect(previa.CANCELADA).toBe(conTercera.CANCELADA);
  });

  it("es puro: no muta las columnas que recibe", () => {
    // Se revierte solo con volver a llamar sin movimiento — por eso cancelar
    // el diálogo no necesita deshacer nada a mano.
    previsualizarMovimiento(COLUMNAS, { ordenId: 1, origen: "PENDIENTE", destino: "EN_PREPARACION" });

    expect(COLUMNAS.PENDIENTE.ordenes).toHaveLength(1);
    expect(COLUMNAS.PENDIENTE.total).toBe(3);
  });

  it("se banca un movimiento cuya orden ya no está en el origen", () => {
    // Pasa si el PATCH volvió y movió la orden de verdad antes de que el
    // diálogo termine de desmontarse.
    const previa = previsualizarMovimiento(COLUMNAS, {
      ordenId: 999,
      origen: "PENDIENTE",
      destino: "EN_PREPARACION",
    });

    expect(previa).toBe(COLUMNAS);
  });
});
