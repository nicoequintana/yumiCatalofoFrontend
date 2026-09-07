import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getProductsMock = vi.fn();

vi.mock("../api/products.js", () => ({
  getProducts: (...args) => getProductsMock(...args),
}));

const { default: useDestacados } = await import("./useDestacados.js");

const PRODUCTO = { id: 1, nombre: "Reloj Clásico", precio: "1000", fotos: [] };

/** Sonda mínima: pinta lo que el hook devuelve. */
function Sonda() {
  const { productos, resuelto } = useDestacados();
  return (
    <>
      <span data-testid="n">{productos.length}</span>
      <span data-testid="resuelto">{String(resuelto)}</span>
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useDestacados", () => {
  it("arranca sin resolver mientras el fetch está en vuelo", () => {
    // Promesa que nunca se cumple: el hook no puede haber terminado.
    getProductsMock.mockReturnValue(new Promise(() => {}));

    render(<Sonda />);

    expect(screen.getByTestId("resuelto")).toHaveTextContent("false");
  });

  it("resuelve con los destacados que devuelve el backend", async () => {
    getProductsMock.mockResolvedValue({ data: [PRODUCTO], page: 1, pageSize: 12, total: 1 });

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("resuelto")).toHaveTextContent("true"));
    expect(screen.getByTestId("n")).toHaveTextContent("1");
  });

  // EL GUARD MÁS IMPORTANTE DE ESTE ARCHIVO. La home se tapa con un loader
  // hasta que sus cuatro fuentes dicen que terminaron; un hook que deja
  // `resuelto` en `false` ante un fetch fallido deja ese loader para siempre y
  // la home no se ve NUNCA. "Todavía no llegó" y "falló y no va a llegar"
  // tienen que ser dos estados distinguibles — mismo criterio, y mismo
  // comentario, que `useContextoComercial`.
  it("resuelve IGUAL cuando el fetch falla", async () => {
    getProductsMock.mockRejectedValue(new Error("red caída"));

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("resuelto")).toHaveTextContent("true"));
    // Y degrada a lista vacía: la sección de destacados simplemente no aparece.
    expect(screen.getByTestId("n")).toHaveTextContent("0");
  });
});
