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

  // Las fichas visibles dependen del ANCHO de la card, no de la pantalla: se
  // pre-renderizan las dos variantes y el CSS (container query en index.css)
  // prende una u otra con `.fichas-solo-ancho`/`.fichas-solo-angosto`. jsdom no
  // aplica @container, así que se prueba el markup del que ese CSS depende.
  function itemsDe(n) {
    return Array.from({ length: n }, (_, i) => ({
      productId: i + 1, nombre: `Producto ${i + 1}`, cantidad: 1, precioLista: "1000", foto: null, ruta: `/producto/${i + 1}`, categoria: null,
    }));
  }
  const dentroDe = (el, clase) => Boolean(el.closest(`.${clase}`));

  it("con 3 productos o menos, muestra todas las fichas y ninguna variante por ancho", () => {
    const { container } = renderizar({ items: itemsDe(3) });
    expect(screen.getAllByTestId("ficha-item")).toHaveLength(3);
    expect(container.querySelector(".fichas-solo-ancho, .fichas-solo-angosto")).toBeNull();
    expect(screen.queryByTestId("ficha-mas")).not.toBeInTheDocument();
  });

  it("con 4 productos: ancha/apilada muestra las 4; angosta muestra 2 y +2", () => {
    renderizar({ items: itemsDe(4) });
    const fichas = screen.getAllByTestId("ficha-item");
    expect(fichas).toHaveLength(4);
    expect(fichas.slice(0, 2).every((f) => !dentroDe(f, "fichas-solo-ancho"))).toBe(true);
    expect(fichas.slice(2).every((f) => dentroDe(f, "fichas-solo-ancho"))).toBe(true);
    const mas = screen.getAllByTestId("ficha-mas");
    expect(mas).toHaveLength(1);
    expect(mas[0]).toHaveTextContent("+2");
    expect(dentroDe(mas[0], "fichas-solo-angosto")).toBe(true);
  });

  it("con 5 productos: ancha/apilada muestra 3 y +2; angosta muestra 2 y +3", () => {
    renderizar({ items: itemsDe(5) });
    const fichas = screen.getAllByTestId("ficha-item");
    expect(fichas).toHaveLength(3);
    expect(dentroDe(fichas[2], "fichas-solo-ancho")).toBe(true);
    const [ancho, angosto] = screen.getAllByTestId("ficha-mas");
    expect(ancho).toHaveTextContent("+2");
    expect(dentroDe(ancho, "fichas-solo-ancho")).toBe(true);
    expect(angosto).toHaveTextContent("+3");
    expect(dentroDe(angosto, "fichas-solo-angosto")).toBe(true);
  });

  it("con 7 productos: +4 en ancha/apilada y +5 en angosta", () => {
    renderizar({ items: itemsDe(7) });
    expect(screen.getAllByTestId("ficha-mas").map((m) => m.textContent)).toEqual(["+4", "+5"]);
  });

  it("no lista los nombres de los productos (viven en la página del combo), pero sí el chip N productos", () => {
    renderizar();
    expect(screen.queryByText(/Lámpara/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mesa/)).not.toBeInTheDocument();
    expect(screen.getByText("3 productos")).toBeInTheDocument();
  });

  it("cada foto va enmarcada: object-contain absoluta dentro de la ficha", () => {
    renderizar({ items: [{ productId: 1, nombre: "Lámpara", cantidad: 1, precioLista: "1000", foto: "https://x/1.jpg", ruta: "/producto/1", categoria: null }, ...itemsDe(2).map((i) => ({ ...i, productId: i.productId + 1 }))] });
    const img = screen.getAllByTestId("ficha-item")[0].querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img.className).toContain("object-contain");
    expect(img.className).toContain("absolute");
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

  it("sin efecto hover: la card no se mueve ni cambia de sombra, y lleva la sombra fija del ticket", () => {
    renderizar();
    const article = screen.getByRole("article");
    expect(article.className).toContain("shadow-sombra-ticket");
    expect(article.className).not.toMatch(/hover:/);
    expect(article.className).not.toMatch(/translate/);
  });

  it("el troquel es solo la línea punteada, sin muescas", () => {
    const { container } = renderizar();
    expect(container.querySelector(".muesca-a, .muesca-b")).toBeNull();
  });

  it("el sello va en el rojo propio con texto blanco y nombra el descuento", () => {
    renderizar();
    const sello = screen.getByLabelText("15% de descuento");
    expect(sello.className).toContain("bg-sello");
    expect(sello.className).toContain("text-on-primary");
  });

  it("la pastilla Ahorrás lleva el ícono de ahorro", () => {
    renderizar();
    const ahorro = screen.getByText(/Ahorrás/);
    expect(ahorro).toHaveTextContent("Ahorrás $ 6.750");
    expect(ahorro.querySelector(".material-symbols-outlined")).toHaveTextContent("savings");
  });

});
