import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CarruselCampanias from "./CarruselCampanias.jsx";

function slide(n, extra = {}) {
  return {
    tipo: "CAMPANIA",
    campaniaId: n,
    titulo: `Campaña ${n}`,
    texto: null,
    ctaTexto: null,
    ctaDestino: null,
    arteUrl: null,
    doodleUrl: null,
    color: "TERRACOTA",
    ...extra,
  };
}

function renderCarrusel(slides) {
  return render(
    <MemoryRouter>
      <CarruselCampanias slides={slides} />
    </MemoryRouter>,
  );
}

/** Sin movimiento reducido, para que la rotación arranque en los tests. */
function conMovimiento(reduce = false) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes("reduce") ? reduce : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  conMovimiento(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CarruselCampanias", () => {
  it("sin slides no renderiza nada", () => {
    const { container } = renderCarrusel([]);

    expect(container).toBeEmptyDOMElement();
  });

  it("con UN slide no pinta la fila de control: ni flechas ni puntos", () => {
    // Un carrusel de un elemento es un banner. Los puntos serían adorno que
    // miente y una flecha que vuelve al mismo slide es un control roto.
    renderCarrusel([slide(1)]);

    expect(screen.getByText("Campaña 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /siguiente/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /anterior/i })).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("con dos slides aparecen las flechas y los puntos", () => {
    renderCarrusel([slide(1), slide(2)]);

    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("la flecha siguiente avanza", async () => {
    const usuario = userEvent.setup();
    renderCarrusel([slide(1), slide(2)]);

    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");
  });

  it("desde el PRIMER slide, anterior va al último", async () => {
    // Circular en las dos puntas: un control que se deshabilita en los
    // extremos obliga a mirar si todavía sirve antes de tocarlo.
    const usuario = userEvent.setup();
    renderCarrusel([slide(1), slide(2), slide(3)]);

    await usuario.click(screen.getByRole("button", { name: /anterior/i }));

    expect(screen.getAllByRole("tab")[2]).toHaveAttribute("aria-current", "true");
  });

  it("rota sola a los 5 segundos", () => {
    // Solo `Date` y timers: en este archivo no hay servidor HTTP, así que
    // faquear todo es seguro. Ver el gotcha de supertest en CLAUDE.md.
    vi.useFakeTimers();
    renderCarrusel([slide(1), slide(2)]);

    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-current", "true");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");
  });

  it("NO rota con prefers-reduced-motion", () => {
    conMovimiento(true);
    vi.useFakeTimers();
    renderCarrusel([slide(1), slide(2)]);

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-current", "true");
  });

  it("una flecha REINICIA el temporizador", async () => {
    // Si adelantás a mano y 200 ms después el salto automático te saca de la
    // pantalla lo que fuiste a buscar, el carrusel te está peleando.
    // `{ advanceTimers: vi.advanceTimersByTime }` cuelga la interaccion con
    // esta version de user-event: el click nunca resuelve. El mismo problema
    // que Coleccion.test.jsx ya esquiva con `shouldAdvanceTime` y un
    // `userEvent.setup()` sin esa opcion.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const usuario = userEvent.setup();
    renderCarrusel([slide(1), slide(2), slide(3)]);

    act(() => {
      vi.advanceTimersByTime(4800);
    });
    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");

    // Si el temporizador NO se reinició, a los 200 ms ya estaría en el tercero.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");
  });

  it("los puntos son botones con nombre accesible", () => {
    renderCarrusel([slide(1), slide(2)]);

    expect(screen.getByRole("tab", { name: "Ir al slide 1 de 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ir al slide 2 de 2" })).toBeInTheDocument();
  });
});
