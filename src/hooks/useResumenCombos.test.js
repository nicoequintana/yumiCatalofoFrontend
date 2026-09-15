import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useResumenCombos from "./useResumenCombos.js";

const getResumenCombosMock = vi.fn();
vi.mock("../api/combos.js", () => ({ getResumenCombos: (...a) => getResumenCombosMock(...a) }));

describe("useResumenCombos", () => {
  it("devuelve el resumen que manda el backend, sin recalcular", async () => {
    getResumenCombosMock.mockResolvedValue({ cantidad: 2, porcentajeMaximo: 30 });
    const { result } = renderHook(() => useResumenCombos());
    expect(result.current.resumen).toBeNull();
    await waitFor(() => expect(result.current.resumen).toEqual({ cantidad: 2, porcentajeMaximo: 30 }));
  });

  it("si falla, el resumen queda en null (el encabezado sale sin la línea de datos)", async () => {
    let rechazar;
    getResumenCombosMock.mockImplementation(() => new Promise((_, r) => { rechazar = r; }));
    const { result } = renderHook(() => useResumenCombos());
    rechazar(new Error("caído"));
    await new Promise((r) => setTimeout(r, 0));
    expect(result.current.resumen).toBeNull();
  });
});
