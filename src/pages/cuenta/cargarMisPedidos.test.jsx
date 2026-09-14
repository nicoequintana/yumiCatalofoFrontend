import { Suspense, lazy } from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MisPedidos from "./MisPedidos.jsx";
import { cargarMisPedidos, precargarMisPedidos } from "./cargarMisPedidos.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

describe("cargarMisPedidos", () => {
  it("precargar entrega el módulo real de la página", async () => {
    const modulo = await precargarMisPedidos();
    expect(modulo.default).toBe(MisPedidos);
  });

  it("sin precarga, cargar devuelve la promesa del import (el lazy normal)", async () => {
    const modulo = await cargarMisPedidos();
    expect(modulo.default).toBe(MisPedidos);
  });

  it("ya precargado, resuelve SINCRÓNICO: React.lazy no suspende y no pinta el fallback", async () => {
    cuentaApi.getPedidos.mockReturnValue(new Promise(() => {}));
    await precargarMisPedidos();

    let recibido = null;
    cargarMisPedidos().then((modulo) => {
      recibido = modulo;
    });
    expect(recibido?.default).toBe(MisPedidos);

    const Pagina = lazy(cargarMisPedidos);
    act(() => {
      render(
        <MemoryRouter>
          <Suspense fallback={<p>fallback de suspense</p>}>
            <Pagina />
          </Suspense>
        </MemoryRouter>,
      );
    });
    expect(screen.queryByText("fallback de suspense")).not.toBeInTheDocument();
  });
});
