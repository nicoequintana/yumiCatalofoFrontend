import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FichaProducto from "./FichaProducto.jsx";
import { ToastProvider } from "../context/ToastContext.jsx";
import * as configApi from "../api/config.js";

// El botón de WhatsApp NO se mockea: su renderizado es condicional (no existe
// si no hay número configurado) y el preview tiene que respetar esa condición.
// Se mockea la config que consume, para poder ejercitar ambas ramas.
vi.mock("../api/config.js");

const PRODUCTO_BASE = {
  id: 1,
  nombre: "Reloj Clásico",
  descripcion: "Un reloj elegante.",
  precio: "1000",
  etiqueta: null,
  caracteristicas: [],
  fotos: [],
  video: null,
  relacionados: [],
  fraseComercial: null,
  porQueLoVasAQuerer: null,
  tePasaEsto: null,
  beneficios: [],
  usos: [],
  idealPara: [],
  incluye: [],
  especificaciones: [],
  stock: 10,
};

function renderFicha(producto = PRODUCTO_BASE, props = {}) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <FichaProducto producto={producto} {...props} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  configApi.getWhatsappConfig.mockResolvedValue({
    numero: "5491100000000",
    dentroDeHorario: true,
    textoHorario: null,
  });
});

describe("FichaProducto — renderizado base", () => {
  it("renderiza nombre, precio y descripción del producto recibido por props", () => {
    renderFicha();

    expect(screen.getAllByText("Reloj Clásico").length).toBeGreaterThan(0);
    expect(screen.getByText("Un reloj elegante.")).toBeInTheDocument();
    expect(screen.getAllByText("$ 1.000,00").length).toBeGreaterThan(0);
  });

  it("nunca busca el producto: lo renderiza tal cual viene por props", () => {
    // No es "cero fetch": los CTA hijos consultan su propia config (WhatsApp).
    // Lo que garantiza el diseño es que la ficha no resuelve el producto por su
    // cuenta — por eso el admin puede alimentarla con estado sin guardar.
    const fetchSpy = vi.spyOn(global, "fetch");

    renderFicha({ ...PRODUCTO_BASE, nombre: "Solo desde props" });

    expect(screen.getAllByText("Solo desde props").length).toBeGreaterThan(0);
    const urlsPedidas = fetchSpy.mock.calls.map(([url]) => String(url));
    expect(urlsPedidas.some((url) => url.includes("/products"))).toBe(false);

    fetchSpy.mockRestore();
  });

  it("muestra las secciones comerciales solo cuando hay contenido", () => {
    renderFicha({
      ...PRODUCTO_BASE,
      porQueLoVasAQuerer: "Porque te simplifica la vida.",
      idealPara: [{ id: 1, texto: "Estudiantes" }],
    });

    expect(screen.getByText("¿Por qué lo vas a querer?")).toBeInTheDocument();
    expect(screen.getByText("Ideal para")).toBeInTheDocument();
    expect(screen.queryByText("¿Qué problema resuelve?")).not.toBeInTheDocument();
    expect(screen.queryByText("Ficha técnica")).not.toBeInTheDocument();
  });
});

describe("FichaProducto — modo preview", () => {
  it("por defecto (modo público) el CTA de carrito es un botón operable", () => {
    renderFicha();

    const botones = screen.getAllByRole("button", { name: /Agregar/i });
    expect(botones.length).toBeGreaterThan(0);
  });

  it("en modoPreview los CTA quedan inertes (sin clic, sin foco, fuera del árbol de a11y)", () => {
    // jsdom no implementa `inert`, así que se verifica que el mecanismo esté
    // aplicado sobre el contenedor de los CTA, no su efecto en runtime.
    const { container } = renderFicha(PRODUCTO_BASE, { modoPreview: true });

    const filasInertes = container.querySelectorAll("[inert]");
    expect(filasInertes.length).toBe(2);
    filasInertes.forEach((fila) => expect(fila.className).toContain("pointer-events-none"));
  });

  it("fuera de modoPreview los CTA son operables", () => {
    const { container } = renderFicha();

    expect(container.querySelectorAll("[inert]").length).toBe(0);
    expect(screen.getByRole("button", { name: /Agregar al carrito/i })).toBeInTheDocument();
  });

  it("en modoPreview el CTA refleja el estado agotado igual que la ficha pública", () => {
    renderFicha({ ...PRODUCTO_BASE, stock: 0 }, { modoPreview: true });

    // Con stock 0 el botón real dice "Sin stock" — si el preview siguiera
    // diciendo "Agregar al carrito", le mentiría al admin justo cuando más
    // importa.
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
    expect(screen.queryByText("Agregar al carrito")).not.toBeInTheDocument();
  });

  it("en modoPreview los CTA secundarios dicen lo mismo que en la ficha pública", async () => {
    renderFicha(PRODUCTO_BASE, { modoPreview: true });

    // El preview no puede inventar copy: si el público dice "WhatsApp", el
    // preview dice "WhatsApp". Cualquier divergencia lo vuelve mentiroso.
    expect(await screen.findByText("WhatsApp")).toBeInTheDocument();
    expect(screen.getByText("Compartir")).toBeInTheDocument();
    expect(screen.queryByText("Consultar")).not.toBeInTheDocument();
  });

  it("en modoPreview NO muestra el CTA de WhatsApp si no hay número configurado", async () => {
    // `BotonWhatsapp` devuelve null sin número. Si el preview lo dibujara
    // igual, le prometería al admin un botón que el cliente nunca ve.
    configApi.getWhatsappConfig.mockResolvedValue({ numero: null, dentroDeHorario: false });

    renderFicha(PRODUCTO_BASE, { modoPreview: true });

    expect(await screen.findByText("Compartir")).toBeInTheDocument();
    expect(screen.queryByText("WhatsApp")).not.toBeInTheDocument();
  });

  it("en modoPreview el CTA de WhatsApp vive dentro del contenedor inerte", async () => {
    const { container } = renderFicha(PRODUCTO_BASE, { modoPreview: true });

    const enlace = await screen.findByRole("link", { name: /WhatsApp/i });
    expect(enlace.closest("[inert]")).not.toBeNull();
    expect(container.querySelector("[inert]")).toBeTruthy();
  });

  it("en modoPreview no renderiza el CTA sticky mobile", () => {
    renderFicha(PRODUCTO_BASE, { modoPreview: true });

    expect(screen.queryByTestId("cta-sticky-mobile")).not.toBeInTheDocument();
  });

  it("en modoPreview no renderiza los productos relacionados", () => {
    renderFicha(
      {
        ...PRODUCTO_BASE,
        relacionados: [{ id: 2, nombre: "Reloj Deportivo", precio: "800", etiqueta: null, categoria: null, fotos: [] }],
      },
      { modoPreview: true },
    );

    expect(screen.queryByText("También te puede interesar")).not.toBeInTheDocument();
  });
});

const PRODUCTO_VACIO = {
  id: null,
  nombre: "",
  descripcion: "",
  precio: "",
  etiqueta: null,
  stock: 0,
  fraseComercial: null,
  porQueLoVasAQuerer: null,
  tePasaEsto: null,
  beneficios: [],
  usos: [],
  idealPara: [],
  incluye: [],
  especificaciones: [],
  caracteristicas: [],
  fotos: [],
  video: null,
  relacionados: [],
};

describe("FichaProducto — plantilla completa", () => {
  it("muestra todas las secciones aunque el producto esté vacío", () => {
    renderFicha(PRODUCTO_VACIO, { modoPreview: true, plantillaCompleta: true });

    // El layout no salta mientras se carga: la estructura está desde el
    // arranque y también funciona como mapa de lo que se puede cargar.
    expect(screen.getByText("¿Por qué lo vas a querer?")).toBeInTheDocument();
    expect(screen.getByText("¿Qué problema resuelve?")).toBeInTheDocument();
    expect(screen.getByText("Ideal para")).toBeInTheDocument();
    expect(screen.getByText("Incluye")).toBeInTheDocument();
    expect(screen.getByText("Ficha técnica")).toBeInTheDocument();
  });

  it("sin plantillaCompleta las secciones vacías no se renderizan", () => {
    renderFicha(PRODUCTO_VACIO, { modoPreview: true, plantillaCompleta: false });

    expect(screen.queryByText("¿Por qué lo vas a querer?")).not.toBeInTheDocument();
    expect(screen.queryByText("¿Qué problema resuelve?")).not.toBeInTheDocument();
    expect(screen.queryByText("Ficha técnica")).not.toBeInTheDocument();
  });

  it("marca cada hueco vacío como no publicable", () => {
    renderFicha(PRODUCTO_VACIO, { modoPreview: true, plantillaCompleta: true });

    const huecos = screen.getAllByTestId("bloque-vacio");
    expect(huecos.length).toBeGreaterThan(0);
  });

  it("un campo cargado deja de mostrar su hueco", () => {
    const { rerender } = renderFicha(PRODUCTO_VACIO, {
      modoPreview: true,
      plantillaCompleta: true,
    });
    const huecosIniciales = screen.getAllByTestId("bloque-vacio").length;

    rerender(
      <MemoryRouter>
        <ToastProvider>
          <FichaProducto
            producto={{ ...PRODUCTO_VACIO, porQueLoVasAQuerer: "Porque sí." }}
            modoPreview
            plantillaCompleta
          />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText("Porque sí.")).toBeInTheDocument();
    expect(screen.getAllByTestId("bloque-vacio").length).toBe(huecosIniciales - 1);
  });

  it("un producto completo no muestra ningún hueco, ni con plantillaCompleta", () => {
    renderFicha(
      {
        ...PRODUCTO_BASE,
        etiqueta: "Nuevo",
        fraseComercial: "Frase",
        porQueLoVasAQuerer: "Porque sí",
        tePasaEsto: "Te pasa",
        beneficios: [{ id: 1, texto: "b" }],
        usos: [{ id: 2, texto: "u" }],
        idealPara: [{ id: 3, texto: "i" }],
        incluye: [{ id: 4, texto: "in" }],
        especificaciones: [{ id: 5, nombre: "n", valor: "v" }],
        caracteristicas: [{ id: 6, texto: "c" }],
        fotos: [{ id: 7, url: "/f.jpg", orden: 0 }],
      },
      { modoPreview: true, plantillaCompleta: true },
    );

    expect(screen.queryAllByTestId("bloque-vacio")).toHaveLength(0);
  });

  it("la plantilla completa solo aplica en preview, nunca en la ficha pública", () => {
    // Un descuido pasando el prop desde la página pública no debe mostrarle
    // secciones vacías a un cliente.
    renderFicha(PRODUCTO_VACIO, { plantillaCompleta: true });

    expect(screen.queryByText("¿Por qué lo vas a querer?")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("bloque-vacio")).toHaveLength(0);
  });
});

describe("FichaProducto — variante compacta", () => {
  it("por defecto el hero usa el layout de dos columnas en pantallas grandes", () => {
    const { container } = renderFicha();
    expect(container.querySelector(".lg\\:grid-cols-12")).not.toBeNull();
  });

  it("con `compacto` la galería se limita en altura para no tapar el resto", () => {
    // Sin tope, el `aspect-[4/5]` de la galería ocupa toda la pantalla en el
    // panel del preview y esconde el CTA, el nombre y el precio.
    const { container } = renderFicha(
      { ...PRODUCTO_BASE, fotos: [{ id: 1, url: "/f.jpg", orden: 0 }] },
      { compacto: true },
    );
    expect(container.querySelector(".max-h-\\[460px\\]")).not.toBeNull();
  });

  it("con `compacto` el hero se apila en una sola columna", () => {
    // El preview del admin vive en un contenedor angosto: los breakpoints de
    // viewport (`lg:`) no lo saben y desbordarían el layout.
    const { container } = renderFicha(PRODUCTO_BASE, { compacto: true });
    expect(container.querySelector(".lg\\:grid-cols-12")).toBeNull();
  });
});

describe("FichaProducto — estados de stock", () => {
  it("muestra el badge Agotado cuando el stock es 0", () => {
    renderFicha({ ...PRODUCTO_BASE, stock: 0 });
    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });

  it("muestra el badge de stock bajo cuando quedan 3 o menos", () => {
    renderFicha({ ...PRODUCTO_BASE, stock: 2 });
    expect(screen.getByText("Últimos 2")).toBeInTheDocument();
  });

  it("no muestra ningún badge de stock cuando hay stock holgado", () => {
    renderFicha({ ...PRODUCTO_BASE, stock: 25 });
    expect(screen.queryByText("Agotado")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Últimos/)).not.toBeInTheDocument();
  });
});

describe("FichaProducto — datos incompletos (preview de un producto a medio cargar)", () => {
  it("no rompe cuando faltan las listas de contenido comercial", () => {
    expect(() =>
      renderFicha({
        id: null,
        nombre: "Sin nada",
        descripcion: "",
        precio: "",
        stock: 0,
      }),
    ).not.toThrow();

    expect(screen.getAllByText("Sin nada").length).toBeGreaterThan(0);
  });

  it("muestra un placeholder de nombre cuando el nombre está vacío en modoPreview", () => {
    renderFicha({ ...PRODUCTO_BASE, nombre: "" }, { modoPreview: true });

    expect(screen.getByText("Nombre del producto")).toBeInTheDocument();
  });
});
