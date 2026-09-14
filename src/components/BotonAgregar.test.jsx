import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link, MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";

// Nombres SIN prefijo "use": mismo motivo que en `HojaMenu.test.jsx`
// (`carritoMock`) — oxlint (`rules-of-hooks`) trata cualquier identificador
// que empiece con "use" como un Hook y exige que la función que lo llama sea
// un componente o un Hook, cosa que esta factory de `vi.mock` no es.
const agregarMock = vi.fn();
const carritoMock = vi.fn(() => ({ carrito: [], agregar: agregarMock, cantidadTotal: 0 }));
vi.mock("../hooks/useCarrito.js", () => ({ default: (...args) => carritoMock(...args) }));

const { default: BotonAgregar } = await import("./BotonAgregar.jsx");

function producto(extra = {}) {
  return { id: 1, nombre: "Producto de prueba", stock: 10, fotos: [{ url: "http://x/1.jpg" }], ...extra };
}

describe("BotonAgregar", () => {
  it("agrega 1 unidad al carrito y muestra el toast", async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <BotonAgregar producto={producto()} />
        </ToastProvider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: /agregar/i }));
    expect(agregarMock).toHaveBeenCalledWith(1, 1);
    expect(await screen.findByText(/agregado al carrito/i)).toBeInTheDocument();
  });

  it("sin stock, aparece deshabilitado y dice 'Sin stock'", () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <BotonAgregar producto={producto({ stock: 0 })} />
        </ToastProvider>
      </MemoryRouter>,
    );
    const boton = screen.getByRole("button", { name: /sin stock/i });
    expect(boton).toBeDisabled();
  });

  it("cuando el carrito ya tiene todo el stock, se deshabilita con 'Máximo en el carrito'", () => {
    carritoMock.mockReturnValueOnce({
      carrito: [{ productId: 1, cantidad: 3 }],
      agregar: vi.fn(),
      cantidadTotal: 3,
    });
    render(
      <MemoryRouter>
        <ToastProvider>
          <BotonAgregar producto={producto({ id: 1, stock: 3 })} />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /máximo en el carrito/i })).toBeDisabled();
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
  ])(
    "sin stock confiable (%s), se deshabilita como 'Sin stock' en vez de permitir agregar sin tope",
    (_etiqueta, valorStock) => {
      // Fix round 1 (gap confirmado por el controller): `GET /products`
      // público SIEMPRE manda `stock` (filtra `stock > 0` — ver
      // docs/reglas/productos.md), pero este botón no puede asumir que TODO
      // dato que reciba pasó por ese contrato. Antes del fix, `stock`
      // ausente/no numérico dejaba `sinStock`/`topeAlcanzado` los dos en
      // `false` y el botón agregaba SIN TOPE — vendería stock que no se
      // puede confirmar. Ahora un stock no entero cuenta como 0.
      render(
        <MemoryRouter>
          <ToastProvider>
            <BotonAgregar producto={producto({ stock: valorStock })} />
          </ToastProvider>
        </MemoryRouter>,
      );
      expect(screen.getByRole("button", { name: /sin stock/i })).toBeDisabled();
    },
  );

  it("es HERMANO del <Link> que lo acompaña, no su hijo", () => {
    // Ruling del controller (task-9-brief.md): el arreglo del plan original
    // metía BotonAgregar DENTRO del <a> y afirmaba closest("a") === null, que
    // es contradictorio por construcción. El patrón real es el de
    // `ProductCard`/`BotonFavorito`: un wrapper común con el <Link> y
    // BotonAgregar como HERMANOS, nunca uno dentro del otro.
    render(
      <MemoryRouter>
        <ToastProvider>
          <div>
            <Link to="/producto/1">Ver producto</Link>
            <BotonAgregar producto={producto()} />
          </div>
        </ToastProvider>
      </MemoryRouter>,
    );
    const boton = screen.getByRole("button", { name: /agregar/i });
    expect(boton.closest("a")).toBeNull();
  });
  it("sin variante conserva el estilo de la card: fondo claro y hover a primary", () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <BotonAgregar producto={producto()} />
        </ToastProvider>
      </MemoryRouter>,
    );
    const clases = screen.getByRole("button", { name: /agregar/i }).className.split(/\s+/);
    expect(clases).toEqual(
      expect.arrayContaining(["bg-surface-container-high", "text-primary", "enabled:hover:bg-primary", "enabled:hover:text-on-primary"]),
    );
  });
});
