import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import BotonVolver from "./BotonVolver.jsx";

/**
 * Guard de las DOS semánticas del botón, que no son la misma.
 *
 * Por defecto vuelve por el HISTORIAL (`navigate(-1)`), que es lo correcto en
 * el catálogo público: quien llega a una ficha desde una búsqueda quiere
 * volver a la búsqueda, no a la home.
 *
 * En un EDITOR eso está mal. Un editor es un destino al que se entra a hacer
 * una tarea y del que se sale a un lugar conocido: si entraste desde Productos
 * y el encabezado dice que estás en Campañas, "Volver" tiene que llevarte al
 * calendario, no a Productos. Para eso está `destinoFijo`.
 */
function montar(props, entradas) {
  render(
    <MemoryRouter initialEntries={entradas} initialIndex={entradas.length - 1}>
      <Routes>
        <Route path="/vine-de-aca" element={<div>Pantalla anterior</div>} />
        <Route path="/el-destino" element={<div>El destino fijo</div>} />
        <Route path="/estoy-aca" element={<BotonVolver fallback="/el-destino" {...props} />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("BotonVolver", () => {
  it("por defecto vuelve por el historial, no al fallback", async () => {
    montar({}, ["/vine-de-aca", "/estoy-aca"]);

    await userEvent.click(screen.getByRole("button", { name: /volver/i }));

    expect(screen.getByText("Pantalla anterior")).toBeInTheDocument();
  });

  it("con `destinoFijo` va SIEMPRE al fallback, aunque haya historial", async () => {
    montar({ destinoFijo: true }, ["/vine-de-aca", "/estoy-aca"]);

    await userEvent.click(screen.getByRole("button", { name: /volver/i }));

    expect(screen.getByText("El destino fijo")).toBeInTheDocument();
  });

  it("`etiqueta` nombra el destino, para que el botón no prometa otra cosa", () => {
    montar({ destinoFijo: true, etiqueta: "Volver al calendario" }, ["/estoy-aca"]);

    expect(screen.getByRole("button", { name: "Volver al calendario" })).toBeInTheDocument();
  });

  it("`puedeSalir` que devuelve false cancela la navegación", async () => {
    montar({ destinoFijo: true, puedeSalir: () => false }, ["/vine-de-aca", "/estoy-aca"]);

    await userEvent.click(screen.getByRole("button", { name: /volver/i }));

    expect(screen.queryByText("El destino fijo")).toBeNull();
    expect(screen.queryByText("Pantalla anterior")).toBeNull();
  });
});
