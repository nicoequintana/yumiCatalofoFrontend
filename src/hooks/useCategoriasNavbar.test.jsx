import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

  it("dos destacadas con el mismo ordenHome desempatan por nombre, no por el orden de llegada", () => {
    // Sin desempate explícito, esto sólo "funciona" hoy porque el backend
    // devuelve `orderBy: { nombre: "asc" }` y el sort es estable — un
    // invariante que nadie declaraba acá. Se arma a propósito con "Zapatos"
    // ANTES que "Almohadas" en `crudas`, para que un desempate que dependiera
    // del orden de llegada (en vez del nombre) fallara este test.
    const crudas = [
      { id: 1, nombre: "Zapatos", cantidadPublicados: 4, destacadaEnHome: true, ordenHome: 0 },
      { id: 2, nombre: "Almohadas", cantidadPublicados: 2, destacadaEnHome: true, ordenHome: 0 },
    ];

    expect(ordenarParaHome(crudas).map((c) => c.nombre)).toEqual(["Almohadas", "Zapatos"]);
  });

  it("descarta una categoría publicada cuyo nombre no produce ningún slug", () => {
    // `rutaCategoria` (utils/slug.js) devuelve `null` cuando el nombre es sólo
    // símbolos: no hay forma de armar `/coleccion/categoria/`. El hook viejo
    // (`useCategoriasDestacadas`) la descartaba con este mismo guard; sin él acá,
    // `CirculosCategoria` la renderiza con `<Link to={null}>`, y React Router
    // explota al desestructurar `pathname` de ese valor.
    const crudas = [
      { id: 1, nombre: "###", cantidadPublicados: 3, destacadaEnHome: false, ordenHome: 0 },
      { id: 2, nombre: "Hogar", cantidadPublicados: 5, destacadaEnHome: false, ordenHome: 0 },
    ];

    expect(ordenarParaHome(crudas).map((c) => c.nombre)).toEqual(["Hogar"]);
  });

  it("integración real: una categoría sin slug posible queda afuera de la fila en vez de romperla", async () => {
    // A diferencia del resto de este archivo, este test NO mockea
    // `useCategoriasHome`: deja correr la cadena real (`ordenarParaHome` +
    // `useCategoriasCrudas`) contra el componente real, para que el guard se
    // pruebe donde importa — si el filtro faltara, esto es lo que reproduce el
    // crash de `<Link to={null}>`, no una simple diferencia de longitud.
    getCategoriasMock.mockResolvedValue([
      { id: 1, nombre: "###", cantidadPublicados: 3, destacadaEnHome: false, ordenHome: 0, icono: null },
      { id: 2, nombre: "Hogar", cantidadPublicados: 5, destacadaEnHome: false, ordenHome: 0, icono: null },
    ]);

    const { default: CirculosCategoria } = await import("../components/CirculosCategoria.jsx");

    render(<CirculosCategoria />, { wrapper: MemoryRouter });

    await waitFor(() => expect(screen.getByText("Hogar")).toBeInTheDocument());
    expect(screen.queryByText("###")).not.toBeInTheDocument();
  });
});
