import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Favoritos from "./Favoritos.jsx";
import useFavoritos from "../hooks/useFavoritos.js";
import * as productsApi from "../api/products.js";

vi.mock("../api/products.js");

// `useWhatsapp` pide su propia config; el botón no aporta nada a estos tests.
vi.mock("../components/BotonWhatsapp.jsx", () => ({ default: () => null }));

function renderFavoritos() {
  return render(
    <MemoryRouter>
      <Favoritos />
    </MemoryRouter>,
  );
}

describe("Favoritos — fallo de red", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un error y apaga el spinner si no se pueden cargar los productos", async () => {
    productsApi.getProductsByIds.mockRejectedValue(new Error("network down"));

    renderFavoritos();

    expect(
      await screen.findByText(/No pudimos cargar tus favoritos/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando favoritos…")).not.toBeInTheDocument();
  });
});

// En este entorno `globalThis.localStorage` es un objeto vacío sin métodos
// (Node arranca con `--localstorage-file` sin path y tapa la implementación de
// jsdom), así que no se puede usar ni espiar. Igual que en
// `useTemaAdmin.test.jsx`, se instala un Storage falso completo sobre el
// global (la propiedad es `configurable`) y se restaura después.
//
// Acá el falso tiene que guardar de verdad, no solo registrar llamadas:
// `useFavoritos` inicializa el estado de cada instancia leyendo el storage, y
// esta página monta la suya después de que el test dejó favoritos cargados.
const localStorageOriginal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function instalarStorage() {
  const datos = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
      setItem: (clave, valor) => datos.set(clave, String(valor)),
      removeItem: (clave) => datos.delete(clave),
      clear: () => datos.clear(),
    },
    configurable: true,
    writable: true,
  });
}

function restaurarStorage() {
  if (localStorageOriginal) {
    Object.defineProperty(globalThis, "localStorage", localStorageOriginal);
  } else {
    delete globalThis.localStorage;
  }
}

describe("Favoritos — limpieza de ids obsoletos", () => {
  beforeEach(() => {
    instalarStorage();
    // El espejo a nivel módulo de `useFavoritos` sobrevive entre tests, así
    // que se resetea a través de la API del hook (mismo criterio que
    // `useFavoritos.test.jsx`).
    const { result } = renderHook(() => useFavoritos());
    act(() => {
      result.current.establecerFavoritos([]);
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    restaurarStorage();
  });

  it("no resucita un favorito que se quitó mientras la carga estaba en vuelo", async () => {
    // 99 ya no existe (el admin lo borró): su ausencia en la respuesta es lo
    // que dispara la reconciliación. 1 y 2 sí existen.
    const hook = renderHook(() => useFavoritos());
    act(() => {
      hook.result.current.establecerFavoritos([1, 2, 99]);
    });

    let resolverCarga;
    productsApi.getProductsByIds.mockReturnValue(
      new Promise((resolve) => {
        resolverCarga = resolve;
      }),
    );

    renderFavoritos();

    // El usuario toca el corazón del 2 con la carga todavía en vuelo. El
    // array que la respuesta trae en su closure sigue siendo el previo al
    // toggle.
    act(() => {
      hook.result.current.toggleFavorito(2);
    });
    expect(hook.result.current.favoritos).toEqual([1, 99]);

    await act(async () => {
      resolverCarga([
        { id: 1, nombre: "Reloj Clásico", etiqueta: null, categoria: null, precio: "1000", fotos: [] },
        { id: 2, nombre: "Anillo Fino", etiqueta: null, categoria: null, precio: "2000", fotos: [] },
      ]);
    });

    // La limpieza tiene que partir del estado ACTUAL, no del capturado al
    // montar: saca el 99 obsoleto y deja el 2 fuera, como lo dejó el usuario.
    await waitFor(() => {
      expect(hook.result.current.favoritos).toEqual([1]);
    });
    expect(screen.queryByText("Anillo Fino")).not.toBeInTheDocument();
  });

  it("deja los favoritos intactos cuando ningún id quedó obsoleto", async () => {
    const hook = renderHook(() => useFavoritos());
    act(() => {
      hook.result.current.establecerFavoritos([1]);
    });

    productsApi.getProductsByIds.mockResolvedValue([
      { id: 1, nombre: "Reloj Clásico", etiqueta: null, categoria: null, precio: "1000", fotos: [] },
    ]);

    renderFavoritos();

    expect(await screen.findByText("Reloj Clásico")).toBeInTheDocument();
    expect(hook.result.current.favoritos).toEqual([1]);
  });
});
