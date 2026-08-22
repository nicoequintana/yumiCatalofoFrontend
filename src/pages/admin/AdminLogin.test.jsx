import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminLogin from "./AdminLogin.jsx";
import * as authApi from "../../api/auth.js";
import * as authClient from "../../api/authClient.js";

vi.mock("../../api/auth.js");
vi.mock("../../api/authClient.js");

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderLogin(ruta = "/catalogo/admin/login") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <AdminLogin />
    </MemoryRouter>,
  );
}

async function completarYEnviar(user) {
  await user.type(screen.getByLabelText("Email"), "admin@yima.test");
  await user.type(screen.getByLabelText("Contraseña"), "secreta");
  await user.click(screen.getByRole("button", { name: /ingresar/i }));
}

describe("AdminLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("anuncia el fallo de login como alerta", async () => {
    const user = userEvent.setup();
    authApi.login.mockRejectedValue(new Error("Credenciales inválidas"));

    renderLogin();
    await completarYEnviar(user);

    // El foco se queda en el botón después del submit, así que sin `role=alert`
    // el único aviso de que las credenciales están mal es visual.
    const alerta = await screen.findByRole("alert");
    expect(alerta).toHaveTextContent("Credenciales inválidas");
  });

  it("marca los campos con los tokens de autocompletado de un login", () => {
    // Sin `username` / `current-password` muchos gestores de contraseñas ni
    // siquiera reconocen el formulario como un login y no ofrecen guardar ni
    // completar la credencial.
    renderLogin();

    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Contraseña")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("guarda el token y navega al listado cuando el login funciona", async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ token: "un-token" });

    renderLogin();
    await completarYEnviar(user);

    expect(authClient.setToken).toHaveBeenCalledWith("un-token");
    expect(navigateMock).toHaveBeenCalledWith("/catalogo/admin/productos");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tras el login vuelve a la ruta admin que trae ?volverA=", async () => {
    // `authClient.js` redirige al login ante un 401 preservando la ruta en
    // `?volverA=`: el re-login tiene que devolver al admin adonde estaba, no
    // siempre al listado de productos.
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ token: "un-token" });

    renderLogin(
      `/catalogo/admin/login?volverA=${encodeURIComponent("/catalogo/admin/ordenes?page=2")}`,
    );
    await completarYEnviar(user);

    expect(navigateMock).toHaveBeenCalledWith("/catalogo/admin/ordenes?page=2");
  });

  it("rechaza un ?volverA= que no sea una ruta interna del admin (open redirect)", async () => {
    // Un `volverA` con URL absoluta (u otra ruta del sitio) convertiría el
    // login en un open redirect: se cae al default en vez de obedecerlo.
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ token: "un-token" });

    for (const malicioso of [
      "https://evil.example.com/phishing",
      "//evil.example.com",
      "/carrito",
      "/catalogo/adminx",
    ]) {
      navigateMock.mockClear();
      const { unmount } = renderLogin(
        `/catalogo/admin/login?volverA=${encodeURIComponent(malicioso)}`,
      );
      await completarYEnviar(user);

      expect(navigateMock).toHaveBeenCalledWith("/catalogo/admin/productos");
      unmount();
    }
  });

  it("sin ?volverA= navega al listado como siempre", async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ token: "un-token" });

    renderLogin("/catalogo/admin/login");
    await completarYEnviar(user);

    expect(navigateMock).toHaveBeenCalledWith("/catalogo/admin/productos");
  });
});
