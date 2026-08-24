import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useGuardaSalida from "./useGuardaSalida.js";

// La cobertura de las cuatro vías del guard vive en `AdminProductoForm.test.jsx`
// (integración con el editor real). Este archivo cubre el caso que solo se puede
// simular a nivel de hook: un Atrás MULTI-ENTRADA (long-press del botón Atrás o
// dropdown de historial), donde el navegador ya trasladó a una URL distinta
// cuando `popstate` llega. Ahí el diálogo es mentiroso: cancelar no cancela
// (el centinela se duplicaría sobre la entrada DESTINO y el editor se desmonta
// igual) y confirmar hace un `history.back()` de más (overshoot). La guarda
// tiene que detectar el cambio de pathname y retirarse sin preguntar.
describe("useGuardaSalida — popstate multi-entrada", () => {
  let confirmar;
  let push;
  let back;

  beforeEach(() => {
    confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    push = vi.spyOn(window.history, "pushState");
    back = vi.spyOn(window.history, "back").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Deshace cualquier cambio de URL que el test haya simulado, para que los
    // siguientes arranquen desde la raíz de jsdom.
    window.history.replaceState(null, "", "/");
  });

  it("si el pathname ya cambió (salto multi-entrada), no pregunta ni re-empuja el centinela", () => {
    renderHook(() => useGuardaSalida(true));

    // Al ensuciarse se empujó el centinela sobre la URL actual.
    expect(push).toHaveBeenCalledTimes(1);

    // Salto multi-entrada: el navegador ya trasladó a otra URL antes de
    // disparar `popstate`. Se simula moviendo el pathname sin pasar por
    // `pushState` (que está espiado contando llamadas del hook).
    window.history.replaceState(null, "", "/catalogo/admin/ordenes");
    fireEvent.popState(window);

    // Preguntar acá sería un diálogo cuya respuesta se ignora: la guarda se
    // retira en silencio (comportamiento pre-fix, sin overshoot).
    expect(confirmar).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it("si el pathname no cambió (Atrás simple), sigue preguntando y cancelar re-empuja el centinela", () => {
    renderHook(() => useGuardaSalida(true));

    expect(push).toHaveBeenCalledTimes(1);

    fireEvent.popState(window);

    expect(confirmar).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledTimes(2);
  });
});
