import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MENSAJE_ERROR_CARGA } from "./useOfertas.js";

const getVitrinasCampaniaMock = vi.fn();

vi.mock("../api/campanias.js", () => ({
  getVitrinasCampania: (...args) => getVitrinasCampaniaMock(...args),
}));

const { default: useVitrinasCampania } = await import("./useVitrinasCampania.js");

const VITRINA = {
  campaniaId: 1,
  nombre: "Primavera",
  productos: [{ id: 1, nombre: "Termo Stanley", precio: "48000", fotos: [] }],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useVitrinasCampania", () => {
  it("arranca sin resolver mientras el fetch está en vuelo", () => {
    getVitrinasCampaniaMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useVitrinasCampania());

    expect(result.current).toEqual({ vitrinas: [], error: null, resuelto: false });
  });

  it("resuelve con las vitrinas del backend", async () => {
    getVitrinasCampaniaMock.mockResolvedValue([VITRINA]);

    const { result } = renderHook(() => useVitrinasCampania());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.vitrinas).toEqual([VITRINA]);
    expect(result.current.error).toBeNull();
    expect(getVitrinasCampaniaMock).toHaveBeenCalledTimes(1);
  });

  // "No hay campañas" y "el backend no contestó" son dos estados distintos.
  it("distingue falló la carga de no hay campañas, y resuelve IGUAL", async () => {
    getVitrinasCampaniaMock.mockRejectedValue(new Error("red caída"));

    const { result } = renderHook(() => useVitrinasCampania());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.error).toBe(MENSAJE_ERROR_CARGA);
    expect(result.current.vitrinas).toEqual([]);
  });
});
