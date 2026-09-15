import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";
import TarjetaCombo from "./TarjetaCombo.jsx";

// `vi.hoisted`: el mock de `vi.mock` se iza sobre los imports, así que la
// función espía tiene que existir antes. Un `vi.doMock` dentro del `it` no
// alcanza: el componente ya importó el módulo real del mock de arriba.
const agregarMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useCarrito.js", () => ({
  default: () => ({ agregar: agregarMock }),
}));

beforeEach(() => {
  agregarMock.mockClear();
});

function combo(extra = {}) {
  return {
    id: 3,
    ruta: "/combos/3-kit-living-calido",
    nombre: "Kit Living Cálido",
    frase: "Luz suave y una mesa de roble.",
    porcentaje: 15,
    precioSeparado: "45000",
    precioCombo: "38250",
    ahorro: "6750",
    unidades: 3,
    alcanza: 4,
    disponible: true,
    quedanPocos: false,
    heroUrl: "https://res.cloudinary.com/x/1.jpg",
    items: [
      { productId: 1, nombre: "Lámpara", cantidad: 2, precioLista: "10000", foto: null, ruta: "/producto/1-lampara", categoria: "Iluminación" },
      { productId: 2, nombre: "Mesa", cantidad: 1, precioLista: "25000", foto: null, ruta: "/producto/2-mesa", categoria: "Living" },
    ],
    ...extra,
  };
}

function renderizar(props) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <TarjetaCombo combo={combo(props)} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("TarjetaCombo", () => {
  it("muestra el nombre, la frase, el % y los dos precios", () => {
    renderizar();
    expect(screen.getByText("Kit Living Cálido")).toBeInTheDocument();
    expect(screen.getByText(/Luz suave y una mesa de roble/)).toBeInTheDocument();
    expect(screen.getByText(/-15%/)).toBeInTheDocument();
    expect(screen.getByText(/45.000/)).toBeInTheDocument();
    expect(screen.getByText(/38.250/)).toBeInTheDocument();
  });

  it("con 4 productos o menos, muestra una ficha por cada uno", () => {
    renderizar();
    expect(screen.getAllByTestId("ficha-item")).toHaveLength(2);
  });

  it("con más de 4 productos, muestra 3 fichas y una +N", () => {
    const items = [1, 2, 3, 4, 5].map((n) => ({
      productId: n, nombre: `Producto ${n}`, cantidad: 1, precioLista: "1000", foto: null, ruta: `/producto/${n}`, categoria: null,
    }));
    renderizar({ items });
    expect(screen.getAllByTestId("ficha-item")).toHaveLength(3);
    expect(screen.getByText("+2")).toBeInTheDocument();
  });

  it("una cantidad > 1 se muestra como ×N sobre la ficha", () => {
    renderizar();
    expect(screen.getByText("×2")).toBeInTheDocument();
  });

  it("agotado: los botones quedan deshabilitados y aparece el chip Agotado", () => {
    renderizar({ disponible: false, alcanza: 0 });
    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Agregar combo/i })).toBeDisabled();
  });

  it("quedanPocos muestra el chip Quedan N", () => {
    renderizar({ quedanPocos: true, alcanza: 2 });
    expect(screen.getByText(/Quedan 2/)).toBeInTheDocument();
  });

  it("Ver el combo enlaza a la ruta del combo", () => {
    renderizar();
    expect(screen.getByRole("link", { name: /Ver el combo/i })).toHaveAttribute("href", "/combos/3-kit-living-calido");
  });

  it("Agregar combo llama a useCarrito().agregar({comboId}, 1)", async () => {
    renderizar();
    await userEvent.click(screen.getByRole("button", { name: /Agregar combo/i }));
    expect(agregarMock).toHaveBeenCalledWith({ comboId: 3 }, 1);
  });

  it("prefers-reduced-motion anula el lift y la transición del hover", () => {
    renderizar();
    // Mismo criterio que `AdminOrdenes.test.jsx` ("prefers-reduced-motion anula
    // la animación"): se afirma sobre la clase Tailwind, no sobre CSS
    // computado — jsdom no aplica `@media`. `motion-reduce:transition-none`
    // saca la transición entera (como `.combo, .btn { transition: none }` del
    // diseño aprobado) y `motion-reduce:hover:translate-y-0` cancela el lift
    // de 3px (`.combo:hover { transform: none }`), sin tocar el `hover:`
    // normal para quien no pidió menos movimiento.
    const article = screen.getByRole("article");
    expect(article.className).toContain("motion-reduce:transition-none");
    expect(article.className).toContain("motion-reduce:hover:translate-y-0");
  });
});
