import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";
import FilaCombos from "./FilaCombos.jsx";

vi.mock("../hooks/useCarrito.js", () => ({ default: () => ({ agregar: vi.fn() }) }));

function combo(id) {
  return {
    id, ruta: `/combos/${id}`, nombre: `Kit ${id}`, frase: "Frase.", porcentaje: 10,
    precioSeparado: "10000", precioCombo: "9000", ahorro: "1000", unidades: 2, alcanza: 5,
    disponible: true, quedanPocos: false, heroUrl: null,
    items: [{ productId: 1, nombre: "A", cantidad: 1, precioLista: "5000", foto: null, ruta: "/producto/1", categoria: null }],
  };
}

function renderizar(props) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <FilaCombos combos={[combo(1), combo(2)]} titulo="Combos que te ahorran plata" {...props} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("FilaCombos", () => {
  it("muestra el título y una TarjetaCombo por combo", () => {
    renderizar();
    expect(screen.getByText("Combos que te ahorran plata")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Ver el combo/i })).toHaveLength(2);
  });

  it("con el prop enlace, muestra el link 'Ver todos'", () => {
    renderizar({ enlace: { texto: "Ver todos los combos", to: "/combos" } });
    expect(screen.getByRole("link", { name: /Ver todos los combos/i })).toHaveAttribute("href", "/combos");
  });

  it("sin enlace, no lo muestra", () => {
    renderizar();
    expect(screen.queryByText(/Ver todos/)).not.toBeInTheDocument();
  });

  it("un punto por combo, y el activo sigue al scroll de la fila", () => {
    renderizar();
    const puntos = () => screen.getAllByTestId("punto-fila-combos").map((p) => p.dataset.activo);
    expect(puntos()).toEqual(["true", "false"]);

    // jsdom no aplica layout: se fijan a mano las medidas que el navegador daría.
    const fila = screen.getByRole("list");
    Object.defineProperty(fila, "scrollWidth", { configurable: true, value: 800 });
    Object.defineProperty(fila, "scrollLeft", { configurable: true, value: 400 });
    fireEvent.scroll(fila);

    expect(puntos()).toEqual(["false", "true"]);
  });

  it("escritorio: flechas Anteriores/Siguientes que se ocultan en mobile y desplazan una card (ancho + hueco)", async () => {
    renderizar();
    const anteriores = screen.getByRole("button", { name: "Anteriores" });
    const siguientes = screen.getByRole("button", { name: "Siguientes" });
    // jsdom no aplica @media: se afirma sobre las clases de las que depende.
    expect(anteriores).toHaveClass("hidden", "md:grid");
    expect(siguientes).toHaveClass("hidden", "md:grid");

    const fila = screen.getByRole("list");
    fila.scrollBy = vi.fn();
    const [primera] = screen.getAllByRole("listitem");
    Object.defineProperty(primera, "offsetWidth", { configurable: true, value: 1000 });
    fila.style.columnGap = "32px";

    await userEvent.click(siguientes);
    expect(fila.scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: 1032 }));
    await userEvent.click(anteriores);
    expect(fila.scrollBy).toHaveBeenLastCalledWith(expect.objectContaining({ left: -1032 }));
  });

  it("con un solo combo no hay flechas ni puntos", () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <FilaCombos combos={[combo(1)]} titulo="X" />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Siguientes" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("punto-fila-combos")).not.toBeInTheDocument();
  });

  it("la pista lleva el padding que deja caer la sombra del ticket sin recortarla", () => {
    renderizar();
    expect(screen.getByRole("list")).toHaveClass("fila-combos-pista");
  });

  it("sin combos, no renderiza nada", () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <FilaCombos combos={[]} titulo="X" />
        </ToastProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByText("X")).not.toBeInTheDocument();
  });
});
