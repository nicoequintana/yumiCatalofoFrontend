import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import useCombo from "./useCombo.js";

const getComboMock = vi.fn();
vi.mock("../api/combos.js", () => ({ getCombo: (...a) => getComboMock(...a) }));

beforeEach(() => {
  getComboMock.mockReset();
});

describe("useCombo", () => {
  it("carga el detalle", async () => {
    getComboMock.mockResolvedValue({ id: 1, nombre: "Kit" });
    const { result } = renderHook(() => useCombo("1-kit"));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current).toEqual({ combo: { id: 1, nombre: "Kit" }, cargando: false, error: null, noEncontrado: false });
    expect(getComboMock).toHaveBeenCalledWith("1-kit");
  });

  it("null (404: no existe o no vigente) marca noEncontrado, sin marcar error de carga", async () => {
    getComboMock.mockResolvedValue(null);
    const { result } = renderHook(() => useCombo("999-x"));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.noEncontrado).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it("un error de red marca error, no noEncontrado", async () => {
    getComboMock.mockRejectedValue(new Error("Failed to fetch"));
    const { result } = renderHook(() => useCombo("1-kit"));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(result.current.noEncontrado).toBe(false);
    expect(result.current.error).toBe("Revisá tu conexión e intentá de nuevo.");
  });

  it("con idSlug nulo no pide nada y no queda cargando", () => {
    const { result } = renderHook(() => useCombo(null));
    expect(result.current.cargando).toBe(false);
    expect(getComboMock).not.toHaveBeenCalled();
  });
});
