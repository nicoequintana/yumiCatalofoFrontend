import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Datos from "./Datos.jsx";
import usePerfilCliente, * as perfilCliente from "../../hooks/usePerfilCliente.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");
vi.mock("../../hooks/usePerfilCliente.js", () => ({
  default: vi.fn(),
  invalidarPerfil: vi.fn(),
  refrescarPerfil: vi.fn(),
  sincronizarPerfil: vi.fn(),
}));

function renderDatos(perfil) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil, resuelto: true, error: null });
  return render(
    <MemoryRouter>
      <Datos />
    </MemoryRouter>,
  );
}

/**
 * Monta `Datos` con historial real (SIN mockear `react-router-dom`): el botón
 * "Volver" usa `navigate(-1)` por dentro de `useVolver`, y eso solo se puede
 * afirmar viendo a qué pantalla real se llega, no con un mock de `navigate`.
 * Mismo patrón que `components/BotonVolver.test.jsx`.
 */
function renderDatosConHistorial(entradas) {
  vi.mocked(usePerfilCliente).mockReturnValue({ perfil: PERFIL, resuelto: true, error: null });
  return render(
    <MemoryRouter initialEntries={entradas} initialIndex={entradas.length - 1}>
      <Routes>
        <Route path="/checkout" element={<div>Checkout de nuevo</div>} />
        <Route path="/cuenta" element={<div>Mi cuenta de nuevo</div>} />
        <Route path="/cuenta/datos" element={<Datos />} />
      </Routes>
    </MemoryRouter>,
  );
}

const PERFIL = {
  id: 1,
  email: "cliente@gmail.com",
  nombre: "Cliente Prueba",
  telefono: "1122334455",
  dni: "12345678",
  apodo: "Tito",
  tieneGoogle: false,
  tienePassword: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  cuentaApi.actualizarPerfil.mockResolvedValue(PERFIL);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Datos — edición del perfil", () => {
  it("precarga los valores del perfil", () => {
    renderDatos(PERFIL);
    expect(screen.getByLabelText("Nombre")).toHaveValue("Cliente Prueba");
    expect(screen.getByLabelText("Teléfono")).toHaveValue("1122334455");
    expect(screen.getByLabelText("DNI")).toHaveValue("12345678");
    expect(screen.getByLabelText("Apodo")).toHaveValue("Tito");
  });

  it("manda el DNI cuando cambia", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.clear(screen.getByLabelText("DNI"));
    await user.type(screen.getByLabelText("DNI"), "87654321");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(cuentaApi.actualizarPerfil).toHaveBeenCalledTimes(1));
    expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({ dni: "87654321" });
  });

  it("manda SOLO los campos que cambiaron", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.clear(screen.getByLabelText("Teléfono"));
    await user.type(screen.getByLabelText("Teléfono"), "1199887766");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(cuentaApi.actualizarPerfil).toHaveBeenCalledTimes(1));
    // Ni `nombre` ni `apodo` viajan: no se tocaron. Mandarlos vacíos por
    // arrastre daría un 400 que parece del apodo y no lo es.
    expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({ telefono: "1199887766" });
  });

  it("vaciar el apodo manda la cadena vacía, que es como se BORRA", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.clear(screen.getByLabelText("Apodo"));
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(cuentaApi.actualizarPerfil).toHaveBeenCalledTimes(1));
    expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({ apodo: "" });
  });

  it("sin cambios no llama a la API", async () => {
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(cuentaApi.actualizarPerfil).not.toHaveBeenCalled();
    expect(screen.getByText("No hay cambios para guardar.")).toBeInTheDocument();
  });

  it("un 400 del backend se muestra sin romper la pantalla", async () => {
    const user = userEvent.setup();
    cuentaApi.actualizarPerfil.mockRejectedValue(
      Object.assign(new Error("El apodo no puede superar los 1000 caracteres."), { status: 400 }),
    );

    renderDatos(PERFIL);
    await user.clear(screen.getByLabelText("Apodo"));
    await user.type(screen.getByLabelText("Apodo"), "x");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    expect(
      await screen.findByText("El apodo no puede superar los 1000 caracteres."),
    ).toBeInTheDocument();
  });

  it("al guardar bien sincroniza el cache CON LA RESPUESTA del PUT y confirma", async () => {
    const user = userEvent.setup();
    const devuelto = { ...PERFIL, nombre: "Otro Nombre" };
    cuentaApi.actualizarPerfil.mockResolvedValue(devuelto);
    renderDatos(PERFIL);

    await user.clear(screen.getByLabelText("Nombre"));
    await user.type(screen.getByLabelText("Nombre"), "Otro Nombre");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(screen.getByText("Datos actualizados.")).toBeInTheDocument());
    // El perfil actualizado ya vino en la respuesta: no se lo vuelve a pedir.
    expect(perfilCliente.sincronizarPerfil).toHaveBeenCalledWith(devuelto);
    expect(perfilCliente.refrescarPerfil).not.toHaveBeenCalled();
  });

  it("los avisos se ANUNCIAN: el de éxito con role=status, el error con role=alert", async () => {
    // El error ya llevaba `role="alert"`; el de éxito era un `<p>` pelado, así
    // que un lector de pantalla no decía nada y la persona se quedaba sin
    // saber si el guardado salió.
    const user = userEvent.setup();
    renderDatos(PERFIL);

    await user.click(screen.getByRole("button", { name: "Guardar datos" }));
    expect(screen.getByRole("status")).toHaveTextContent("No hay cambios para guardar.");
  });

  it("con apodo null y sin tocar nada, NO manda apodo", () => {
    renderDatos({ ...PERFIL, apodo: null });
    expect(screen.getByLabelText("Apodo")).toHaveValue("");
  });

  it("con apodo null, cambiar OTRO campo no arrastra el apodo vacío", async () => {
    const user = userEvent.setup();
    renderDatos({ ...PERFIL, apodo: null });

    await user.clear(screen.getByLabelText("Teléfono"));
    await user.type(screen.getByLabelText("Teléfono"), "1199887766");
    await user.click(screen.getByRole("button", { name: "Guardar datos" }));

    await waitFor(() => expect(cuentaApi.actualizarPerfil).toHaveBeenCalledTimes(1));
    // Sin el `?? ""` en la comparación, `"" !== null` daría true y acá viajaría
    // `apodo: ""`, que el backend interpreta como BORRAR. Silencioso y caro.
    expect(cuentaApi.actualizarPerfil).toHaveBeenCalledWith({ telefono: "1199887766" });
  });
});

describe("Datos — volver", () => {
  it("llegando desde el checkout, vuelve ahí por el historial", async () => {
    const user = userEvent.setup();
    renderDatosConHistorial(["/checkout", "/cuenta/datos"]);

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByText("Checkout de nuevo")).toBeInTheDocument();
  });

  it("llegando desde Mi cuenta, vuelve ahí por el historial", async () => {
    const user = userEvent.setup();
    renderDatosConHistorial(["/cuenta", "/cuenta/datos"]);

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByText("Mi cuenta de nuevo")).toBeInTheDocument();
  });

  it("sin historial interno (entrada directa a la URL), cae al fallback /cuenta", async () => {
    const user = userEvent.setup();
    renderDatosConHistorial(["/cuenta/datos"]);

    await user.click(screen.getByRole("button", { name: "Volver" }));
    expect(screen.getByText("Mi cuenta de nuevo")).toBeInTheDocument();
  });
});
