import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigationType } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RequireAuthCliente from "./RequireAuthCliente.jsx";
import usePerfilCliente, { invalidarPerfil, refrescarPerfil } from "../hooks/usePerfilCliente.js";
import { getConfigContacto } from "../api/config.js";
import { reiniciarConfigContacto } from "../hooks/useConfigContacto.js";

// Mismo patrón que `RequireAuth.test.jsx`: el módulo entero se mockea. Acá es
// además la única forma de fabricar los cuatro estados del hook sin tocar la
// red — el hook real hace `fetch` al montarse.
vi.mock("../hooks/usePerfilCliente.js");
// `PuertaWhatsApp` (la salida humana de la pantalla de error) consume
// `useConfigContacto`, que pide `GET /api/config/contacto` al montarse.
vi.mock("../api/config.js");

const PERFIL_COMPLETO = {
  id: 1,
  email: "ana@yima.com",
  nombre: "Ana",
  telefono: "1122334455",
  dni: "30111222",
};

/**
 * Testigo de la redirección: además del texto de la pantalla, imprime el query
 * string (para afirmar `volverA`) y el TIPO de navegación. "REPLACE" es lo que
 * distingue un guard que reemplaza la entrada del historial de uno que la
 * apila: con PUSH, el botón "atrás" del navegador devuelve a la ruta protegida
 * y el guard vuelve a patear — el usuario queda preso en un ping-pong.
 */
function PantallaTestigo({ nombre }) {
  const { search } = useLocation();
  const tipo = useNavigationType();
  return (
    <p>
      pantalla: {nombre}
      {search} [{tipo}]
    </p>
  );
}

function renderConGuard(ruta, estado) {
  vi.mocked(usePerfilCliente).mockReturnValue(estado);

  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route element={<RequireAuthCliente />}>
          <Route path="/cuenta" element={<PantallaTestigo nombre="mi cuenta" />} />
          <Route path="/cuenta/completar" element={<PantallaTestigo nombre="completar" />} />
          <Route path="/cuenta/pedidos" element={<PantallaTestigo nombre="pedidos" />} />
        </Route>
        <Route path="/cuenta/entrar" element={<PantallaTestigo nombre="entrar" />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarConfigContacto();
  vi.mocked(getConfigContacto).mockResolvedValue({
    whatsapp: { numero: "5491122334455", dentroDeHorario: true, textoHorario: null },
    email: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    direccion: null,
  });
});

describe("RequireAuthCliente", () => {
  it("todavía sin resolver: spinner y NADA de navegación", () => {
    renderConGuard("/cuenta", { perfil: null, resuelto: false, error: null });

    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.queryByText(/pantalla:/)).not.toBeInTheDocument();
  });

  it("resuelto sin sesión: redirige a /cuenta/entrar con volverA y en REPLACE", () => {
    renderConGuard("/cuenta/pedidos", { perfil: null, resuelto: true, error: null });

    expect(
      screen.getByText("pantalla: entrar?volverA=%2Fcuenta%2Fpedidos [REPLACE]"),
    ).toBeInTheDocument();
  });

  it("el volverA conserva el query string de la ruta que se quiso abrir", () => {
    renderConGuard("/cuenta/pedidos?pagina=2", { perfil: null, resuelto: true, error: null });

    expect(
      screen.getByText("pantalla: entrar?volverA=%2Fcuenta%2Fpedidos%3Fpagina%3D2 [REPLACE]"),
    ).toBeInTheDocument();
  });

  it("con sesión y perfil completo: renderiza la ruta hija", () => {
    renderConGuard("/cuenta", { perfil: PERFIL_COMPLETO, resuelto: true, error: null });

    expect(screen.getByText(/pantalla: mi cuenta/)).toBeInTheDocument();
  });

  it.each([["nombre"], ["telefono"], ["dni"]])(
    "con sesión pero sin %s: redirige a /cuenta/completar con volverA y en REPLACE",
    (campo) => {
      renderConGuard("/cuenta/pedidos", {
        perfil: { ...PERFIL_COMPLETO, [campo]: null },
        resuelto: true,
        error: null,
      });

      expect(
        screen.getByText("pantalla: completar?volverA=%2Fcuenta%2Fpedidos [REPLACE]"),
      ).toBeInTheDocument();
    },
  );

  it("ya parado en /cuenta/completar con el perfil incompleto: renderiza, no redirige en loop", () => {
    renderConGuard("/cuenta/completar", {
      perfil: { ...PERFIL_COMPLETO, nombre: null, telefono: null, dni: null },
      resuelto: true,
      error: null,
    });

    expect(screen.getByText(/pantalla: completar/)).toBeInTheDocument();
    expect(screen.queryByText(/volverA/)).not.toBeInTheDocument();
  });

  // LA TRAMPA de esta pantalla: "anónimo" y "falló la verificación" llegan los
  // dos con `perfil: null` y `resuelto: true`. Lo único que los separa es
  // `error`, así que el guard TIENE que mirarlo primero. Al revés, alguien con
  // sesión válida cuyo `GET /api/cuenta` se cayó termina en el login, donde
  // volver a entrar no le arregla nada.
  it("con error NO manda al login: muestra el estado de error", async () => {
    renderConGuard("/cuenta", { perfil: null, resuelto: true, error: "No pudimos verificar tu sesión." });

    expect(await screen.findByText("No pudimos verificar tu sesión")).toBeInTheDocument();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.queryByText(/pantalla: entrar/)).not.toBeInTheDocument();
    expect(screen.queryByText(/pantalla:/)).not.toBeInTheDocument();
  });

  it("con error: el botón Reintentar llama a refrescarPerfil", async () => {
    const user = userEvent.setup();
    renderConGuard("/cuenta", { perfil: null, resuelto: true, error: "cayó la red" });

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(refrescarPerfil).toHaveBeenCalledTimes(1));
  });

  // "El principio de la puerta" (spec): toda pantalla de bloqueo ofrece el
  // canal de WhatsApp. Es contrato y va en los tests.
  it("con error: ofrece la puerta de WhatsApp", async () => {
    renderConGuard("/cuenta", { perfil: null, resuelto: true, error: "cayó la red" });

    const link = await screen.findByRole("link", { name: /WhatsApp/ });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5491122334455/);
  });

  // `refrescarPerfil` recarga estando montado; `invalidarPerfil` solo notifica
  // el estado vacío y espera un MONTAJE futuro. Acá el guard no se desmonta:
  // con `invalidarPerfil` la pantalla quedaría con el spinner para siempre.
  it("con error: Reintentar NO usa invalidarPerfil (dejaría el spinner girando)", async () => {
    const user = userEvent.setup();
    renderConGuard("/cuenta", { perfil: null, resuelto: true, error: "cayó la red" });

    await user.click(await screen.findByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(refrescarPerfil).toHaveBeenCalled());
    expect(invalidarPerfil).not.toHaveBeenCalled();
  });

  // Mientras un refresco está en vuelo el hook CONSERVA el `perfil` y el
  // `error` viejos y solo baja `resuelto`. Por eso `!resuelto` va primero: si
  // no, la pantalla pintaría datos rancios durante cada reintento.
  it("refresco en vuelo: spinner, ni el perfil ni el error viejos", () => {
    renderConGuard("/cuenta", {
      perfil: PERFIL_COMPLETO,
      resuelto: false,
      error: "cayó la red",
    });

    expect(screen.getByRole("status", { name: "Cargando" })).toBeInTheDocument();
    expect(screen.queryByText(/pantalla:/)).not.toBeInTheDocument();
    expect(screen.queryByText("No pudimos verificar tu sesión")).not.toBeInTheDocument();
  });

  // El hook echa `cuerpo?.error` cuando el backend manda uno: esa cadena está
  // escrita para un log, no para quien quiere comprar. `error` vale como
  // booleano y el texto es nuestro.
  it("con error: muestra copy fijo, nunca la cadena que mandó el backend", async () => {
    renderConGuard("/cuenta", {
      perfil: null,
      resuelto: true,
      error: "ECONNRESET al consultar el upstream",
    });

    expect(await screen.findByText("No pudimos verificar tu sesión")).toBeInTheDocument();
    expect(screen.queryByText(/ECONNRESET/)).not.toBeInTheDocument();
  });

  it("con error: el botón Reintentar respeta el mínimo táctil", async () => {
    renderConGuard("/cuenta", { perfil: null, resuelto: true, error: "cayó la red" });

    const boton = await screen.findByRole("button", { name: "Reintentar" });
    expect(boton.className).toContain("min-h-11");
    expect(boton.className).not.toMatch(/#[0-9a-fA-F]{3,8}|dark:/);
  });
});
