import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminUsuarios from "./AdminUsuarios.jsx";
import * as usuariosApi from "../../api/usuarios.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/usuarios.js");

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminUsuarios />
    </MemoryRouter>,
  );
}

describe("AdminUsuarios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista los usuarios cargados", async () => {
    usuariosApi.getUsuarios.mockResolvedValue([
      { id: 1, email: "admin@yima.test", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    renderPagina();

    expect(await screen.findByText("admin@yima.test")).toBeInTheDocument();
  });

  it("muestra un error en vez de quedarse cargando para siempre", async () => {
    usuariosApi.getUsuarios.mockRejectedValue(new Error("Failed to fetch"));

    renderPagina();

    expect(await screen.findByText(/No se pudieron cargar los usuarios/i)).toBeInTheDocument();
    expect(screen.queryByText("Cargando usuarios…")).not.toBeInTheDocument();
  });

  it("la tabla está apilable: cada celda declara su columna o su tipo", async () => {
    usuariosApi.getUsuarios.mockResolvedValue([
      { id: 1, email: "admin@yima.test", createdAt: "2026-01-01T00:00:00.000Z" },
    ]);

    renderPagina();

    await screen.findByText("admin@yima.test");
    esperarTablaApilada(screen.getByRole("table"));
  });
});

describe("AdminUsuarios — permiso de eliminar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra quién puede eliminar y quién no", async () => {
    usuariosApi.getUsuarios.mockResolvedValue([
      { id: 1, email: "con@permiso.test", createdAt: "2026-01-01T00:00:00.000Z", puedeEliminar: true },
      { id: 2, email: "sin@permiso.test", createdAt: "2026-01-02T00:00:00.000Z", puedeEliminar: false },
    ]);

    renderPagina();

    expect(await screen.findByText("con@permiso.test")).toBeInTheDocument();
    const filas = screen.getAllByRole("row");
    const conPermiso = filas.find((f) => f.textContent.includes("con@permiso.test"));
    const sinPermiso = filas.find((f) => f.textContent.includes("sin@permiso.test"));

    expect(conPermiso.textContent).toMatch(/Sí|Si/);
    expect(sinPermiso.textContent).toMatch(/No/);
  });

  it("crea un usuario sin permiso de eliminar cuando se destilda la casilla", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    usuariosApi.getUsuarios.mockResolvedValue([]);
    usuariosApi.createUsuario.mockResolvedValue({ id: 3, email: "n@u.evo", createdAt: "2026-01-03T00:00:00.000Z" });

    renderPagina();
    await screen.findByRole("button", { name: /agregar/i });

    await user.type(screen.getByPlaceholderText(/email/i), "n@u.evo");
    await user.type(screen.getByPlaceholderText(/contraseña/i), "unaclavelarga");
    await user.click(screen.getByLabelText(/puede eliminar/i));
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    expect(usuariosApi.createUsuario).toHaveBeenCalledWith(
      "n@u.evo",
      "unaclavelarga",
      expect.objectContaining({ puedeEliminar: false }),
    );
  });

  // El 403 del backend llega como mensaje de error de la API al INTENTAR
  // BORRAR (que es la única acción que el permiso bloquea). La pantalla tiene
  // que mostrarlo tal cual: dice exactamente qué falta y a quién pedírselo.
  // El genérico "revisá tu conexión" mandaría a buscar donde no es.
  it("muestra el mensaje del servidor cuando el borrado se rechaza por permiso", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    usuariosApi.getUsuarios.mockResolvedValue([
      { id: 1, email: "uno@yima.test", createdAt: "2026-01-01T00:00:00.000Z", puedeEliminar: true },
      { id: 2, email: "dos@yima.test", createdAt: "2026-01-02T00:00:00.000Z", puedeEliminar: false },
    ]);
    usuariosApi.deleteUsuario.mockRejectedValue(
      new Error("Tu usuario no tiene permiso para eliminar. Pedile a otro administrador que lo habilite."),
    );

    renderPagina();
    await screen.findByText("dos@yima.test");

    await user.click(screen.getAllByRole("button", { name: /eliminar/i })[0]);
    // El botón de confirmación se llama "Sí". Se busca por rol para no
    // confundirlo con el chip "Sí" de la columna de permiso, que es un <span>.
    await user.click(screen.getByRole("button", { name: /^sí$/i }));

    expect(await screen.findByText(/no tiene permiso para eliminar/i)).toBeInTheDocument();
  });
});
