import { Suspense, lazy } from "react";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import PedidoDetalle from "./PedidoDetalle.jsx";
import { cargarPedidoDetalle, precargarPedidoDetalle } from "./cargarPedidoDetalle.js";
import * as cuentaApi from "../../api/cuenta.js";

vi.mock("../../api/cuenta.js");

describe("cargarPedidoDetalle", () => {
  it("precargar entrega el módulo real de la página", async () => {
    const modulo = await precargarPedidoDetalle();
    expect(modulo.default).toBe(PedidoDetalle);
  });

  it("sin precarga, cargar devuelve la promesa del import (el lazy normal)", async () => {
    const modulo = await cargarPedidoDetalle();
    expect(modulo.default).toBe(PedidoDetalle);
  });

  it("ya precargado, resuelve SINCRÓNICO: React.lazy no suspende y no pinta el fallback", async () => {
    cuentaApi.getPedidoPorId.mockReturnValue(new Promise(() => {}));
    await precargarPedidoDetalle();

    let recibido = null;
    cargarPedidoDetalle().then((modulo) => {
      recibido = modulo;
    });
    expect(recibido?.default).toBe(PedidoDetalle);

    const Pagina = lazy(cargarPedidoDetalle);
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
