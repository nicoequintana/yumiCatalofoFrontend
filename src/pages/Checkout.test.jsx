import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Checkout from "./Checkout.jsx";
import useCarrito from "../hooks/useCarrito.js";
import * as productsApi from "../api/products.js";
import * as ordenesApi from "../api/ordenes.js";

vi.mock("../api/products.js");
vi.mock("../api/ordenes.js");

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const PRODUCTO_1 = {
  id: 1,
  nombre: "Reloj Clásico",
  precio: "1500.00",
  fotos: [],
};

function renderCheckout() {
  return render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>,
  );
}

describe("Checkout", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redirige a /carrito cuando el carrito está vacío", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    renderCheckout();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/carrito", { replace: true });
    });
  });

  it("redirige a /carrito cuando todas las líneas quedaron con producto borrado/oculto", async () => {
    productsApi.getProductsByIds.mockResolvedValue([]); // producto 1 ya no existe

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/carrito", { replace: true });
    });
  });

  it("muestra el formulario cuando hay al menos una línea válida", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 2);
    });

    expect(await screen.findByLabelText(/dni/i)).toBeInTheDocument();
    expect(screen.getByText(/2 × Reloj Clásico/)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("valida que dni, nombre y teléfono sean obligatorios antes de enviar", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("El DNI es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El nombre es obligatorio.")).toBeInTheDocument();
    expect(screen.getByText("El teléfono es obligatorio.")).toBeInTheDocument();
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();

    // Accesibilidad: cada input inválido queda marcado y conectado a su
    // mensaje de error vía aria-describedby, para que un lector de pantalla
    // lo anuncie al tabular al campo.
    const dniInput = screen.getByLabelText(/dni/i);
    expect(dniInput).toHaveAttribute("aria-invalid", "true");
    expect(dniInput).toHaveAttribute("aria-describedby", "dni-error");
    expect(screen.getByText("El DNI es obligatorio.")).toHaveAttribute("id", "dni-error");
  });

  it("lleva el foco al primer campo inválido cuando el submit falla", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    // Sin esto el foco se queda en el botón y los errores aparecen abajo, fuera
    // de la vista: el submit se siente como si no hubiera hecho nada.
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/dni/i)));
  });

  it("enfoca el primer campo inválido según el orden del formulario, no el del objeto de errores", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    const dniInput = await screen.findByLabelText(/dni/i);
    await user.type(dniInput, "30111222");

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/^nombre$/i)));
  });

  it("envía la orden con las líneas válidas y navega a la confirmación con el state", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    const ordenCreada = { id: 42, items: [{ productId: 1, nombreProducto: "Reloj Clásico" }] };
    ordenesApi.crearOrden.mockResolvedValue(ordenCreada);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 2);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.type(screen.getByLabelText(/email/i), "juana@gmail.com");

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    await waitFor(() => {
      expect(ordenesApi.crearOrden).toHaveBeenCalledWith({
        dni: "12345678",
        nombre: "Juana Pérez",
        telefono: "1122334455",
        email: "juana@gmail.com",
        notas: undefined,
        items: [{ productId: 1, cantidad: 2 }],
      });
    });

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/checkout/confirmacion", {
        state: { orden: ordenCreada },
      });
    });

    // El carrito NO se vacía en Checkout — eso pasa recién en OrdenConfirmada.
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 2 }]);
  });

  it("deshabilita el botón de submit mientras la request está en curso", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    let resolverCrear;
    ordenesApi.crearOrden.mockReturnValue(
      new Promise((resolve) => {
        resolverCrear = resolve;
      }),
    );

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.type(screen.getByLabelText(/email/i), "juana@gmail.com");

    const boton = screen.getByRole("button", { name: /confirmar pedido/i });
    await user.click(boton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /enviando/i })).toBeDisabled();
    });

    resolverCrear({ id: 1, items: [] });
  });

  it("frena un DNI con formato inválido antes de salir a la red", async () => {
    // Antes esta costura llegaba hasta el backend: el cliente solo chequeaba
    // "no vacío", así que un DNI obviamente corto pagaba un viaje de ida y
    // vuelta para volver como un error genérico de envío. El backend sigue
    // siendo la autoridad (backend/src/lib/dni.js); esto es solo un aviso
    // inmediato, y por eso marca el campo, no el banner de envío.
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "123"); // formato inválido, pero no vacío
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    const mensajeError = await screen.findByText("El DNI debe tener 7 u 8 dígitos.");
    expect(mensajeError).toHaveAttribute("id", "dni-error");
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();

    const dniInput = screen.getByLabelText(/dni/i);
    expect(dniInput).toHaveAttribute("aria-invalid", "true");
    expect(dniInput).toHaveAttribute("aria-describedby", "dni-error");

    // El carrito y el formulario quedan intactos para poder corregir.
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
    expect(dniInput).toHaveValue("123");
  });

  it("acepta un DNI escrito con separadores y lo manda tal cual (el backend normaliza)", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    ordenesApi.crearOrden.mockResolvedValue({ id: 7, items: [] });

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "12.345.678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.type(screen.getByLabelText(/email/i), "juana@gmail.com");

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    await waitFor(() => {
      expect(ordenesApi.crearOrden).toHaveBeenCalledWith(
        expect.objectContaining({ dni: "12.345.678" }),
      );
    });
    expect(screen.queryByText("El DNI debe tener 7 u 8 dígitos.")).not.toBeInTheDocument();
  });

  it("expone teclado y autocompletado adecuados en cada campo", async () => {
    // El checkout es el formulario de mayor valor de la app y se completa
    // sobre todo desde el teléfono: sin `inputMode` el DNI abre un teclado
    // QWERTY completo, y sin `autoComplete` el navegador no ofrece los datos
    // que el usuario ya tiene guardados.
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    const dni = await screen.findByLabelText(/dni/i);
    expect(dni).toHaveAttribute("inputmode", "numeric");
    expect(dni).toHaveAttribute("maxlength", "10");

    const nombre = screen.getByLabelText(/^nombre$/i);
    expect(nombre).toHaveAttribute("autocomplete", "name");

    const telefono = screen.getByLabelText(/teléfono/i);
    expect(telefono).toHaveAttribute("type", "tel");
    expect(telefono).toHaveAttribute("inputmode", "tel");
    expect(telefono).toHaveAttribute("autocomplete", "tel");

    const email = screen.getByLabelText(/email/i);
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("inputmode", "email");
    expect(email).toHaveAttribute("autocomplete", "email");

    // El `noValidate` del form es deliberado: la validación en JS es la única
    // dueña del error, y `required` levantaría una segunda UI en conflicto.
    expect(dni.closest("form")).toHaveAttribute("novalidate");
    for (const campo of [dni, nombre, telefono, email]) {
      expect(campo).not.toHaveAttribute("required");
    }
  });

  it("muestra el error del backend y no navega ni limpia el formulario si la request falla", async () => {
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    ordenesApi.crearOrden.mockRejectedValue(new Error("El producto Reloj Clásico está agotado."));

    const { result: carritoHook } = renderHook(() => useCarrito());
    const user = userEvent.setup();
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    await screen.findByLabelText(/dni/i);

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.type(screen.getByLabelText(/email/i), "juana@gmail.com");

    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("El producto Reloj Clásico está agotado.")).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();

    const boton = screen.getByRole("button", { name: /confirmar pedido/i });
    expect(boton).not.toBeDisabled();

    // El carrito sigue intacto.
    expect(carritoHook.current.carrito).toEqual([{ productId: 1, cantidad: 1 }]);
  });

  // Nota de implementación (desvío del brief, ver informe): el brief traía
  // `agregar()` ANTES de `renderCheckout()`. En este entorno de tests
  // `globalThis.localStorage` es un objeto vacío sin métodos (ver "Gotcha del
  // entorno de tests" en CLAUDE.md), así que el `useState(() => leerCarrito())`
  // de una instancia de `useCarrito` recién montada no puede releer lo que
  // `agregar()` ya escribió — se entera solo vía el listener module-level, que
  // recién existe una vez que `Checkout` está montado. Por eso acá se monta
  // primero (como en el resto de los tests de este archivo) y se agrega
  // después, con el mismo resultado observable que buscaba el brief.
  async function prepararFormulario() {
    const user = userEvent.setup();
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);
    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();
    act(() => {
      carritoHook.current.agregar(1, 1);
    });
    await screen.findByLabelText(/dni/i);
    return user;
  }

  it("no envía la orden si falta el email", async () => {
    const user = await prepararFormulario();

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("El email es obligatorio.")).toBeInTheDocument();
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();
  });

  it("no envía la orden si el email tiene formato inválido", async () => {
    const user = await prepararFormulario();

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.type(screen.getByLabelText(/email/i), "juana-arroba-gmail");
    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    expect(await screen.findByText("El email no tiene un formato válido.")).toBeInTheDocument();
    expect(ordenesApi.crearOrden).not.toHaveBeenCalled();
  });

  it("devuelve el foco al email cuando es el primer campo inválido", async () => {
    const user = await prepararFormulario();

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText(/email/i)),
    );
  });

  it("el label del email ya no dice que es opcional", async () => {
    await prepararFormulario();

    // No se usa queryByLabelText(/opcional/i): el campo Notas también dice
    // "(opcional)" y coincidiría con esa regex.
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
  });

  it("manda el email en el payload de la orden", async () => {
    const user = await prepararFormulario();
    ordenesApi.crearOrden.mockResolvedValue({ id: 1, items: [], cliente: {} });

    await user.type(screen.getByLabelText(/dni/i), "12345678");
    await user.type(screen.getByLabelText(/nombre/i), "Juana Pérez");
    await user.type(screen.getByLabelText(/teléfono/i), "1122334455");
    await user.type(screen.getByLabelText(/email/i), "juana@gmail.com");
    await user.click(screen.getByRole("button", { name: /confirmar pedido/i }));

    await waitFor(() => expect(ordenesApi.crearOrden).toHaveBeenCalled());
    expect(ordenesApi.crearOrden.mock.calls[0][0].email).toBe("juana@gmail.com");
  });
});

describe("Checkout — precios y total", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
    vi.clearAllMocks();
  });

  it("muestra el precio unitario de cada línea y el total del pedido", async () => {
    // El resumen listaba solo `cantidad × nombre`: el usuario confirmaba el
    // pedido sin ver cuánto iba a pagar, y recién se enteraba del monto en la
    // pantalla de confirmación, con la orden ya creada.
    const PRODUCTO_2 = { id: 2, nombre: "Anillo Plata", precio: "500.50", fotos: [] };
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1, PRODUCTO_2]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 2); // 2 × 1500.00 = 3000.00
      carritoHook.current.agregar(2, 1); // 1 × 500.50
    });

    await screen.findByLabelText(/dni/i);

    // Precio unitario visible por línea.
    expect(screen.getByText("$ 1.500,00 c/u")).toBeInTheDocument();
    expect(screen.getByText("$ 500,50 c/u")).toBeInTheDocument();

    // Subtotal por línea (cantidad × unitario).
    expect(screen.getByText("$ 3.000,00")).toBeInTheDocument();

    // Total = suma de los subtotales: 3000.00 + 500.50 = 3500.50.
    expect(screen.getByTestId("checkout-total")).toHaveTextContent("$ 3.500,50");
  });

  it("el total suma solo las líneas válidas, no las que quedaron sin producto", async () => {
    // La reconciliación ya excluye del submit las líneas cuyo producto
    // desapareció; el total tiene que contar lo mismo que se va a enviar.
    productsApi.getProductsByIds.mockResolvedValue([PRODUCTO_1]);

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1); // válida: 1500.00
      carritoHook.current.agregar(99, 3); // el producto 99 ya no existe
    });

    await screen.findByLabelText(/dni/i);

    expect(screen.getByTestId("checkout-total")).toHaveTextContent("$ 1.500,00");
  });
});

describe("Checkout — fallo de red", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.vaciar();
    });
    vi.clearAllMocks();
  });

  it("muestra un error en vez de redirigir si no se pueden cargar los productos", async () => {
    productsApi.getProductsByIds.mockRejectedValue(new Error("network down"));

    const { result: carritoHook } = renderHook(() => useCarrito());
    renderCheckout();

    act(() => {
      carritoHook.current.agregar(1, 1);
    });

    expect(
      await screen.findByText(/No pudimos cargar tu pedido/i),
    ).toBeInTheDocument();
    // Redirigir a /carrito acá mentiría: el carrito no está vacío, lo que
    // falló es la conexión, y allá el usuario vería el mismo error.
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
