import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Datos from "./Datos.jsx";
import Seguridad from "./Seguridad.jsx";
import RequireAuthCliente from "../../components/RequireAuthCliente.jsx";
import { _reiniciarParaTests } from "../../hooks/usePerfilCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

/**
 * El bug que estos tests existen para cazar: `Datos.test.jsx` y
 * `Seguridad.test.jsx` MOCKEAN `usePerfilCliente` y montan la pantalla SUELTA,
 * sin el guard. Así, `refrescarPerfil()` no hacía nada visible y los dos
 * afirmaban una confirmación que en la app real nunca se pintaba: el
 * `resuelto:false` de `refrescarPerfil` hace que la PRIMERA rama de
 * `RequireAuthCliente` devuelva el Spinner en ese mismo render, la pantalla se
 * desmonta y su `setAviso`/`setActualizada` —batcheados en el mismo tick— se
 * van con ella.
 *
 * Acá el hook es el REAL y el guard también: lo único mockeado es `api/cuenta`,
 * que es la frontera con el backend.
 */

vi.mock("../../api/cuenta.js");

const PERFIL = {
  id: 1,
  email: "cliente@gmail.com",
  nombre: "Cliente Prueba",
  telefono: "1122334455",
  dni: "12345678",
  apodo: null,
  tieneGoogle: false,
  tienePassword: true,
};

/**
 * ⚠️ El fetch resuelve en un TICK POSTERIOR, y eso no es adorno: es la
 * diferencia entre que este archivo pruebe algo o no pruebe nada.
 *
 * Un `mockResolvedValue` resuelve en un microtask, y React 18 agenda el
 * repintado de una actualización de fuera de un evento suyo con el scheduler
 * (un MACROtask). O sea: con un mock síncrono, el `resuelto:false` y el
 * `resuelto:true` caen en el mismo repintado, el spinner nunca se dibuja, la
 * pantalla nunca se desmonta y el test pasa aunque el bug esté ahí. Medido:
 * con `mockResolvedValue` el aviso se veía; con este `setTimeout` no se veía
 * ni él, ni el formulario, y el input volvía al valor viejo.
 */
function respuestaPerfilDiferida(perfil) {
  return new Promise((resolver) =>
    setTimeout(
      () => resolver({ status: 200, ok: true, text: () => Promise.resolve(JSON.stringify(perfil)) }),
      10,
    ),
  );
}

let fetchMock;

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(() => respuestaPerfilDiferida(PERFIL));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  _reiniciarParaTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function renderBajoGuard(ruta, elemento) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route element={<RequireAuthCliente />}>
          <Route path={ruta} element={elemento} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Datos, montada bajo el guard real", () => {
  it("tras guardar, la confirmación SE VE (la pantalla no se desmonta)", async () => {
    const user = userEvent.setup();
    cuentaApi.actualizarPerfil.mockResolvedValue({ ...PERFIL, nombre: "Otro Nombre" });

    renderBajoGuard("/cuenta/datos", <Datos />);
    const nombre = await screen.findByLabelText("Nombre");

    await user.clear(nombre);
    await user.type(nombre, "Otro Nombre");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(await screen.findByText("Datos actualizados.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre")).toHaveValue("Otro Nombre");
  });
});

describe("Seguridad, montada bajo el guard real", () => {
  it("tras cambiar la contraseña, la confirmación SE VE", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarPassword.mockResolvedValue({ ok: true });

    renderBajoGuard("/cuenta/seguridad", <Seguridad />);
    const actual = await screen.findByLabelText("Contraseña actual");

    await user.type(actual, "vieja123");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva456");
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    expect(await screen.findByText("Contraseña actualizada.")).toBeInTheDocument();
  });

  it("no vuelve a pedir el perfil: `PUT /cuenta/password` no cambia ningún campo suyo", async () => {
    const user = userEvent.setup();
    cuentaApi.cambiarPassword.mockResolvedValue({ ok: true });

    renderBajoGuard("/cuenta/seguridad", <Seguridad />);
    await user.type(await screen.findByLabelText("Contraseña actual"), "vieja123");
    await user.type(screen.getByLabelText("Contraseña nueva"), "nueva456");
    // Los GET del MONTAJE no se cuentan: el hook deduplica por tanda de
    // montajes, así que el guard y la pantalla piden uno cada uno. Lo que se
    // afirma es que guardar no agrega ninguno.
    const getsAlMontar = fetchMock.mock.calls.length;
    await user.click(screen.getByRole("button", { name: "Guardar contraseña" }));

    await waitFor(() => expect(cuentaApi.cambiarPassword).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(getsAlMontar);
  });
});
