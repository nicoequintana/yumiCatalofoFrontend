import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CintaAmbiente from "./CintaAmbiente.jsx";

/**
 * El cartel de ambiente de testing.
 *
 * **El único test que importa de verdad es el segundo**: que en un build de
 * producción no se renderice nada. Un cartel que diga "AMBIENTE DE TESTING"
 * arriba del catálogo real le dice a un cliente que la tienda donde está por
 * dejar su tarjeta no es la de verdad.
 *
 * Y ni siquiera este archivo es la garantía completa — es la red de abajo. La
 * garantía está una capa más arriba: `import.meta.env.DEV` es una constante que
 * Vite REEMPLAZA en tiempo de build, así que en producción el `if` se vuelve
 * `if (false)` y el minificador borra el bloque entero. El texto no queda en el
 * bundle ni apagado; no está. Ver `CintaAmbiente.jsx`.
 */
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CintaAmbiente", () => {
  it("se muestra en desarrollo", () => {
    vi.stubEnv("DEV", true);
    render(<CintaAmbiente />);

    expect(screen.getByText(/YIMA — AMBIENTE DE TESTING/i)).toBeInTheDocument();
  });

  it("NO renderiza NADA cuando no es desarrollo", () => {
    vi.stubEnv("DEV", false);
    const { container } = render(<CintaAmbiente />);

    // Ni el texto, ni un contenedor vacío, ni un nodo apagado con CSS: nada.
    expect(screen.queryByText(/AMBIENTE DE TESTING/i)).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it("queda por encima de todo lo demás y no empuja el contenido", () => {
    vi.stubEnv("DEV", true);
    render(<CintaAmbiente />);

    const cinta = screen.getByTestId("cinta-ambiente");
    // `fixed` y no `sticky`: flota sobre el contenido en vez de correrlo.
    expect(cinta.className).toContain("fixed");
    // Por encima del z-[100] del Lightbox, que es el techo actual de la app.
    expect(cinta.className).toContain("z-[200]");
  });

  it("no se lleva el foco ni interrumpe al lector de pantalla", () => {
    // Es un rótulo de contexto, no una alerta: no hay nada que accionar ni una
    // novedad que anunciar. Un `role="alert"` acá interrumpiría la lectura de
    // cada pantalla del panel.
    vi.stubEnv("DEV", true);
    render(<CintaAmbiente />);

    const cinta = screen.getByTestId("cinta-ambiente");
    expect(cinta).not.toHaveAttribute("role", "alert");
    expect(cinta.querySelector("a, button, input")).toBeNull();
  });
});
