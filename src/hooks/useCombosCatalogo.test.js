import { describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useCombosCatalogo from "./useCombosCatalogo.js";

const getCombosMock = vi.fn();
vi.mock("../api/combos.js", () => ({ getCombos: (...a) => getCombosMock(...a) }));

describe("useCombosCatalogo", () => {
  it("carga los combos vigentes", async () => {
    getCombosMock.mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useCombosCatalogo());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.combos).toEqual([{ id: 1 }]);
    expect(result.current.error).toBe(null);
  });

  it("distingue el error de la carga fallida", async () => {
    getCombosMock.mockRejectedValue(new Error("red"));
    const { result } = renderHook(() => useCombosCatalogo());
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.combos).toEqual([]);
    expect(result.current.error).toBe("Revisá tu conexión e intentá de nuevo.");
  });
});
