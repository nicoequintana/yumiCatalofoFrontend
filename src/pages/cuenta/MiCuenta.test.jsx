import { render, screen, waitFor } from "@testing-library/react";
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
});

describe("MiCuenta — navegación", () => {
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
