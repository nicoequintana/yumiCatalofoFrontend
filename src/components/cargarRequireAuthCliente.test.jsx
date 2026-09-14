import { Suspense, lazy } from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RequireAuthCliente from "./RequireAuthCliente.jsx";
import { cargarRequireAuthCliente, precargarRequireAuthCliente } from "./cargarRequireAuthCliente.js";

vi.mock("../hooks/usePerfilCliente.js", () => ({
  default: () => ({ perfil: null, resuelto: false, error: null }),
  refrescarPerfil: () => {},
}));

describe("cargarRequireAuthCliente", () => {
  it("precargar entrega el módulo real del guard", async () => {
    const modulo = await precargarRequireAuthCliente();
    expect(modulo.default).toBe(RequireAuthCliente);
  });

  it("sin precarga, cargar devuelve la promesa del import (el lazy normal)", async () => {
    const modulo = await cargarRequireAuthCliente();
    expect(modulo.default).toBe(RequireAuthCliente);
  });

  it("ya precargado, resuelve SINCRÓNICO: React.lazy no suspende y no pinta el fallback", async () => {
    await precargarRequireAuthCliente();

    let recibido = null;
    cargarRequireAuthCliente().then((modulo) => {
      recibido = modulo;
    });
    expect(recibido?.default).toBe(RequireAuthCliente);

    const Guard = lazy(cargarRequireAuthCliente);
    act(() => {
      render(
        <MemoryRouter>
          <Suspense fallback={<p>fallback de suspense</p>}>
            <Guard />
          </Suspense>
        </MemoryRouter>,
      );
    });
    expect(screen.queryByText("fallback de suspense")).not.toBeInTheDocument();
  });
});
