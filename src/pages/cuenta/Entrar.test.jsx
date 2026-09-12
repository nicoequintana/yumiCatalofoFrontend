import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Entrar from "./Entrar.jsx";
import useCarrito from "../../hooks/useCarrito.js";
import * as cuentaApi from "../../api/cuenta.js";
import * as perfilCliente from "../../hooks/usePerfilCliente.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({ invalidarPerfil: vi.fn() }));
vi.mock("../../components/BotonGmail.jsx", () => ({
  default: ({ onCredential }) => (
    <button type="button" onClick={() => onCredential("cred-de-prueba")}>
      [BotonGmail]
    </button>
  ),
}));

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function renderEntrar(ruta = "/cuenta/entrar") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Entrar />
    </MemoryRouter>,
  );
}

/**
 * Completa el formulario y lo envía. Limpia ANTES de escribir porque
 * `user.type` acumula: un segundo intento sin limpiar deja el email con dos
 * arrobas, la validación nativa del `input type="email"` bloquea el submit y
 * el handler no llega a correr nunca — el test de los tres fallos seguidos
 * pasaba a verde sin haber enviado más que la primera vez.
 */
async function completarYEnviar(user) {
  await user.clear(screen.getByLabelText("Email"));
  await user.type(screen.getByLabelText("Email"), "cliente@gmail.com");
  await user.clear(screen.getByLabelText("Contraseña"));
  await user.type(screen.getByLabelText("Contraseña"), "secreta12");
  await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  const { result } = renderHook(() => useCarrito());
  act(() => {
    result.current.vaciar();
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Entrar — campos y wording", () => {
  it("tiene los labels Email y Contraseña, el botón Iniciar sesión y el bloque de Google", () => {
    renderEntrar();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Contraseña")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
    expect(screen.getByText("Iniciá con Google")).toBeInTheDocument();
  });
});

describe("Entrar — login exitoso", () => {
  it("invalida el perfil y navega a /cuenta por defecto", async () => {
    const user = userEvent.setup();
    cuentaApi.loginCuenta.mockResolvedValue({ ok: true });

    renderEntrar();
    await completarYEnviar(user);

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/cuenta"));
    expect(perfilCliente.invalidarPerfil).toHaveBeenCalledTimes(1);
  });

  it("respeta ?volverA= cuando es una ruta interna", async () => {
    const user = userEvent.setup();
    cuentaApi.loginCuenta.mockResolvedValue({ ok: true });

    renderEntrar(`/cuenta/entrar?volverA=${encodeURIComponent("/cuenta/pedidos?page=2")}`);
    await completarYEnviar(user);

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/cuenta/pedidos?page=2"),
    );
  });

  it("rechaza un ?volverA= externo (open redirect) y cae al default", async () => {
    const user = userEvent.setup();
    cuentaApi.loginCuenta.mockResolvedValue({ ok: true });

    for (const malicioso of ["https://evil.example.com", "//evil.example.com"]) {
      navigateMock.mockClear();
      const { unmount } = renderEntrar(
        `/cuenta/entrar?volverA=${encodeURIComponent(malicioso)}`,
      );
      await completarYEnviar(user);
      await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/cuenta"));
      unmount();
    }
  });
});

describe("Entrar — requiere código", () => {
  it("navega a /cuenta/entrar/codigo con el email y el volverA en el state", async () => {
    const user = userEvent.setup();
    cuentaApi.loginCuenta.mockResolvedValue({ requiereCodigo: true });

    renderEntrar();
    await completarYEnviar(user);

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith("/cuenta/entrar/codigo", {
        state: { email: "cliente@gmail.com", volverA: "/cuenta" },
      }),
    );
  });
});

describe("Entrar — tres fallos seguidos", () => {
  it("al tercer 401 muestra la Puerta de WhatsApp y el aviso de recuperar contraseña", async () => {
    const user = userEvent.setup();
    const error401 = Object.assign(new Error("Email o contraseña incorrectos."), { status: 401 });
    cuentaApi.loginCuenta.mockRejectedValue(error401);

    renderEntrar();

    await completarYEnviar(user);
    expect(screen.queryByText(/podés recuperarla/i)).not.toBeInTheDocument();

    await completarYEnviar(user);
    expect(screen.queryByText(/podés recuperarla/i)).not.toBeInTheDocument();

    await completarYEnviar(user);
    expect(
      await screen.findByText("Si olvidaste tu contraseña, podés recuperarla."),
    ).toBeInTheDocument();
  });
});

describe("Entrar — Google", () => {
  it("SOLO_GMAIL muestra el mensaje que manda al formulario", async () => {
    const user = userEvent.setup();
    cuentaApi.loginGoogle.mockRejectedValue(
      Object.assign(new Error("Solo Gmail"), { codigo: "SOLO_GMAIL" }),
    );

    renderEntrar();
    await user.click(screen.getByText("[BotonGmail]"));

    expect(
      await screen.findByText(
        "Con una cuenta de Google del trabajo no podemos continuar. Registrate con el formulario.",
      ),
    ).toBeInTheDocument();
  });

  it("con completar:true navega a /cuenta/completar preservando volverA", async () => {
    const user = userEvent.setup();
    cuentaApi.loginGoogle.mockResolvedValue({ ok: true, completar: true });

    renderEntrar(`/cuenta/entrar?volverA=${encodeURIComponent("/cuenta/pedidos")}`);
    await user.click(screen.getByText("[BotonGmail]"));

    await waitFor(() =>
      expect(navigateMock).toHaveBeenCalledWith(
        `/cuenta/completar?volverA=${encodeURIComponent("/cuenta/pedidos")}`,
      ),
    );
  });
});

describe("Entrar — carrito y storage bloqueado", () => {
  it("avisa si el storage está bloqueado Y el carrito tiene líneas", async () => {
    const { result } = renderHook(() => useCarrito());
    act(() => {
      result.current.agregar(1, 1);
    });

    renderEntrar();

    // El `localStorage` global de este entorno es un objeto SIN métodos, así
    // que `storageDisponible()` da `false` sola (ver "Gotcha localStorage" en
    // las reglas de testing). Con el carrito cargado se cumplen las dos
    // condiciones y la pantalla tiene que avisar: si se manda a login sin el
    // aviso, la persona vuelve a un carrito vacío y sin explicación.
    expect(
      await screen.findByText(/Tu navegador está bloqueando el guardado/),
    ).toBeInTheDocument();
  });
});

describe("Entrar — orden de las dos vías de entrada", () => {
  it("el formulario de email va ARRIBA del bloque de Google", () => {
    renderEntrar();

    // `compareDocumentPosition` compara posición REAL en el DOM, no el orden
    // en que los encontró la query: un assert por índice de `getAllBy...` se
    // rompe en cuanto alguien agrega un nodo en el medio.
    const campoEmail = screen.getByLabelText("Email");
    const google = screen.getByText("Iniciá con Google");
    const posicion = campoEmail.compareDocumentPosition(google);

    expect(posicion & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("Entrar — Google no disponible", () => {
  it("sin botón de Google no queda el rótulo huérfano", async () => {
    // `BotonGmail` devuelve null y avisa por `onNoDisponible` cuando falta
    // VITE_GOOGLE_CLIENT_ID o el script de Google no carga a tiempo. Sin
    // escuchar ese aviso, el rótulo quedaba señalando un botón inexistente.
    vi.resetModules();
    vi.doMock("../../components/BotonGmail.jsx", () => ({
      default: ({ onNoDisponible }) => {
        onNoDisponible?.();
        return null;
      },
    }));
    const { default: EntrarSinGoogle } = await import("./Entrar.jsx");

    render(
      <MemoryRouter initialEntries={["/cuenta/entrar"]}>
        <EntrarSinGoogle />
      </MemoryRouter>,
    );

    expect(screen.queryByText("Iniciá con Google")).not.toBeInTheDocument();
    // El formulario sigue entero: sin Google, entrar por email es la única
    // vía que queda y no puede irse con él.
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });
});
