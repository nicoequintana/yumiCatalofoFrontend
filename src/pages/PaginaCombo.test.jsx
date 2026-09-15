import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../context/ToastContext.jsx";
import PaginaCombo from "./PaginaCombo.jsx";

const mockUseCombo = vi.fn();
const agregarMock = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useCombo.js", () => ({ default: (...a) => mockUseCombo(...a) }));
vi.mock("../hooks/useCarrito.js", () => ({ default: () => ({ agregar: agregarMock }) }));
// `BotonWhatsapp` lee el número de la config de contacto.
vi.mock("../api/config.js", () => ({
  getConfigContacto: () =>
    Promise.resolve({ whatsapp: { numero: "5491100000000", dentroDeHorario: true, textoHorario: null } }),
}));

function combo(extra = {}) {
  return {
    id: 3, ruta: "/combos/3-kit-living-calido", nombre: "Kit Living Cálido",
    frase: "Luz suave y una mesa de roble.", porcentaje: 15,
    precioSeparado: "45000", precioCombo: "38250", ahorro: "6750", unidades: 3,
    alcanza: 4, disponible: true, quedanPocos: false, heroUrl: "https://x/1.jpg",
    items: [
      { productId: 1, nombre: "Lámpara", cantidad: 2, precioLista: "10000", foto: null, ruta: "/producto/1-lampara", categoria: "Iluminación" },
      { productId: 2, nombre: "Mesa", cantidad: 1, precioLista: "25000", foto: null, ruta: "/producto/2-mesa", categoria: "Living" },
    ],
    ...extra,
  };
}

function renderizar(elemento = <PaginaCombo />) {
  return render(
    <MemoryRouter initialEntries={["/combos/3-kit-living-calido"]}>
      <ToastProvider>
        <Routes>
          <Route path="/combos/:idSlug" element={elemento} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseCombo.mockReset();
  agregarMock.mockClear();
});

describe("PaginaCombo", () => {
  it("la imagen principal lleva el nombre del combo como texto alternativo, igual que la foto primaria de un producto", () => {
    mockUseCombo.mockReturnValue({ combo: combo(), cargando: false, error: null, noEncontrado: false });
    renderizar();

    expect(screen.getByRole("img", { name: "Kit Living Cálido" })).toHaveAttribute("src", "https://x/1.jpg");
  });

  it("pide el combo de la ruta y muestra el título, qué incluye y la cuenta con los textos del cuerpo SEO", () => {
    mockUseCombo.mockReturnValue({ combo: combo(), cargando: false, error: null, noEncontrado: false });
    renderizar();

    expect(mockUseCombo).toHaveBeenCalledWith("3-kit-living-calido");
    expect(screen.getByRole("heading", { level: 1, name: "Kit Living Cálido" })).toBeInTheDocument();
    expect(screen.getByText("Qué incluye")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3 productos, un solo precio" })).toBeInTheDocument();
    expect(screen.getByText("2 × Lámpara")).toBeInTheDocument();
    expect(screen.getByText("Mesa")).toBeInTheDocument();
    expect(screen.getByText("La cuenta")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Juntos te salen $ 6.750 menos" })).toBeInTheDocument();
    expect(screen.getByText("Por separado (3 productos)")).toBeInTheDocument();
    expect(screen.getByText("Descuento combo 15%")).toBeInTheDocument();
  });

  it("el sello del descuento y el link a WhatsApp están en el ticket", async () => {
    mockUseCombo.mockReturnValue({ combo: combo(), cargando: false, error: null, noEncontrado: false });
    renderizar();

    const ticket = screen.getByRole("region", { name: "Comprar combo" });
    expect(within(ticket).getByText("-15%")).toBeInTheDocument();
    expect(await within(ticket).findByRole("link", { name: "Contactar por WhatsApp" })).toBeInTheDocument();
  });

  // Rediseño del 15/09/2026: el ticket de la página habla el mismo idioma que
  // la card (sin muescas, sello rojo propio, sombra fija, fichas enmarcadas).
  it("el ticket va como la card: sin muescas, sello rojo, sombra de ticket y fichas enmarcadas", () => {
    mockUseCombo.mockReturnValue({ combo: combo(), cargando: false, error: null, noEncontrado: false });
    const { container } = renderizar();

    const ticket = screen.getByRole("region", { name: "Comprar combo" });
    expect(ticket.className).toContain("shadow-sombra-ticket");
    expect(ticket.className).not.toMatch(/hover:/);
    expect(container.querySelector(".muesca-a, .pc-muesca-b, .muesca-b")).toBeNull();
    expect(within(ticket).getByLabelText("15% de descuento").className).toContain("bg-sello");
    expect(within(ticket).getAllByTestId("ficha-item")).toHaveLength(2);
    expect(within(ticket).getAllByTestId("ficha-item")[0]).toHaveClass("bg-surface-container-lowest", "shadow-sombra-ficha");
    const cuerpo = ticket.querySelector(".tarjeta-combo-cuerpo");
    expect(cuerpo).toHaveClass("bg-crema-arte", "relative", "isolate");
    expect(cuerpo).not.toHaveClass("fondo-ticket-combo");
    const arte = cuerpo.querySelector(".arte-combo");
    expect(arte).toHaveAttribute("aria-hidden", "true");
    expect(arte.textContent).toBe("");
    expect(arte.querySelector(".arte-combo-lettering")).not.toBeNull();
    expect(arte.querySelector(".arte-combo-marca")).not.toBeNull();
    expect(cuerpo.querySelector(".tarjeta-combo-texto")).toContainElement(within(ticket).getByRole("heading", { level: 1 }));
    expect(cuerpo.querySelector(".tarjeta-combo-texto")).toContainElement(within(ticket).getByText("3 productos"));
    expect(within(ticket).queryByText(/Mejor juntos/i)).not.toBeInTheDocument();
    expect(within(ticket).queryByText("COMBO")).not.toBeInTheDocument();
    expect(within(ticket).getByText(/Ahorrás/).querySelector(".material-symbols-outlined")).toHaveTextContent("savings");
  });

  it("un solo contenedor: migas, hero, ticket y secciones cuelgan del mismo ancho", () => {
    mockUseCombo.mockReturnValue({ combo: combo(), cargando: false, error: null, noEncontrado: false });
    renderizar();

    const contenedor = screen.getByRole("navigation", { name: "Miga de pan" }).parentElement;
    expect(contenedor).toHaveClass("pc-contenedor");
    expect(contenedor).toContainElement(screen.getByRole("img", { name: "Kit Living Cálido" }));
    expect(contenedor).toContainElement(screen.getByRole("region", { name: "Comprar combo" }));
    expect(contenedor).toContainElement(screen.getByRole("heading", { name: "3 productos, un solo precio" }));
    expect(contenedor).toContainElement(screen.getByText("La cuenta"));
  });

  it("Agregar combo agrega la cantidad elegida con el selector", async () => {
    mockUseCombo.mockReturnValue({ combo: combo(), cargando: false, error: null, noEncontrado: false });
    renderizar();

    const ticket = screen.getByRole("region", { name: "Comprar combo" });
    await userEvent.click(within(ticket).getByRole("button", { name: "Aumentar cantidad" }));
    await userEvent.click(within(ticket).getByRole("button", { name: /Agregar combo/i }));

    expect(agregarMock).toHaveBeenCalledWith({ comboId: 3 }, 2);
  });

  // El talón es teal oscuro: el stepper con sus colores de siempre quedaba
  // oscuro sobre oscuro (revisión visual del 15/09/2026).
  it("el selector de cantidad del ticket va en su variante sobre fondo oscuro", () => {
    mockUseCombo.mockReturnValue({ combo: combo(), cargando: false, error: null, noEncontrado: false });
    renderizar();

    const ticket = screen.getByRole("region", { name: "Comprar combo" });
    expect(within(ticket).getByRole("button", { name: "Aumentar cantidad" })).toHaveClass("text-on-primary");
  });

  it("agotado: botones deshabilitados y chip Agotado, sigue siendo la página (no NoEncontrado)", () => {
    mockUseCombo.mockReturnValue({ combo: combo({ disponible: false, alcanza: 0 }), cargando: false, error: null, noEncontrado: false });
    renderizar();

    expect(screen.getByText("Agotado")).toBeInTheDocument();
    for (const boton of screen.getAllByRole("button", { name: /Agregar combo/i })) {
      expect(boton).toBeDisabled();
    }
  });

  it("quedanPocos muestra el chip Quedan N", () => {
    mockUseCombo.mockReturnValue({ combo: combo({ quedanPocos: true, alcanza: 2 }), cargando: false, error: null, noEncontrado: false });
    renderizar();

    expect(screen.getByText("Quedan 2")).toBeInTheDocument();
  });

  it("no encontrado: pinta NoEncontrado, no el contenido del combo", () => {
    mockUseCombo.mockReturnValue({ combo: null, cargando: false, error: null, noEncontrado: true });
    renderizar();

    expect(screen.queryByText("Qué incluye")).not.toBeInTheDocument();
  });

  it("error de carga: EstadoVacio con el mensaje, no NoEncontrado", () => {
    mockUseCombo.mockReturnValue({ combo: null, cargando: false, error: "Revisá tu conexión e intentá de nuevo.", noEncontrado: false });
    renderizar();

    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
  });

  it("con comboForzado pinta ese combo y no pide la ruta", () => {
    mockUseCombo.mockReturnValue({ combo: null, cargando: false, error: null, noEncontrado: false });
    renderizar(<PaginaCombo comboForzado={combo({ nombre: "Vista previa" })} />);

    expect(mockUseCombo).toHaveBeenCalledWith(null);
    expect(screen.getByRole("heading", { level: 1, name: "Vista previa" })).toBeInTheDocument();
  });
});
