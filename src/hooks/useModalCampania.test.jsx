import { render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useModalCampania from "./useModalCampania.js";

/**
 * Guard de la regla vigente: el cartel se muestra UNA VEZ POR DÍA POR
 * VISITANTE (clave campaña + día).
 *
 * Hubo una versión anterior de esta regla que se retiró el 04/09: el cartel
 * era la ÚNICA puerta a la campaña, así que silenciarlo por una visita previa
 * dejaba al visitante recurrente sin verla nunca. Con el carrusel de la home
 * siempre presente eso dejó de ser cierto — la campaña sigue estando en cada
 * visita, y el tope solo evita el portazo en cada recarga.
 */

/** Fake completo de localStorage, con espías. `globalThis.localStorage` es un
 *  objeto vacío sin métodos (Node arranca con `--localstorage-file` sin path y
 *  tapa la implementación de jsdom), así que no se puede espiar con
 *  `vi.spyOn`: hay que reemplazarlo entero y restaurarlo después. */
function instalarStorage() {
  const datos = {};
  const fake = {
    getItem: vi.fn((k) => (k in datos ? datos[k] : null)),
    setItem: vi.fn((k, v) => {
      datos[k] = String(v);
    }),
    removeItem: vi.fn((k) => {
      delete datos[k];
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(datos)) delete datos[k];
    }),
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true });
  return {
    datos,
    fake,
    restaurar: () => {
      if (original) Object.defineProperty(globalThis, "localStorage", original);
    },
  };
}

let storage;

function Sonda({ modal, claveDia }) {
  const { visible, cerrar } = useModalCampania(modal, claveDia);
  return (
    <button type="button" onClick={cerrar} data-testid="estado">
      {visible ? "visible" : "oculto"}
    </button>
  );
}

const MODAL = { campaniaId: 7, titulo: "Llega la primavera", diasFaltantes: 6 };
const OTRO_MODAL = { campaniaId: 3, titulo: "Fin de temporada", diasFaltantes: 2 };

beforeEach(() => {
  storage = instalarStorage();
});

afterEach(() => {
  storage.restaurar();
});

describe("useModalCampania", () => {
  it("se muestra cuando hay modal", async () => {
    render(<Sonda modal={MODAL} claveDia="2026-09-05" />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("sin modal no se muestra nada", () => {
    render(<Sonda modal={null} claveDia="2026-09-05" />);

    expect(screen.getByTestId("estado")).toHaveTextContent("oculto");
  });

  it("cerrarlo lo oculta", async () => {
    render(<Sonda modal={MODAL} claveDia="2026-09-05" />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));

    screen.getByTestId("estado").click();

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("oculto"));
  });

  it("tras cerrarlo, un modal DISTINTO vuelve a mostrarse", async () => {
    // Es otro mensaje, no una repetición. Que el visitante haya cerrado el
    // cartel de una campaña no puede silenciar el estreno de otra.
    const { rerender } = render(<Sonda modal={MODAL} claveDia="2026-09-05" />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));

    screen.getByTestId("estado").click();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("oculto"));

    rerender(<Sonda modal={OTRO_MODAL} claveDia="2026-09-05" />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("una vez por día por visitante: en la misma jornada no vuelve", async () => {
    // REVIERTE la regla de "cada carga" (04/09). El argumento que la sostenía
    // era que el cartel era la ÚNICA puerta a la campaña; con el carrusel
    // siempre presente, eso dejó de ser cierto.
    const { unmount } = render(<Sonda modal={MODAL} claveDia="2026-09-05" />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));

    screen.getByTestId("estado").click();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("oculto"));
    unmount();

    render(<Sonda modal={MODAL} claveDia="2026-09-05" />);

    expect(screen.getByTestId("estado")).toHaveTextContent("oculto");
  });

  it("al día siguiente vuelve a mostrarse", async () => {
    render(<Sonda modal={MODAL} claveDia="2026-09-05" />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
    screen.getByTestId("estado").click();
    cleanup();

    render(<Sonda modal={MODAL} claveDia="2026-09-06" />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("otra campaña el MISMO día vuelve a mostrarse", async () => {
    // La clave es campaña + día, no solo el día. Es otro mensaje, no una
    // repetición: esta conducta ya existía y no se pierde con el tope.
    render(<Sonda modal={MODAL} claveDia="2026-09-05" />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
    screen.getByTestId("estado").click();
    cleanup();

    render(<Sonda modal={OTRO_MODAL} claveDia="2026-09-05" />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("sin claveDia NO persiste nada y se muestra igual", async () => {
    // El día lo manda el backend. Si `activas` falló, `claveDia` es null:
    // preferimos mostrarlo de más antes que escribir una clave inventada.
    render(<Sonda modal={MODAL} claveDia={null} />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
    screen.getByTestId("estado").click();

    expect(storage.fake.setItem).not.toHaveBeenCalled();
  });

  it("si localStorage falla, el cartel se muestra igual", async () => {
    // Modo incógnito o storage bloqueado: degradar a "mostrarlo" es correcto.
    storage.fake.getItem.mockImplementation(() => {
      throw new Error("storage disabled");
    });

    render(<Sonda modal={MODAL} claveDia="2026-09-05" />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });
});
