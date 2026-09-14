import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout.jsx";
import useCarrito from "../hooks/useCarrito.js";
import usePerfilCliente from "../hooks/usePerfilCliente.js";
import { reiniciarProductosCarrito } from "../hooks/useProductosCarrito.js";
import * as productsApi from "../api/products.js";
import * as ordenesApi from "../api/ordenes.js";

vi.mock("../api/products.js");
vi.mock("../api/ordenes.js");
vi.mock("../hooks/usePerfilCliente.js", () => ({ default: vi.fn() }));

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

const PRODUCTO_1 = { id: 1, nombre: "Reloj Clásico", precio: "1500", fotos: [] };

const PERFIL = {
  id: 1,
  email: "cliente@gmail.com",
  nombre: "Cliente Prueba",
  telefono: "1122334455",
  dni: "12345678",
};

const CLAVE_BORRADOR = "yumi-checkout-borrador";

/**
 * Estado del perfil por defecto: sesión resuelta y completa. Cada test que
 * prueba otra rama (sin sesión, verificación caída, todavía cargando) pasa el
 * suyo — son ramas distintas del mismo componente, no variantes del mismo caso.
 */
function renderCheckout(estadoPerfil = { perfil: PERFIL, resuelto: true, error: null }) {
  vi.mocked(usePerfilCliente).mockReturnValue(estadoPerfil);
  return render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>,
  );
}

function limpiarSessionStorage() {
  try {
    sessionStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    // el entorno de test no siempre expone sessionStorage funcional
  }
}

function leerBorradorDeTest() {
  try {
    const crudo = sessionStorage.getItem(CLAVE_BORRADOR);
    return crudo ? JSON.parse(crudo) : null;
  } catch {
    return null;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  // El cache de productos es module-level: sin esto un test hereda los del anterior.
  reiniciarProductosCarrito();
  const { result } = renderHook(() => useCarrito());
  act(() => {
    result.current.vaciar();
  });
  limpiarSessionStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
  limpiarSessionStorage();
});

/** Monta el checkout con una línea válida y espera a que el perfil esté en pantalla. */
async function prepararCheckout(cantidad = 1) {
  productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
  const { result: carritoHook } = renderHook(() => useCarrito());
  const vista = renderCheckout();
  act(() => {
    carritoHook.current.agregar(1, cantidad);
  });
  await screen.findByText("Cliente Prueba");
  return { carritoHook, vista, user: userEvent.setup() };
}

describe("Checkout — datos del perfil", () => {
  it("muestra el email de solo lectura, sin input editable", async () => {
    await prepararCheckout();

    expect(screen.getByText("cliente@gmail.com")).toBeInTheDocument();
    expect(screen.getByText("Para cambiarlo, andá a Mi cuenta.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
  });

  it("muestra nombre y teléfono del perfil, sin DNI y sin inputs editables", async () => {
    await prepararCheckout();

    expect(screen.getByText("Cliente Prueba")).toBeInTheDocument();
    expect(screen.getByText("1122334455")).toBeInTheDocument();
    // El DNI no se muestra acá: ver "Mi cuenta" para eso.
    expect(screen.queryByText("12345678")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
  });

  it('"Editar" es un link a /cuenta/datos', async () => {
    await prepararCheckout();

    // Editar dejó de abrir un panel inline: ahora es la misma pantalla de
    // "Mis datos" que usa Mi cuenta. Esa pantalla vuelve por el HISTORIAL
    // (`useVolver`), así que no necesita ningún parámetro acá.
    const enlace = screen.getByRole("link", { name: "Editar" });
    expect(enlace).toHaveAttribute("href", "/cuenta/datos");
  });
});

describe("Checkout — envío", () => {
  it("manda items, notas y claveIdempotencia, SIN email", async () => {
    ordenesApi.crearOrden.mockResolvedValue({ id: 1, items: [] });
    const { user } = await prepararCheckout(2);

    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await waitFor(() => expect(ordenesApi.crearOrden).toHaveBeenCalled());
    const body = ordenesApi.crearOrden.mock.calls[0][0];
    // El email NUNCA viaja con sesión: lo pone el backend desde la cuenta.
    expect(body.email).toBeUndefined();
    expect(body.items).toEqual([{ productId: 1, cantidad: 2 }]);
    // `claveIdempotencia`, con EME. Una clave mal escrita la ignora el backend
    // en silencio y el reenvío duplica la orden, con la suite en verde.
    expect(typeof body.claveIdempotencia).toBe("string");
    expect(body.claveIdempotencia.length).toBeGreaterThan(0);
  });

  it("la misma claveIdempotencia viaja en dos submits (sin remontar el componente)", async () => {
    ordenesApi.crearOrden
      .mockRejectedValueOnce(new Error("Ocupado, probá de nuevo."))
      .mockResolvedValueOnce({ id: 1, items: [] });

    const { user } = await prepararCheckout();
    const boton = screen.getByRole("button", { name: "Confirmar pedido" });

    await user.click(boton);
    await waitFor(() => expect(ordenesApi.crearOrden).toHaveBeenCalledTimes(1));

    await user.click(boton);
    await waitFor(() => expect(ordenesApi.crearOrden).toHaveBeenCalledTimes(2));

    const clave1 = ordenesApi.crearOrden.mock.calls[0][0].claveIdempotencia;
    const clave2 = ordenesApi.crearOrden.mock.calls[1][0].claveIdempotencia;
    expect(clave1).toBe(clave2);
  });

  it("nunca manda nombre/telefono/dni: la orden los toma de la cuenta", async () => {
    // Esos tres campos se editan ahora en /cuenta/datos, no en el checkout: el
    // pedido no los vuelve a mandar.
    ordenesApi.crearOrden.mockResolvedValue({ id: 1, items: [] });
    const { user } = await prepararCheckout();

    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await waitFor(() => expect(ordenesApi.crearOrden).toHaveBeenCalled());
    const body = ordenesApi.crearOrden.mock.calls[0][0];
    expect(body.nombre).toBeUndefined();
    expect(body.telefono).toBeUndefined();
    expect(body.dni).toBeUndefined();
  });

  it("503 CAPACIDAD muestra el mensaje de envío sin reintentar solo", async () => {
    ordenesApi.crearOrden.mockRejectedValue(
      Object.assign(new Error("Ocupado, probá de nuevo."), { codigo: "CAPACIDAD" }),
    );
    const { user } = await prepararCheckout();

    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent(/no se generó ningún pedido/i);
    expect(ordenesApi.crearOrden).toHaveBeenCalledTimes(1);
  });

  it("navega a la confirmación con la orden en el state y NO vacía el carrito", async () => {
    const ordenCreada = { id: 42, items: [{ productId: 1, nombreProducto: "Reloj Clásico" }] };
    ordenesApi.crearOrden.mockResolvedValue(ordenCreada);
    const { user, carritoHook } = await prepararCheckout(2);

    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/checkout/confirmacion", {
        state: { orden: ordenCreada },
      }),
    );
    // El carrito se vacía en OrdenConfirmada, no acá: si la navegación se
    // interrumpe, el comprador no pierde lo que juntó.
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
  });

  it("deshabilita el botón mientras la request está en curso", async () => {
    let resolverCrear;
    ordenesApi.crearOrden.mockReturnValue(
      new Promise((resolve) => {
        resolverCrear = resolve;
      }),
    );
    const { user } = await prepararCheckout();

    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Enviando…" })).toBeDisabled());
    resolverCrear({ id: 1, items: [] });
  });

  it("conserva el detalle del backend como segunda línea del error", async () => {
    ordenesApi.crearOrden.mockRejectedValue(new Error("El producto Reloj Clásico está agotado."));
    const { user, carritoHook } = await prepararCheckout();

    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("El producto Reloj Clásico está agotado.");
    expect(aviso).toHaveTextContent(/no se generó ningún pedido/i);
    // El titular nunca puede ser la jerga del servidor.
    expect(aviso.textContent.trim().startsWith("El producto")).toBe(false);
    expect(navigateMock).not.toHaveBeenCalled();
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
  });
});

describe("Checkout — sesión", () => {
  it("mientras el perfil no está resuelto no muestra el formulario ni manda nada", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout({ perfil: null, resuelto: false, error: null });
    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Confirmar pedido" })).not.toBeInTheDocument(),
    );
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();
  });

  it("si la verificación de la sesión FALLÓ muestra el error, no el login", async () => {
    // "No se pudo verificar" no es "no hay sesión": mandar a login a alguien con
    // sesión válida cuya request se cayó le hace creer que se le venció.
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout({ perfil: null, resuelto: true, error: "No pudimos verificar tu sesión." });
    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    expect(await screen.findByText("No pudimos verificar tu sesión")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Iniciar sesión" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar pedido" })).not.toBeInTheDocument();
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();
  });

  it("sin sesión manda a iniciar sesión y NUNCA cae a un envío de invitado", async () => {
    // La trampa cara: con el flag apagado, el backend toma un request sin sesión
    // como orden de INVITADO — ignora `claveIdempotencia`, escribe
    // `cuentaClienteId: null` (invisible en "Mis pedidos") y un reenvío DUPLICA.
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout({ perfil: null, resuelto: true, error: null });
    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    const enlace = await screen.findByRole("link", { name: "Iniciar sesión" });
    expect(enlace).toHaveAttribute("href", "/cuenta/entrar?volverA=%2Fcheckout");
    expect(screen.queryByRole("button", { name: "Confirmar pedido" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Nombre")).not.toBeInTheDocument();
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();
  });

  it("avisa que el carrito puede perderse cuando el storage está bloqueado", async () => {
    // `storageDisponible()` existe para poder avisar ANTES de mandar a login: sin
    // el aviso, la persona vuelve a un carrito vacío y sin explicación.
    // En este entorno `localStorage` es un objeto sin métodos, así que la sonda
    // da false sola (ver "Gotcha localStorage" en las reglas de testing).
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout({ perfil: null, resuelto: true, error: null });
    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByRole("link", { name: "Iniciar sesión" });
    expect(screen.getByText(/no vamos a poder guardar tu carrito/i)).toBeInTheDocument();
  });

  it("con el storage sano NO muestra ese aviso", async () => {
    const almacen = new Map();
    const falso = {
      getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
      setItem: (k, v) => almacen.set(k, String(v)),
      removeItem: (k) => almacen.delete(k),
      clear: () => almacen.clear(),
      key: () => null,
      length: 0,
    };
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", { value: falso, configurable: true });

    try {
      productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
      const { result: carritoHook } = renderHook(() => useCarrito());
      renderCheckout({ perfil: null, resuelto: true, error: null });
      act(() => {
        carritoHook.current.agregar(1, 1);
      });

      await screen.findByRole("link", { name: "Iniciar sesión" });
      expect(screen.queryByText(/no vamos a poder guardar tu carrito/i)).not.toBeInTheDocument();
    } finally {
      if (original) Object.defineProperty(globalThis, "localStorage", original);
      else delete globalThis.localStorage;
    }
  });
});

describe("Checkout — borrador en sessionStorage", () => {
  it("sobrevive a desmontar y remontar el componente", async () => {
    const { user, vista } = await prepararCheckout();

    await user.type(screen.getByLabelText("Notas (opcional)"), "Tocar timbre 2B");

    vista.unmount();

    renderCheckout();
    await screen.findByText("Cliente Prueba");
    expect(screen.getByLabelText("Notas (opcional)")).toHaveValue("Tocar timbre 2B");
  });

  it("la clave de idempotencia sobrevive al remonte: un reenvío no duplica", async () => {
    // Un remonte (F5, o volver atrás y entrar de nuevo) con clave nueva le pide
    // al backend una orden NUEVA: si la primera sí se había creado, quedan dos.
    ordenesApi.crearOrden.mockRejectedValueOnce(new Error("Se cortó la conexión."));
    const { user, vista } = await prepararCheckout();

    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));
    await waitFor(() => expect(ordenesApi.crearOrden).toHaveBeenCalledTimes(1));
    const clavePrimera = ordenesApi.crearOrden.mock.calls[0][0].claveIdempotencia;

    vista.unmount();

    ordenesApi.crearOrden.mockResolvedValue({ id: 1, items: [] });
    renderCheckout();
    await screen.findByText("Cliente Prueba");
    await userEvent.setup().click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await waitFor(() => expect(ordenesApi.crearOrden).toHaveBeenCalledTimes(2));
    expect(ordenesApi.crearOrden.mock.calls[1][0].claveIdempotencia).toBe(clavePrimera);
  });

  it("borra el borrador cuando la orden sale bien", async () => {
    // Si la clave sobreviviera al pedido confirmado, la compra SIGUIENTE en la
    // misma pestaña viajaría con la clave ya usada y el backend devolvería la
    // orden vieja con 200: el comprador vería un pedido que no hizo.
    ordenesApi.crearOrden.mockResolvedValue({ id: 1, items: [] });
    const { user } = await prepararCheckout();

    await user.type(screen.getByLabelText("Notas (opcional)"), "Tocar timbre 2B");
    await user.click(screen.getByRole("button", { name: "Confirmar pedido" }));

    await waitFor(() => expect(navigateMock).toHaveBeenCalled());
    expect(leerBorradorDeTest()).toBeNull();
  });
});

describe("Checkout — carrito, total y carga (regresiones)", () => {
  it("redirige a /carrito cuando el carrito está vacío", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    renderCheckout();

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/carrito", { replace: true }),
    );
  });

  it("redirige a /carrito cuando todas las líneas quedaron sin producto", async () => {
    productsApi.getProductsByIds.mockResolvedValue([]);
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();
    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/carrito", { replace: true }),
    );
  });

  it("muestra el precio unitario por línea y el total, contando solo líneas válidas", async () => {
    const PRODUCTO_2 = { id: 2, nombre: "Anillo Plata", precio: "500", fotos: [] };
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1, PRODUCTO_2]);
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();
    act(() => {
      carritoHook.current.agregar(1, 2);
      carritoHook.current.agregar(2, 1);
      carritoHook.current.agregar(99, 3); // producto inexistente: no suma
    });

    await screen.findByText("Cliente Prueba");
    expect(screen.getByText("$ 1.500 c/u")).toBeInTheDocument();
    expect(screen.getByText("$ 500 c/u")).toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("$ 3.500");
  });

  it("distingue 'falló la carga' de 'no hay nada': error en vez de redirigir", async () => {
    productsApi.getProductsByIds.mockRejectedValue(new Error("network down"));
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();
    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    expect(await screen.findByText(/No pudimos cargar tu pedido/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("un remonte con el mismo carrito no muestra 'Cargando checkout…': usa el cache y refetchea", async () => {
    const { vista } = await prepararCheckout();
    vista.unmount();

    productsApi.getProductsByIds.mockReturnValue(new Promise(() => {}));
    renderCheckout();

    expect(screen.queryByText("Cargando checkout…")).not.toBeInTheDocument();
    expect(screen.getByText("1 × Reloj Clásico")).toBeInTheDocument();
    expect(productsApi.getProductsByIds).toHaveBeenLastCalledWith([1]);
  });

  it("el refetch en segundo plano reemplaza el precio cuando contesta", async () => {
    const { vista } = await prepararCheckout(2);
    vista.unmount();

    let resolver;
    productsApi.getProductsByIds.mockReturnValue(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    renderCheckout();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("$ 3.000");

    await act(async () => {
      resolver([{ ...PRODUCTO_1, precio: "2000" }]);
    });

    expect(screen.getByTestId("checkout-total")).toHaveTextContent("$ 4.000");
  });

  it("el título de la página es el h1 y está en castellano", async () => {
    await prepararCheckout();

    expect(
      screen.getByRole("heading", { level: 1, name: "Finalizar compra" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Checkout")).not.toBeInTheDocument();
  });
});
