import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const contextoMock = vi.fn();
vi.mock("../hooks/useContextoComercial.js", () => ({ default: () => contextoMock() }));

const configContactoMock = vi.fn();
vi.mock("../hooks/useConfigContacto.js", () => ({ default: () => configContactoMock() }));

const categoriasMock = vi.fn();
vi.mock("../hooks/useCategoriasNavbar.js", () => ({ default: () => categoriasMock() }));

const registrarEventoMock = vi.fn();
vi.mock("../api/products.js", () => ({ registrarEvento: (...args) => registrarEventoMock(...args) }));

const { default: Footer } = await import("./Footer.jsx");

const VACIO = { doodle: null, doodleAdmin: null, modal: null, claveDia: null, resuelto: true };
const PUBLICO = "https://res.cloudinary.com/demo/primavera.png";
const DEL_PANEL = "https://res.cloudinary.com/demo/panel.png";

const CONTACTO_VACIO = {
  contacto: {
    whatsapp: { numero: null, dentroDeHorario: null, textoHorario: null },
    email: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    direccion: null,
  },
  resuelto: true,
  error: null,
};

const CONTACTO_COMPLETO = {
  contacto: {
    whatsapp: { numero: "5491122334455", dentroDeHorario: true, textoHorario: null },
    email: "contacto@yima.com.ar",
    instagram: "https://instagram.com/yima",
    facebook: null,
    tiktok: null,
    direccion: "Av. Ejemplo 1234, CABA",
  },
  resuelto: true,
  error: null,
};

const CATEGORIA_COCINA = { id: 1, nombre: "Cocina", cantidadPublicados: 5 };

function montar(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Footer />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  contextoMock.mockReturnValue(VACIO);
  configContactoMock.mockReturnValue(CONTACTO_VACIO);
  categoriasMock.mockReturnValue({ categorias: [], resuelto: true });
});

describe("Footer", () => {
  it("sin campaña activa pinta el wordmark de siempre", () => {
    montar();

    expect(screen.getAllByAltText("YIMA")[0]).toHaveAttribute("src", "/logo-yima-160.png");
  });

  it("con campaña activa el logo del pie también es el Doodle", () => {
    // El pie y el encabezado son la misma marca en la misma página: que uno
    // lleve el arte de la campaña y el otro el wordmark de siempre se lee como
    // un error de carga, no como una decisión.
    contextoMock.mockReturnValue({ ...VACIO, doodle: { url: PUBLICO } });

    montar();

    expect(screen.getAllByAltText("YIMA")[0]).toHaveAttribute("src", PUBLICO);
  });

  it("en el login del panel aplica la MISMA regla que el navbar", () => {
    // `/catalogo/admin/login` usa este mismo Layout. Si el pie mirara siempre
    // el Doodle público, esa página mostraría dos artes distintos a la vez.
    contextoMock.mockReturnValue({
      ...VACIO,
      doodle: { url: PUBLICO },
      doodleAdmin: { url: DEL_PANEL },
    });

    montar("/catalogo/admin/login");

    expect(screen.getByAltText("YIMA")).toHaveAttribute("src", DEL_PANEL);
  });

  it("una campaña que no eligió aparecer en el panel deja el wordmark ahí", () => {
    contextoMock.mockReturnValue({ ...VACIO, doodle: { url: PUBLICO }, doodleAdmin: null });

    montar("/catalogo/admin/login");

    expect(screen.getByAltText("YIMA")).toHaveAttribute("src", "/logo-yima-160.png");
  });

  it("el login del panel sigue mostrando el pie mínimo, sin la banda de contacto", () => {
    configContactoMock.mockReturnValue(CONTACTO_COMPLETO);

    montar("/catalogo/admin/login");

    expect(screen.queryByRole("link", { name: /contactar por whatsapp/i })).not.toBeInTheDocument();
    expect(screen.getByText(/todos los derechos reservados/i)).toBeInTheDocument();
  });
});

describe("Footer — banda de contacto", () => {
  it("sin whatsapp ni mail configurados, no se muestra la banda", () => {
    montar();

    expect(screen.queryByText("¿Te ayudamos a elegir?")).not.toBeInTheDocument();
  });

  // Decisión del 13/09/2026: las tarjetas muestran solo "WhatsApp" y la
  // dirección de mail, sin leyenda de horario ni de tiempo de respuesta.
  it("las tarjetas no llevan leyenda: ni horario de WhatsApp ni tiempo de respuesta del mail", () => {
    configContactoMock.mockReturnValue({
      ...CONTACTO_COMPLETO,
      contacto: {
        ...CONTACTO_COMPLETO.contacto,
        whatsapp: { numero: "5491122334455", dentroDeHorario: false, textoHorario: "Fuera de horario" },
      },
    });

    montar();

    expect(screen.getByRole("link", { name: "Escribinos por WhatsApp" })).toHaveTextContent(/^WhatsApp$/);
    // Sin `^`: el ícono de Material Symbols aporta su ligadura ("mail") al
    // texto del link, aunque va en `aria-hidden`. Lo que importa es que nada
    // siga después de la dirección.
    expect(screen.getByRole("link", { name: /contacto@yima\.com\.ar/i })).toHaveTextContent(
      /contacto@yima\.com\.ar$/,
    );
    expect(screen.queryByText("Fuera de horario")).not.toBeInTheDocument();
    expect(screen.queryByText("Atendemos ahora")).not.toBeInTheDocument();
    expect(screen.queryByText(/te respondemos/i)).not.toBeInTheDocument();
  });

  it("el link de WhatsApp registra el evento CLICK_WHATSAPP al clickear", () => {
    configContactoMock.mockReturnValue(CONTACTO_COMPLETO);

    montar();

    const link = screen.getByRole("link", { name: "Escribinos por WhatsApp" });
    link.click();

    expect(registrarEventoMock).toHaveBeenCalledWith("CLICK_WHATSAPP");
  });

  // "Contactar por WhatsApp" es el nombre del botón de la ficha y del FAB. Con
  // el pie usando el mismo, la ficha quedaba con DOS links homónimos: ambiguo
  // para un lector de pantalla y roto para `whatsapp-detalle.spec.js`.
  it("la tarjeta de WhatsApp no comparte nombre accesible con el botón de la ficha", () => {
    configContactoMock.mockReturnValue(CONTACTO_COMPLETO);

    montar();

    expect(screen.queryByRole("link", { name: "Contactar por WhatsApp" })).not.toBeInTheDocument();
  });

  it("la tarjeta de mail arma un link mailto: con el email configurado", () => {
    configContactoMock.mockReturnValue(CONTACTO_COMPLETO);

    montar();

    const link = screen.getByRole("link", { name: /contacto@yima\.com\.ar/i });
    expect(link).toHaveAttribute("href", "mailto:contacto@yima.com.ar");
  });

  it("solo con mail (sin whatsapp), la banda se muestra igual", () => {
    configContactoMock.mockReturnValue({
      ...CONTACTO_VACIO,
      contacto: { ...CONTACTO_VACIO.contacto, email: "solo-mail@yima.com.ar" },
    });

    montar();

    expect(screen.getByText("¿Te ayudamos a elegir?")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /contactar por whatsapp/i })).not.toBeInTheDocument();
  });
});

describe("Footer — Marca", () => {
  it("muestra la tagline de marca", () => {
    montar();

    expect(
      screen.getAllByText("Objetos para la casa elegidos uno por uno.")[0],
    ).toBeInTheDocument();
  });

  it("solo muestra los íconos sociales configurados", () => {
    configContactoMock.mockReturnValue(CONTACTO_COMPLETO);

    montar();

    expect(screen.getAllByRole("link", { name: "Instagram" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Facebook" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "TikTok" })).not.toBeInTheDocument();
  });

  it("los links sociales abren en pestaña nueva sin exponer el opener", () => {
    configContactoMock.mockReturnValue(CONTACTO_COMPLETO);

    montar();

    for (const link of screen.getAllByRole("link", { name: "Instagram" })) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });
});

describe("Footer — Tienda", () => {
  // 13/09/2026: con ocho categorías la columna Tienda quedaba como un listado
  // largo. La sublista va en dos columnas en todos los anchos (en mobile,
  // dentro del desplegable). jsdom no aplica `@media`: se prueba la clase.
  it("la sublista de categorías va en dos columnas en todos los anchos", () => {
    categoriasMock.mockReturnValue({ categorias: [CATEGORIA_COCINA], resuelto: true });

    montar();

    for (const enlace of screen.getAllByRole("link", { name: "Cocina" })) {
      const sublista = enlace.closest("ul");
      expect(sublista).toHaveClass("grid", "grid-cols-2");
      expect(sublista).not.toHaveClass("flex-col");
    }
  });

  it("lista Inicio, Productos, Favoritos y Carrito", () => {
    montar();

    for (const nombre of [/^inicio$/i, /^productos$/i, /^favoritos$/i, /^carrito$/i]) {
      expect(screen.getAllByRole("link", { name: nombre }).length).toBeGreaterThan(0);
    }
  });

  it("las categorías publicadas linkean a /coleccion/categoria/:slug", () => {
    categoriasMock.mockReturnValue({ categorias: [CATEGORIA_COCINA], resuelto: true });

    montar();

    const enlaces = screen.getAllByRole("link", { name: "Cocina" });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute("href", "/coleccion/categoria/cocina");
    }
  });
});

describe("Footer — Mi cuenta", () => {
  it("lista Mi cuenta y Mis pedidos, sin consultar la sesión", () => {
    montar();

    const cuenta = screen.getAllByRole("link", { name: /^mi cuenta$/i });
    expect(cuenta.length).toBeGreaterThan(0);
    for (const link of cuenta) {
      expect(link).toHaveAttribute("href", "/cuenta");
    }

    const pedidos = screen.getAllByRole("link", { name: /mis pedidos/i });
    expect(pedidos.length).toBeGreaterThan(0);
    for (const link of pedidos) {
      expect(link).toHaveAttribute("href", "/cuenta/pedidos");
    }
  });
});

// Decisión del 13/09/2026: el showroom NO se muestra en el catálogo por ahora,
// aunque la dirección esté cargada en Configuración › Contacto. El dato se
// sigue guardando; lo que se apaga es solo la sección pública.
describe("Footer — Showroom", () => {
  it("con dirección configurada, el pie no muestra el showroom ni la dirección", () => {
    configContactoMock.mockReturnValue(CONTACTO_COMPLETO);

    montar();

    expect(screen.queryByText(/showroom/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Av. Ejemplo 1234, CABA")).not.toBeInTheDocument();
  });
});

describe("Footer — barra inferior", () => {
  it("muestra el texto de copyright", () => {
    montar();

    expect(screen.getByText("© 2026 YIMA · Todos los derechos reservados")).toBeInTheDocument();
  });

  it("linkea a la política de privacidad", () => {
    montar();

    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacidad");
  });

  it("el login del panel no lleva el link a la política de privacidad", () => {
    montar("/catalogo/admin/login");

    expect(screen.queryByRole("link", { name: "Política de privacidad" })).not.toBeInTheDocument();
  });
});
