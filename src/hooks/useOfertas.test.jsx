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
  const { productos, error, resuelto } = useOfertas();
  return (
    <>
      <span data-testid="n">{productos.length}</span>
      <span data-testid="error">{error ?? "sin-error"}</span>
      <span data-testid="resuelto">{String(resuelto)}</span>
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

  it("pide 8: el tope de tarjetas que muestra PromosActivas", async () => {
    getProductsMock.mockResolvedValue({ data: [PRODUCTO], page: 1, pageSize: 8, total: 1 });

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("resuelto")).toHaveTextContent("true"));
    expect(getProductsMock).toHaveBeenCalledWith({ conDescuento: true, pageSize: 8 });
  });

  it("exporta el tope para que PromosActivas no tenga una copia propia", async () => {
    const { OFERTAS_POR_RIEL } = await import("./useOfertas.js");

    expect(OFERTAS_POR_RIEL).toBe(8);
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

  it("arranca sin resolver mientras el fetch está en vuelo", () => {
    // Promesa que nunca se cumple: el hook no puede haber terminado.
    getProductsMock.mockReturnValue(new Promise(() => {}));

    render(<Sonda />);

    expect(screen.getByTestId("resuelto")).toHaveTextContent("false");
  });

  it("resuelve cuando el fetch termina bien", async () => {
    getProductsMock.mockResolvedValue({ data: [PRODUCTO], page: 1, pageSize: 12, total: 1 });

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("resuelto")).toHaveTextContent("true"));
  });

  // EL GUARD MÁS IMPORTANTE DE ESTE ARCHIVO. La home se tapa con un loader
  // hasta que sus cuatro fuentes dicen que terminaron; un hook que deja
  // `resuelto` en `false` ante un fetch fallido deja ese loader para siempre y
  // la home no se ve NUNCA. `resuelto` responde "¿terminó?", no "¿salió bien?"
  // — para lo segundo está `error`, que es un dato aparte y sigue poblándose.
  it("resuelve IGUAL cuando el fetch falla", async () => {
    getProductsMock.mockRejectedValue(new Error("red caída"));

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("resuelto")).toHaveTextContent("true"));
    expect(screen.getByTestId("error")).toHaveTextContent("Revisá tu conexión e intentá de nuevo.");
  });
});
