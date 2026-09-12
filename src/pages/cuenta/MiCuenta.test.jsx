import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MiCuenta from "./MiCuenta.jsx";
import usePerfilCliente, * as perfilCliente from "../../hooks/usePerfilCliente.js";
import useWhatsapp from "../../hooks/useWhatsapp.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({
  default: vi.fn(),
  invalidarPerfil: vi.fn(),
  refrescarPerfil: vi.fn(),
}));
vi.mock("../../hooks/useWhatsapp.js", () => ({ default: vi.fn() }));

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function renderMiCuenta(perfil) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil, resuelto: true, error: null });
  return render(
    <MemoryRouter>
      <MiCuenta />
    </MemoryRouter>,
  );
}

const PERFIL_LOCAL = {
  id: 1,
  email: "cliente@gmail.com",
  nombre: "Cliente Prueba",
  apodo: null,
  telefono: "1122334455",
  dni: "12345678",
  tieneGoogle: false,
  tienePassword: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useWhatsapp).mockReturnValue({ url: "https://wa.me/5491138601251?text=hola" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MiCuenta — identidad", () => {
  it("muestra el email del perfil", () => {
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByText("cliente@gmail.com")).toBeInTheDocument();
  });

  it("sin apodo, el nombre visible es el nombre", () => {
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: null });
    expect(screen.getByTestId("nombre-visible")).toHaveTextContent("Cliente Prueba");
  });

  it("con apodo, el nombre visible es el apodo", () => {
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: "Tito" });
    expect(screen.getByTestId("nombre-visible")).toHaveTextContent("Tito");
  });

  it("sin apodo, las iniciales salen del nombre", () => {
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: null });
    expect(screen.getByTestId("avatar-iniciales")).toHaveTextContent("CP");
  });

  it("con apodo, las iniciales salen del APODO y no del nombre", () => {
    // El caso que justifica que sea UNA sola expresión: con fuentes distintas
    // se vería "CP" al lado de "Tito".
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: "Tito" });
    expect(screen.getByTestId("avatar-iniciales")).toHaveTextContent("T");
  });

  it("el nombre grande usa headline-md, no el mismo peldaño que el email", () => {
    // No es cosmética: `label-lg` (16/600) queda casi igual que el email
    // (`body-md`, 16/400) que tiene justo debajo, y el "nombre grande" de la
    // spec deja de existir. La jerarquía la fija el token, y el token es lo
    // único que se puede afirmar acá: jsdom no calcula el CSS de Tailwind.
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByTestId("nombre-visible")).toHaveClass("text-headline-md");
  });

  it("un nombre que queda vacío al recortarlo NO rompe la pantalla", () => {
    // `" "` entra a la base tal cual: el guardado del login valida `!== ""`
    // SIN `trim()`, y `!perfil.nombre` con `" "` da false, así que pasa el
    // guard y el chequeo de perfil incompleto. Sin blindar, `[""]` del split
    // hacía `undefined.toUpperCase()` y la pantalla quedaba en blanco.
    renderMiCuenta({ ...PERFIL_LOCAL, nombre: " ", apodo: null });
    expect(screen.getByTestId("avatar-iniciales")).toHaveTextContent("");
    expect(screen.getByText("cliente@gmail.com")).toBeInTheDocument();
  });

  it("un apodo que queda vacío al recortarlo tampoco rompe la pantalla", () => {
    // `" "` es truthy, así que gana el `||` y llega a `iniciales()` igual que
    // un nombre en blanco.
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: " " });
    expect(screen.getByTestId("avatar-iniciales")).toHaveTextContent("");
    expect(screen.getByText("cliente@gmail.com")).toBeInTheDocument();
  });

  it("la fila de datos muestra nombre, apodo, teléfono y DNI con UN solo Editar", () => {
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: "Tito" });
    const fila = screen.getByTestId("fila-datos-personales");
    expect(fila).toHaveTextContent("Cliente Prueba");
    expect(fila).toHaveTextContent("Tito");
    expect(fila).toHaveTextContent("1122334455");
    expect(fila).toHaveTextContent("12345678");
    expect(screen.getAllByRole("link", { name: /Editar/ })).toHaveLength(1);
  });

  it("cada dato personal va en su propio bloque con su ícono", () => {
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: "Tito" });
    const campos = within(screen.getByTestId("fila-datos-personales")).getAllByTestId("campo-contacto");
    expect(campos.map((campo) => campo.dataset.icono)).toEqual(["person", "sell", "call", "badge"]);
  });

  it("la acción de cada fila de contacto va abajo de todo, después de los campos", () => {
    renderMiCuenta(PERFIL_LOCAL);
    const filaDatos = screen.getByTestId("fila-datos-personales");
    const filaEmail = screen.getByTestId("fila-email");
    expect(filaDatos.lastElementChild).toHaveAttribute("data-testid", "pie-contacto");
    expect(filaDatos.lastElementChild).toHaveTextContent("Editar");
    expect(filaEmail.lastElementChild).toHaveAttribute("data-testid", "pie-contacto");
    expect(filaEmail.lastElementChild).toHaveTextContent("Cambiar");
  });

  it("sin apodo, la fila de datos lo dice en vez de dejar el hueco", () => {
    renderMiCuenta({ ...PERFIL_LOCAL, apodo: null });
    expect(screen.getByTestId("fila-datos-personales")).toHaveTextContent("Sin apodo");
  });
});

describe("MiCuenta — navegación", () => {
  it('"Volver a la tienda" lleva siempre a la home', async () => {
    renderMiCuenta(PERFIL_LOCAL);
    await userEvent.click(screen.getByRole("button", { name: "Volver a la tienda" }));
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("cada acceso apunta a su destino", () => {
    renderMiCuenta(PERFIL_LOCAL);
    const destino = (nombre) =>
      screen.getByRole("link", { name: new RegExp(nombre) }).getAttribute("href");

    expect(destino("Mis pedidos")).toBe("/cuenta/pedidos");
    expect(destino("Mis favoritos")).toBe("/favoritos");
    expect(destino("Seguridad y acceso")).toBe("/cuenta/seguridad");
    expect(destino("Cambiar")).toBe("/cuenta/email");
    expect(destino("Editar")).toBe("/cuenta/datos");
  });

  it("la fila de ayuda apunta a WhatsApp cuando hay número configurado", () => {
    renderMiCuenta(PERFIL_LOCAL);
    const ayuda = screen.getByRole("link", { name: /Ayuda y soporte/ });
    expect(ayuda).toHaveAttribute("href", expect.stringContaining("wa.me"));
  });

  it("la fila de ayuda avisa en su nombre accesible que abre otra pestaña", () => {
    // El único indicador de que el link sale del sitio es el ícono
    // `open_in_new`, y está en `aria-hidden`: quien usa lector de pantalla no
    // se entera de que va a perder la pantalla en la que estaba.
    renderMiCuenta(PERFIL_LOCAL);
    expect(
      screen.getByRole("link", { name: /Ayuda y soporte.*pestaña nueva/s }),
    ).toBeInTheDocument();
  });

  it("sin número de WhatsApp, la fila de ayuda no se dibuja", () => {
    vi.mocked(useWhatsapp).mockReturnValue({ url: null });
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.queryByRole("link", { name: /Ayuda y soporte/ })).not.toBeInTheDocument();
    // La lista sigue entera: la fila ausente no deja un borde huérfano ni
    // rompe el `divide-y`, porque no se renderiza ningún nodo.
    expect(screen.getByRole("link", { name: /Seguridad y acceso/ })).toBeInTheDocument();
  });
});

describe("MiCuenta — cerrar sesión", () => {
  it('pide confirmación con "Vas a cerrar sesión en todos tus dispositivos." antes de salir', async () => {
    const user = userEvent.setup();

    renderMiCuenta(PERFIL_LOCAL);
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    expect(
      screen.getByText("Vas a cerrar sesión en todos tus dispositivos."),
    ).toBeInTheDocument();
    expect(cuentaApi.salirCuenta).not.toHaveBeenCalled();
  });

  it("al confirmar, llama a salirCuenta, invalida el perfil y navega a /", async () => {
    const user = userEvent.setup();
    cuentaApi.salirCuenta.mockResolvedValue(undefined);

    renderMiCuenta(PERFIL_LOCAL);
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await user.click(screen.getByRole("button", { name: "Confirmar cierre de sesión" }));

    await waitFor(() => expect(cuentaApi.salirCuenta).toHaveBeenCalledTimes(1));
    expect(perfilCliente.invalidarPerfil).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});

/*
 * jsdom no aplica media queries: estos tests NO verifican cómo se ve la
 * pantalla en escritorio, solo que el markup del que depende ESE CSS está
 * puesto — el contenedor tiene las clases de grilla, la fila tiene las de
 * tarjeta, el botón de salir quedó anidado donde el diseño lo pide.
 */
describe("MiCuenta — markup del layout de escritorio", () => {
  it("la grilla de dos columnas tiene sus clases de lg", () => {
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByTestId("grilla-mi-cuenta")).toHaveClass(
      "lg:grid",
      "lg:grid-cols-5",
      "lg:items-start",
      "lg:gap-6",
      // La fila 2 (`1fr`) absorbe lo que la tarjeta de perfil mide de más:
      // con filas `auto`, la fila 1 tomaba la altura del perfil y dejaba
      // "Configuración" colgando lejos de "Mis pedidos".
      "lg:grid-rows-[auto_1fr_auto]",
    );
  });

  it("el botón de Cerrar sesión es el último hijo del contenedor de la página", () => {
    // En escritorio el botón queda bajo la tarjeta de perfil (misma columna,
    // fila siguiente). Pero en mobile la grilla es una sola columna: lo que
    // importa ahí no es de qué tarjeta "es dueño" sino su posición en el DOM.
    // Es la única acción destructiva de la pantalla, y tiene que seguir
    // siendo el último bloque, no el segundo arriba de "Mis pedidos".
    renderMiCuenta(PERFIL_LOCAL);
    const boton = screen.getByRole("button", { name: "Cerrar sesión" });
    const grilla = screen.getByTestId("grilla-mi-cuenta");
    expect(grilla.lastElementChild.contains(boton)).toBe(true);
  });

  it("cada fila de Configuración gana su propio marco de tarjeta en escritorio", () => {
    renderMiCuenta(PERFIL_LOCAL);
    const fila = screen.getByRole("link", { name: /Mis favoritos/ });
    expect(fila).toHaveClass(
      "lg:rounded-2xl",
      "lg:border",
      "lg:border-outline-variant",
      "lg:bg-surface-container-lowest",
    );
  });

  it("el contenedor de la lista pasa de lista dividida a grilla en escritorio", () => {
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByTestId("lista-configuracion")).toHaveClass(
      "lg:grid",
      "lg:grid-cols-2",
      "lg:divide-y-0",
      "lg:border-0",
    );
  });

  it("el avatar crece en escritorio", () => {
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByTestId("avatar-iniciales")).toHaveClass("lg:h-24", "lg:w-24");
  });

  it('el título "Mis pedidos" crece en escritorio sin agrandarse en mobile', () => {
    // El token pasó a `headline-sm` en escritorio (lo pedía la spec), pero SIN
    // el prefijo `lg:` el banner también crecía en mobile: 1px de tamaño y
    // ~7px de caja de línea de más, sin que nadie lo hubiera pedido.
    renderMiCuenta(PERFIL_LOCAL);
    const titulo = screen.getByText("Mis pedidos");
    expect(titulo).toHaveClass(
      "font-label-lg",
      "text-label-lg",
      "lg:font-headline-sm",
      "lg:text-headline-sm",
    );
  });

  it("la tarjeta de perfil y el botón de salir comparten la columna 1 de la grilla", () => {
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByTestId("tarjeta-perfil")).toHaveClass(
      "lg:col-start-1",
      "lg:row-start-1",
      "lg:row-span-2",
    );
    const boton = screen.getByRole("button", { name: "Cerrar sesión" });
    expect(boton.parentElement).toHaveClass(
      "order-last",
      "lg:order-none",
      "lg:col-start-1",
      "lg:row-start-3",
    );
  });

  it("pedidos y Configuración comparten la columna 3 de la grilla", () => {
    renderMiCuenta(PERFIL_LOCAL);
    expect(screen.getByRole("link", { name: /Mis pedidos/ })).toHaveClass(
      "lg:col-start-3",
      "lg:row-start-1",
    );
    const configuracion = screen.getByText("Configuración").closest("section");
    expect(configuracion).toHaveClass("lg:col-start-3", "lg:row-start-2");
  });
});
