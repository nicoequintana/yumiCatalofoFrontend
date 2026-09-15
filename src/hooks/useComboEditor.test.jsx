import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import useComboEditor from "./useComboEditor.js";
import * as combosApi from "../api/combos.js";
import * as productsApi from "../api/products.js";
import { DEBOUNCE_BUSQUEDA_MS } from "./useTablaAdmin.js";

vi.mock("../api/combos.js");
vi.mock("../api/products.js");

const OPCIONES = {
  minUnidades: 2, maxUnidades: 10, porcentajeMin: 5, porcentajeMax: 50,
  largoMaxNombre: 120, largoMaxFrase: 140, vigencias: ["SIEMPRE", "CAMPANIA"],
};
const LAMPARA = { id: 1, nombre: "Lámpara", sku: "LAM-01", precio: "10000", stock: 9 };

beforeEach(() => {
  vi.clearAllMocks();
  combosApi.getOpcionesCombo.mockResolvedValue(OPCIONES);
  combosApi.cotizarCombo.mockResolvedValue(null);
  productsApi.getProducts.mockResolvedValue({ data: [], page: 1, pageSize: 8, total: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useComboEditor — alta", () => {
  it("sin id arranca en blanco, sin pedir el detalle, y lee las opciones de la API", async () => {
    const { result } = renderHook(() => useComboEditor(null));

    await waitFor(() => expect(result.current.opciones).toEqual(OPCIONES));
    expect(result.current.cargando).toBe(false);
    expect(combosApi.getAdminCombo).not.toHaveBeenCalled();
    expect(result.current.cambios).toEqual({ nombre: "", frase: "", porcentaje: 15, vigencia: "SIEMPRE", activo: false, heroUrl: null, items: [] });
  });

  it("agregarProducto suma una fila con cantidad 1 (sin duplicar), quitarProducto la saca", () => {
    const { result } = renderHook(() => useComboEditor(null));

    act(() => result.current.agregarProducto(LAMPARA));
    act(() => result.current.agregarProducto(LAMPARA));
    expect(result.current.cambios.items).toEqual([{ productId: 1, nombre: "Lámpara", sku: "LAM-01", precio: "10000", stock: 9, cantidad: 1 }]);

    act(() => result.current.quitarProducto(1));
    expect(result.current.cambios.items).toEqual([]);
  });

  it("cambiarCantidad actualiza solo esa fila", () => {
    const { result } = renderHook(() => useComboEditor(null));
    act(() => result.current.agregarProducto(LAMPARA));
    act(() => result.current.agregarProducto({ ...LAMPARA, id: 2, nombre: "Mesa" }));

    act(() => result.current.cambiarCantidad(1, 3));

    expect(result.current.cambios.items.map((i) => i.cantidad)).toEqual([3, 1]);
  });

  it("guardar sin id llama a crearCombo con la lista tal cual y deja que el backend valide", async () => {
    combosApi.crearCombo.mockResolvedValue({ id: 9 });
    const { result } = renderHook(() => useComboEditor(null));
    act(() => {
      result.current.setCambios((c) => ({ ...c, nombre: "Kit", frase: "Frase.", porcentaje: 20 }));
      result.current.agregarProducto(LAMPARA);
    });

    let guardado;
    await act(async () => {
      guardado = await result.current.guardar();
    });

    expect(guardado).toEqual({ id: 9 });
    expect(combosApi.crearCombo).toHaveBeenCalledWith({
      nombre: "Kit", frase: "Frase.", porcentaje: 20, vigencia: "SIEMPRE", activo: false,
      items: [{ productId: 1, cantidad: 1 }],
    });
  });

  it("un 400 del backend deja su mensaje en error y guardar devuelve null", async () => {
    combosApi.crearCombo.mockRejectedValue(new Error("Un combo necesita al menos 2 unidades entre todos sus productos."));
    const { result } = renderHook(() => useComboEditor(null));

    let guardado;
    await act(async () => {
      guardado = await result.current.guardar();
    });

    expect(guardado).toBeNull();
    expect(result.current.error).toBe("Un combo necesita al menos 2 unidades entre todos sus productos.");
  });

  it("subirHero en el alta no pide nada y avisa que primero hay que guardar", async () => {
    const { result } = renderHook(() => useComboEditor(null));

    await act(async () => {
      await result.current.subirHero(new File(["x"], "hero.jpg", { type: "image/jpeg" }));
    });

    expect(combosApi.guardarHeroCombo).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Guardá el combo antes de cargar la imagen principal.");
  });
});

describe("useComboEditor — edición", () => {
  const DETALLE = {
    id: 3, nombre: "Kit Living", frase: "Frase.", porcentaje: 15, activo: true, vigencia: "CAMPANIA",
    heroUrl: "https://x/hero.jpg",
    items: [{ productId: 1, nombre: "Lámpara", sku: "LAM-01", precio: "10000", stock: 9, cantidad: 2 }],
    campanias: [{ id: 4, nombre: "Navidad", estado: "HABILITADA", desde: "2026-12-01T03:00:00.000Z", hasta: "2026-12-25T03:00:00.000Z" }],
  };

  it("con id carga el detalle y lo vuelca en cambios", async () => {
    combosApi.getAdminCombo.mockResolvedValue(DETALLE);
    const { result } = renderHook(() => useComboEditor(3));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(combosApi.getAdminCombo).toHaveBeenCalledWith(3);
    expect(result.current.combo).toEqual(DETALLE);
    expect(result.current.cambios).toEqual({
      nombre: "Kit Living", frase: "Frase.", porcentaje: 15, vigencia: "CAMPANIA", activo: true, heroUrl: "https://x/hero.jpg",
      items: [{ productId: 1, nombre: "Lámpara", sku: "LAM-01", precio: "10000", stock: 9, cantidad: 2 }],
    });
  });

  it("guardar con id llama a actualizarCombo y refresca el combo con la respuesta", async () => {
    combosApi.getAdminCombo.mockResolvedValue(DETALLE);
    combosApi.actualizarCombo.mockResolvedValue({ ...DETALLE, nombre: "Kit Living 2" });
    const { result } = renderHook(() => useComboEditor(3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.guardar();
    });

    expect(combosApi.actualizarCombo).toHaveBeenCalledWith(3, expect.objectContaining({ items: [{ productId: 1, cantidad: 2 }] }));
    expect(result.current.combo.nombre).toBe("Kit Living 2");
  });

  it("subirHero con id sube y actualiza heroUrl; quitarHero lo limpia y apaga el combo", async () => {
    combosApi.getAdminCombo.mockResolvedValue(DETALLE);
    combosApi.guardarHeroCombo.mockResolvedValue({ ...DETALLE, heroUrl: "https://x/nuevo.jpg" });
    combosApi.quitarHeroCombo.mockResolvedValue({ ...DETALLE, heroUrl: null, activo: false });
    const { result } = renderHook(() => useComboEditor(3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.subirHero(new File(["x"], "hero.jpg", { type: "image/jpeg" }));
    });
    expect(result.current.cambios.heroUrl).toBe("https://x/nuevo.jpg");

    await act(async () => {
      await result.current.quitarHero();
    });
    expect(result.current.cambios).toMatchObject({ heroUrl: null, activo: false });
  });
});

describe("useComboEditor — cotización y búsqueda con debounce", () => {
  it("pide cotizar cuando cambian items o porcentaje, no por el nombre", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useComboEditor(null));
    act(() => result.current.agregarProducto(LAMPARA));

    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(combosApi.cotizarCombo).toHaveBeenCalledWith({ items: [{ productId: 1, cantidad: 1 }], porcentaje: 15 });

    combosApi.cotizarCombo.mockClear();
    act(() => result.current.setCambios((c) => ({ ...c, nombre: "Otro nombre" })));
    await act(async () => {
      vi.advanceTimersByTime(400);
    });
    expect(combosApi.cotizarCombo).not.toHaveBeenCalled();
  });

  it("buscar por nombre o SKU pide GET /products?search= en vista admin", async () => {
    vi.useFakeTimers();
    productsApi.getProducts.mockResolvedValue({ data: [LAMPARA], page: 1, pageSize: 8, total: 1 });
    const { result } = renderHook(() => useComboEditor(null));

    act(() => result.current.setBusqueda("lam"));
    await act(async () => {
      vi.advanceTimersByTime(DEBOUNCE_BUSQUEDA_MS);
    });

    expect(productsApi.getProducts).toHaveBeenCalledWith({ admin: true, search: "lam", page: 1, pageSize: 8 });
    expect(result.current.resultados).toEqual([LAMPARA]);
  });

  it("cotizar trae `limitante` y `items` resueltos del backend, sin tocarlos", async () => {
    vi.useFakeTimers();
    const COTIZACION = {
      precioSeparado: "10000", precioCombo: "8500", ahorro: "1500", unidades: 1,
      alcanza: 3, disponible: true, quedanPocos: false, precioSueltoHoy: "10000", avisoMasCaro: false,
      limitante: { productId: 1, nombre: "Lámpara" },
      items: [{ productId: 1, descuento: { porcentaje: 20, promocionId: 7, promocionNombre: "Hot Sale" } }],
    };
    combosApi.cotizarCombo.mockResolvedValue(COTIZACION);
    const { result } = renderHook(() => useComboEditor(null));
    act(() => result.current.agregarProducto(LAMPARA));

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(result.current.cotizacion).toEqual(COTIZACION);
  });
});

describe('useComboEditor — indicador de "Cambios sin guardar"', () => {
  it("arranca sin cambios sin guardar, en alta y en edición", async () => {
    combosApi.getAdminCombo.mockResolvedValue({
      id: 3, nombre: "Kit", frase: "F.", porcentaje: 15, activo: true, vigencia: "SIEMPRE",
      heroUrl: null, items: [], campanias: [],
    });

    const alta = renderHook(() => useComboEditor(null));
    expect(alta.result.current.sucio).toBe(false);

    const edicion = renderHook(() => useComboEditor(3));
    await waitFor(() => expect(edicion.result.current.cargando).toBe(false));
    expect(edicion.result.current.sucio).toBe(false);
  });

  it("setCambios, agregarProducto, quitarProducto y cambiarCantidad marcan el combo sucio", () => {
    const { result } = renderHook(() => useComboEditor(null));

    act(() => result.current.setCambios((c) => ({ ...c, nombre: "Kit" })));
    expect(result.current.sucio).toBe(true);

    const otro = renderHook(() => useComboEditor(null));
    act(() => otro.result.current.agregarProducto(LAMPARA));
    expect(otro.result.current.sucio).toBe(true);

    const otro2 = renderHook(() => useComboEditor(null));
    act(() => otro2.result.current.agregarProducto(LAMPARA));
    act(() => otro2.result.current.cambiarCantidad(1, 2));
    expect(otro2.result.current.sucio).toBe(true);

    const otro3 = renderHook(() => useComboEditor(null));
    act(() => otro3.result.current.agregarProducto(LAMPARA));
    act(() => otro3.result.current.quitarProducto(1));
    expect(otro3.result.current.sucio).toBe(true);
  });

  it("guardar limpia el indicador de cambios sin guardar", async () => {
    combosApi.crearCombo.mockResolvedValue({ id: 9 });
    const { result } = renderHook(() => useComboEditor(null));
    act(() => {
      result.current.setCambios((c) => ({ ...c, nombre: "Kit", frase: "Frase.", porcentaje: 20 }));
      result.current.agregarProducto(LAMPARA);
    });
    expect(result.current.sucio).toBe(true);

    await act(async () => {
      await result.current.guardar();
    });
    expect(result.current.sucio).toBe(false);
  });

  it("un error al guardar deja el indicador como estaba", async () => {
    const DETALLE = {
      id: 3, nombre: "Kit", frase: "F.", porcentaje: 15, activo: true, vigencia: "SIEMPRE",
      heroUrl: null, items: [{ productId: 1, nombre: "Lámpara", sku: "LAM-01", precio: "10000", stock: 9, cantidad: 2 }], campanias: [],
    };
    combosApi.getAdminCombo.mockResolvedValue(DETALLE);
    combosApi.actualizarCombo.mockRejectedValue(new Error("No se pudo guardar."));
    const { result } = renderHook(() => useComboEditor(3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.setCambios((c) => ({ ...c, nombre: "Kit 2" })));
    expect(result.current.sucio).toBe(true);

    await act(async () => {
      await result.current.guardar();
    });
    expect(result.current.sucio).toBe(true);
  });

  it("subirHero y quitarHero NO marcan sucio: ya quedaron persistidos", async () => {
    const DETALLE = {
      id: 3, nombre: "Kit", frase: "F.", porcentaje: 15, activo: true, vigencia: "SIEMPRE",
      heroUrl: "https://x/hero.jpg", items: [], campanias: [],
    };
    combosApi.getAdminCombo.mockResolvedValue(DETALLE);
    combosApi.guardarHeroCombo.mockResolvedValue({ ...DETALLE, heroUrl: "https://x/nuevo.jpg" });
    combosApi.quitarHeroCombo.mockResolvedValue({ ...DETALLE, heroUrl: null, activo: false });
    const { result } = renderHook(() => useComboEditor(3));
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(async () => {
      await result.current.subirHero(new File(["x"], "hero.jpg", { type: "image/jpeg" }));
    });
    expect(result.current.sucio).toBe(false);

    await act(async () => {
      await result.current.quitarHero();
    });
    expect(result.current.sucio).toBe(false);
  });
});
