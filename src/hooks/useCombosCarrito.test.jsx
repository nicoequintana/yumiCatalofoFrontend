import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import useCombosCarrito, { reiniciarCombosCarrito } from "./useCombosCarrito.js";
import * as combosApi from "../api/combos.js";

vi.mock("../api/combos.js");

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarCombosCarrito();
});

describe("useCombosCarrito", () => {
  it("pide GET /combos?ids= con los ids de la clave y entrega los combos", async () => {
    combosApi.getCombos.mockResolvedValue([{ id: 3, vigente: true }]);

    const { result } = renderHook(() => useCombosCarrito("3,7"));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(combosApi.getCombos).toHaveBeenCalledWith({ ids: [3, 7] });
    expect(result.current).toEqual({
      combos: [{ id: 3, vigente: true }],
      cargando: false,
      error: false,
      revalidando: false,
    });
  });

  it("sin combos en el carrito NO pide nada (GET /combos a secas traería todos los vigentes)", async () => {
    const { result } = renderHook(() => useCombosCarrito(""));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(combosApi.getCombos).not.toHaveBeenCalled();
    expect(result.current.combos).toEqual([]);
  });

  it("con cache revalida en segundo plano: revalidando hasta que contesta", async () => {
    combosApi.getCombos.mockResolvedValueOnce([{ id: 3, vigente: true }]);
    const primero = renderHook(() => useCombosCarrito("3"));
    await waitFor(() => expect(primero.result.current.cargando).toBe(false));
    primero.unmount();

    combosApi.getCombos.mockReturnValueOnce(new Promise(() => {}));
    const segundo = renderHook(() => useCombosCarrito("3"));

    expect(segundo.result.current).toMatchObject({
      combos: [{ id: 3, vigente: true }],
      cargando: false,
      revalidando: true,
    });
  });

  it("una clave vacía (carrito sin combos) no borra el cache de los combos ya cargados", async () => {
    combosApi.getCombos.mockResolvedValueOnce([{ id: 3, vigente: true }]);
    const primero = renderHook(() => useCombosCarrito("3"));
    await waitFor(() => expect(primero.result.current.cargando).toBe(false));
    primero.unmount();

    const vacio = renderHook(() => useCombosCarrito(""));
    await waitFor(() => expect(vacio.result.current.revalidando).toBe(false));
    vacio.unmount();

    combosApi.getCombos.mockReturnValueOnce(new Promise(() => {}));
    const tercero = renderHook(() => useCombosCarrito("3"));

    expect(tercero.result.current).toMatchObject({
      combos: [{ id: 3, vigente: true }],
      cargando: false,
      revalidando: true,
    });
  });

  it("un fetch que falla gana el error aunque haya cache", async () => {
    combosApi.getCombos.mockResolvedValueOnce([{ id: 3, vigente: true }]);
    const primero = renderHook(() => useCombosCarrito("3"));
    await waitFor(() => expect(primero.result.current.cargando).toBe(false));
    primero.unmount();

    combosApi.getCombos.mockRejectedValueOnce(new Error("red"));
    const segundo = renderHook(() => useCombosCarrito("3"));

    await waitFor(() => expect(segundo.result.current.error).toBe(true));
  });
});
