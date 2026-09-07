import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CargandoPagina from "./CargandoPagina.jsx";

/**
 * El velo de carga de la home.
 *
 * ⚠️ **Estos tests afirman sobre CLASES y no sobre medidas, y es una
 * limitación de jsdom, no una decisión**: jsdom no hace layout, así que no
 * puede decir dónde termina el velo ni dónde queda el pie. La medición real
 * se hace en navegador contra producción — ver el docblock del componente,
 * que lleva los números.
 */
describe("CargandoPagina", () => {
  it("se anuncia como región ocupada, sin interrumpir al lector de pantalla", () => {
    render(<CargandoPagina />);

    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("dice EN TEXTO qué se está esperando, no solo con el spinner", () => {
    render(<CargandoPagina mensaje="Cargando la tienda…" />);

    // El spinner es decorativo: sin este texto, quien usa un lector de
    // pantalla no recibe nada.
    expect(screen.getByText("Cargando la tienda…")).toBeInTheDocument();
  });

  it("ocupa el ALTO DE LA PANTALLA, para empujar el pie fuera del viewport", () => {
    const { container } = render(<CargandoPagina />);

    // El CLS solo cuenta lo que se DESPLAZA ESTANDO VISIBLE. Con el velo
    // corto, el pie quedaba dentro del viewport y su viaje al levantarse
    // computaba entero.
    //
    // Medido en producción el 07/09/2026 con `min-h-[70vh]`: a 1280x720 el
    // velo medía 504 px, el pie caía en y=634 —adentro del fold— y saltaba
    // 634 px al levantarse. Ese solo movimiento valía 0,086 de un CLS total
    // de 0,122, o sea el 70%.
    //
    // Con el alto completo, lo que haya arriba (navbar, cinta de anuncios)
    // SUMA, así que el pie queda siempre debajo del fold y su
    // desplazamiento deja de computar.
    expect(container.firstChild).toHaveClass("min-h-screen");
    expect(container.firstChild).not.toHaveClass("min-h-[70vh]");
  });
});
