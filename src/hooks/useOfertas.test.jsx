import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProductsMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProducts: (...args) => getProductsMock(...args),
}));

const { default: useOfertas } = await import("./useOfertas.js");

const PRODUCTO = { id: 1, nombre: "Reloj Clásico", precio: "1000", fotos: [] };

/** Sonda mínima: pinta lo que el hook devuelve. */
function Sonda() {
  const { productos, error } = useOfertas();
  return (
    <>
      <span data-testid="n">{productos.length}</span>
      <span data-testid="error">{error ?? "sin-error"}</span>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useOfertas", () => {
  it("pide los productos con descuento", async () => {
    getProductsMock.mockResolvedValue({ data: [PRODUCTO], page: 1, pageSize: 12, total: 1 });

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("n")).toHaveTextContent("1"));
    expect(getProductsMock).toHaveBeenCalledWith(expect.objectContaining({ conDescuento: true }));
  });

  it("distingue 'falló la carga' de 'no hay ofertas'", async () => {
    // Un catch que solo vacía la lista hace que un backend caído se lea como
    // "no hay ofertas". Son dos cosas distintas y la pantalla tiene que saberlo.
    getProductsMock.mockRejectedValue(new Error("red caída"));

    render(<Sonda />);

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent("Revisá tu conexión e intentá de nuevo."),
    );
  });
});
