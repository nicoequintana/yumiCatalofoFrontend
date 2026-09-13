import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getPromocionDestacadaMock = vi.fn();

vi.mock("../api/promociones.js", () => ({
  getPromocionDestacada: (...args) => getPromocionDestacadaMock(...args),
}));

const { default: usePromoDestacada } = await import("./usePromoDestacada.js");

const PROMO = { id: 3, nombre: "Semana del Hogar", finVigencia: "2026-09-21T02:59:59.999Z", productos: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePromoDestacada", () => {
  it("arranca sin resolver y sin promo mientras el fetch está en vuelo", () => {
    getPromocionDestacadaMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePromoDestacada());

    expect(result.current).toEqual({ promo: null, resuelto: false });
  });

  it("resuelve con la promo que devuelve el backend", async () => {
    getPromocionDestacadaMock.mockResolvedValue(PROMO);

    const { result } = renderHook(() => usePromoDestacada());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.promo).toEqual(PROMO);
    expect(getPromocionDestacadaMock).toHaveBeenCalledTimes(1);
  });

  it("resuelve con promo null cuando no hay destacada", async () => {
    getPromocionDestacadaMock.mockResolvedValue(null);

    const { result } = renderHook(() => usePromoDestacada());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.promo).toBeNull();
  });

  // Mismo guard que useOfertas: un fetch fallido que deja `resuelto` en false
  // deja el loader de la home tapando la página para siempre.
  it("resuelve IGUAL cuando el fetch falla, con promo null", async () => {
    getPromocionDestacadaMock.mockRejectedValue(new Error("red caída"));

    const { result } = renderHook(() => usePromoDestacada());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.promo).toBeNull();
  });
});
