import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
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

  // Arte del cuerpo dibujado en CÓDIGO (15/09/2026, `combos-fondo-separado.html`):
  // manchas, curva, subrayado y rayitas son SVG `aria-hidden` sin `<text>`, y
  // "Mejor juntos" / "COMBO" salen de `content:` de pseudo-elementos — nunca
  // texto del DOM (regla de cloaking y lectores de pantalla).
  it("el cuerpo lleva el arte en una capa aria-hidden, sin texto decorativo en el DOM ni imagen de fondo", () => {
    const { container } = renderizar();
    const cuerpo = container.querySelector(".tarjeta-combo-cuerpo");
    expect(cuerpo).toHaveClass("bg-crema-arte", "relative", "isolate");
    expect(cuerpo).not.toHaveClass("fondo-ticket-combo");
    const arte = cuerpo.querySelector(".arte-combo");
    expect(arte).not.toBeNull();
    expect(arte).toHaveAttribute("aria-hidden", "true");
    expect(arte.textContent).toBe("");
    expect(arte.querySelectorAll("svg text")).toHaveLength(0);
    expect(arte.querySelectorAll(".arte-combo-mancha")).toHaveLength(4);
    expect(arte.querySelector(".arte-combo-lettering .arte-combo-script")).not.toBeNull();
    expect(arte.querySelector(".arte-combo-lettering svg.arte-combo-subrayado")).not.toBeNull();
    expect(arte.querySelector(".arte-combo-r1")).not.toBeNull();
    expect(arte.querySelector(".arte-combo-r2")).not.toBeNull();
    expect(arte.querySelector(".arte-combo-marca")).not.toBeNull();
    expect(screen.queryByText(/Mejor juntos/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/juntos/i)).not.toBeInTheDocument();
    expect(screen.queryByText("COMBO")).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="fondo-combo"]')).toBeNull();
    // Chips, título y frase siguen juntos; los chips reservan el lugar del lettering.
    expect(container.querySelector(".tarjeta-combo-texto")).toContainElement(screen.getByText("Kit Living Cálido"));
    expect(container.querySelector(".tarjeta-combo-texto .chips-combo")).toContainElement(screen.getByText("3 productos"));
  });

  it("las fichas son baldosas blancas con sombra suave, sin aro beige; el +N va en gris cálido", () => {
    renderizar({ items: itemsDe(5) });
    const ficha = screen.getAllByTestId("ficha-item")[0];
    expect(ficha).toHaveClass("bg-surface-container-lowest", "shadow-sombra-ficha");
    expect(ficha.className).not.toMatch(/\bbg-surface-container\b(?!-)/);
    const mas = screen.getAllByTestId("ficha-mas")[0];
    expect(mas).toHaveClass("bg-surface-container-high");
    expect(mas.className).not.toMatch(/shadow-sombra-ficha/);
  });
});

describe("arte del ticket en index.css", () => {
  const aqui = dirname(fileURLToPath(import.meta.url));
  const css = readFileSync(join(aqui, "../index.css"), "utf8").replace(/\r\n/g, "\n");
  const html = readFileSync(join(aqui, "../../index.html"), "utf8");
  /** La primera regla `selector { ... }` a nivel raíz (fuera de at-rules). */
  const bloque = (selector) => {
    const inicio = css.indexOf(`\n${selector} {`);
    return inicio === -1 ? "" : css.slice(inicio, css.indexOf("}", inicio) + 1);
  };
  /** La regla `selector { ... }` dentro de `@container <condicion> {` (la primera con esa condición que la declara). */
  function reglaEn(condicion, selector) {
    let desde = 0;
    for (;;) {
      const inicio = css.indexOf(`@container ${condicion} {`, desde);
      if (inicio === -1) return "";
      const fin = css.indexOf("\n}", inicio);
      const cuerpo = css.slice(inicio, fin);
      const r = cuerpo.indexOf(`${selector} {`);
      if (r !== -1) return cuerpo.slice(r, cuerpo.indexOf("}", r) + 1);
      desde = fin;
    }
  }

  it("las palabras decorativas salen de content: de pseudo-elementos, con texto alternativo vacío", () => {
    expect(bloque(".arte-combo-script::before")).toMatch(/content:\s*"Mejor"\s*\/\s*""/);
    expect(bloque(".arte-combo-script::after")).toMatch(/content:\s*"juntos"\s*\/\s*""/);
    expect(bloque(".arte-combo-marca::before")).toMatch(/content:\s*"COMBO"\s*\/\s*""/);
  });

  it("el lettering usa Dancing Script con respaldo cursive, cargada como Outfit (Google Fonts, 700, swap)", () => {
    expect(bloque(".arte-combo-script")).toMatch(/font-family:\s*"Dancing Script",[^;]*cursive/);
    expect(html).toMatch(/fonts\.googleapis\.com\/css2\?family=Dancing\+Script:wght@700[^"]*display=swap/);
  });

  it("ubicación apilada: lettering arriba a la derecha y chips con reserva; COMBO abajo a la derecha escalando con cqw", () => {
    expect(bloque(".arte-combo-lettering")).toMatch(/right:\s*16px;[\s\S]*top:\s*8px/);
    expect(bloque(".chips-combo")).toMatch(/padding-right:\s*110px/);
    expect(bloque(".arte-combo-marca")).toMatch(/font-size:\s*clamp\(38px, 15cqw, 68px\)/);
    // Fix round 1: a `bottom: 50px` el borde girado de "COMBO" rozaba la frase
    // larga; a 30px queda centrado junto a las fichas (medido: 0 cruces).
    expect(bloque(".arte-combo-marca")).toMatch(/bottom:\s*30px/);
    expect(reglaEn("(max-width: 380px)", ".arte-combo-marca")).toMatch(/bottom:\s*30px/);
  });

  it("≤ 300px oculta lettering y rayitas; ancha ≥ 720px corre el lettering al 58% y el texto no pasa del 58%", () => {
    expect(reglaEn("(max-width: 300px)", ".arte-combo-lettering")).toMatch(/display:\s*none/);
    expect(reglaEn("(max-width: 300px)", ".arte-combo-rayitas")).toMatch(/display:\s*none/);
    expect(reglaEn("(min-width: 720px)", ".arte-combo-lettering")).toMatch(/left:\s*58%/);
    expect(reglaEn("(min-width: 720px)", ".tarjeta-combo-texto")).toMatch(/max-width:\s*58%/);
    expect(reglaEn("(min-width: 720px)", ".arte-combo-marca")).toMatch(/clamp\(60px, 10\.5cqw, 108px\)/);
  });

  // Fix round 1: con el cuerpo claro angosto dentro del ticket ancho (contenido
  // < ~620px: card < 1022px de contenedor, página < 1072px) el tope del 58%
  // dejaba el título largo en 6 líneas. Ahí vuelve la ubicación APILADA.
  it("cuerpo angosto dentro del ticket ancho: texto a todo el ancho y arte en ubicación apilada (card < 1022, página < 1072)", () => {
    const card = "(min-width: 720px) and (max-width: 1021.98px)";
    expect(reglaEn(card, ".tarjeta-combo-texto")).toMatch(/max-width:\s*none/);
    expect(reglaEn(card, ".chips-combo")).toMatch(/padding-right:\s*110px/);
    expect(reglaEn(card, ".arte-combo-lettering")).toMatch(/right:\s*16px;[\s\S]*top:\s*8px/);
    expect(reglaEn(card, ".arte-combo-lettering")).toMatch(/left:\s*auto/);
    expect(reglaEn(card, ".arte-combo-script")).toMatch(/font-size:\s*22px/);
    expect(reglaEn(card, ".arte-combo-r1")).toMatch(/display:\s*none/);
    expect(reglaEn(card, ".arte-combo-marca")).toMatch(/clamp\(38px, 15cqw, 68px\)/);
    expect(reglaEn(card, ".arte-combo-marca")).toMatch(/bottom:\s*40px/);
    const pagina = "(min-width: 720px) and (max-width: 1071.98px)";
    expect(reglaEn(pagina, ".tarjeta-combo-pagina .tarjeta-combo-texto")).toMatch(/max-width:\s*none/);
    expect(reglaEn(pagina, ".tarjeta-combo-pagina .arte-combo-lettering")).toMatch(/left:\s*auto/);
    expect(reglaEn(pagina, ".tarjeta-combo-pagina .arte-combo-marca")).toMatch(/clamp\(38px, 15cqw, 68px\)/);
  });

  it("Outfit se carga también en 900: la marca de agua y el sello no caen al 800", () => {
    expect(html).toMatch(/family=Outfit:wght@[\d;]*900/);
    expect(bloque(".arte-combo-marca")).toMatch(/font-weight:\s*900/);
  });

  it("sin fondo raster: ni WebP ni PNG del arte en el CSS, y los derivados WebP no existen", () => {
    expect(css).not.toMatch(/fondo-combo|fondo-ticket-combo|bg_(desktop|mobile)_card_combo/);
    ["fondo-combo-alto-720.webp", "fondo-combo-ancho-1100.webp", "fondo-combo-ancho-1600.webp"].forEach((f) => {
      expect(existsSync(join(aqui, "../assets/combos", f))).toBe(false);
    });
  });
});
