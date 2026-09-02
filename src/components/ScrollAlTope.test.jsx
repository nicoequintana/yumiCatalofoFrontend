import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import ScrollAlTope from "./ScrollAlTope.jsx";

/**
 * Sin este componente la app no tenía NINGÚN control del scroll: que la página
 * abriera arriba era un accidente (React desmonta, el documento se achica y el
 * navegador clampea a 0). En un celular real el navegador restaura la posición
 * de scroll por su cuenta, y ahí el accidente deja de funcionar: la página
 * abre corrida hacia abajo, sin el encabezado ni la cinta de anuncios a la
 * vista. Reportado el 02/09/2026.
 */

let scrollTo;
let restauracionOriginal;

beforeEach(() => {
  scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  restauracionOriginal = window.history.scrollRestoration;
});

afterEach(() => {
  scrollTo.mockRestore();
  try {
    window.history.scrollRestoration = restauracionOriginal;
  } catch {
    // jsdom puede no permitir la escritura; no es parte del contrato.
  }
});

function Paginas() {
  const navigate = useNavigate();
  return (
    <>
      <ScrollAlTope />
      <button type="button" onClick={() => navigate("/coleccion?paginas=2")}>
        misma ruta, otra query
      </button>
      <button type="button" onClick={() => navigate("/producto/1-algo")}>
        ir a la ficha
      </button>
      <Routes>
        <Route path="/coleccion" element={<p>grilla</p>} />
        <Route path="/producto/:idSlug" element={<p>ficha</p>} />
      </Routes>
    </>
  );
}

function montar() {
  return render(
    <MemoryRouter initialEntries={["/coleccion"]}>
      <Paginas />
    </MemoryRouter>,
  );
}

describe("ScrollAlTope", () => {
  it("lleva la página al tope al montar", () => {
    montar();

    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("le saca al navegador la restauración automática de scroll", () => {
    montar();

    // Es la mitad que arregla el bug reportado: sin esto el navegador móvil
    // restaura la posición vieja DESPUÉS de que React montó, y pisa cualquier
    // scroll que hagamos nosotros.
    expect(window.history.scrollRestoration).toBe("manual");
  });

  it("vuelve al tope al cambiar de ruta", async () => {
    const user = userEvent.setup();
    const { getByText } = montar();
    scrollTo.mockClear();

    await user.click(getByText("ir a la ficha"));

    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 0));
  });

  it("NO toca el scroll cuando solo cambia la querystring", async () => {
    const user = userEvent.setup();
    const { getByText } = montar();
    scrollTo.mockClear();

    await user.click(getByText("misma ruta, otra query"));

    // "Mostrar más" (`?paginas=`), los filtros y la búsqueda escriben en la
    // querystring sin cambiar de página: saltar al tope ahí le arrancaría la
    // vista de las manos a quien acaba de pedir más productos.
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
