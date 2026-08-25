import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminUsuarios from "./AdminUsuarios.jsx";
import * as usuariosApi from "../../api/usuarios.js";

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
});
