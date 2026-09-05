import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCategoriasMock = vi.fn();
vi.mock("../api/categorias.js", () => ({ getCategorias: () => getCategoriasMock() }));

const {
  default: useCategoriasNavbar,
  reiniciarCategoriasNavbar,
  ordenarParaHome,
} = await import("./useCategoriasNavbar.js");

const CATEGORIAS = [
  { id: 1009, nombre: "Accesorios", cantidadProductos: 19, cantidadPublicados: 18 },
  { id: 1, nombre: "Art. Hogar", cantidadProductos: 0, cantidadPublicados: 0 },
  { id: 1002, nombre: "Cocina", cantidadProductos: 28, cantidadPublicados: 27 },
];

beforeEach(() => {
  reiniciarCategoriasNavbar();
  vi.clearAllMocks();
  getCategoriasMock.mockResolvedValue(CATEGORIAS);
});

describe("useCategoriasNavbar", () => {
  it("descarta las categorías sin nada publicado: su link cae en una grilla vacía", async () => {
    const { result } = renderHook(() => useCategoriasNavbar());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.categorias.map((c) => c.nombre)).toEqual(["Cocina", "Accesorios"]);
  });

  it("un solo fetch aunque monten varios consumidores", async () => {
    const primero = renderHook(() => useCategoriasNavbar());
    renderHook(() => useCategoriasNavbar());

    await waitFor(() => expect(primero.result.current.resuelto).toBe(true));
    expect(getCategoriasMock).toHaveBeenCalledTimes(1);
  });

  it("falla blanda: sin categorías el navbar sigue andando", async () => {
    getCategoriasMock.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useCategoriasNavbar());

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.categorias).toEqual([]);
  });
});

describe("useCategoriasHome", () => {
  it("las destacadas van primero, en su ordenHome; el resto alfabético", () => {
    // `destacadaEnHome` deja de decidir QUIÉN entra y pasa a decidir QUIÉN va
    // primero. Así el interruptor del panel no queda muerto.
    const crudas = [
      { id: 1, nombre: "Mascotas", cantidadPublicados: 7, destacadaEnHome: false, ordenHome: 0 },
      { id: 2, nombre: "Cocina", cantidadPublicados: 27, destacadaEnHome: true, ordenHome: 1 },
      { id: 3, nombre: "Hogar", cantidadPublicados: 22, destacadaEnHome: true, ordenHome: 0 },
      { id: 4, nombre: "Iluminación", cantidadPublicados: 10, destacadaEnHome: false, ordenHome: 0 },
    ];

    expect(ordenarParaHome(crudas).map((c) => c.nombre)).toEqual([
      "Hogar",
      "Cocina",
      "Iluminación",
      "Mascotas",
    ]);
  });

  it("filtra por cantidadPublicados, NUNCA por cantidadProductos", () => {
    // `cantidadProductos` cuenta ocultos y agotados: ofrecer una categoría así
    // manda al visitante a una grilla vacía.
    const crudas = [
      { id: 1, nombre: "Art. Hogar", cantidadProductos: 12, cantidadPublicados: 0 },
      { id: 2, nombre: "Cocina", cantidadProductos: 28, cantidadPublicados: 27 },
    ];

    expect(ordenarParaHome(crudas).map((c) => c.nombre)).toEqual(["Cocina"]);
  });
});
