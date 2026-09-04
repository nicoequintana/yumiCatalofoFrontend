import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useModalCampania from "./useModalCampania.js";

/**
 * Guard de la regla vigente: el cartel se muestra en CADA carga de página.
 *
 * Antes había una regla de "máximo una vez por día por visitante" apoyada en
 * `localStorage` y en la `claveDia` del backend. Se retiró: la campaña es la
 * vidriera del catálogo y silenciarla por un registro previo hacía que un
 * visitante recurrente nunca la viera.
 *
 * Lo que este archivo protege es la CONSECUENCIA de esa decisión: el hook no
 * puede volver a persistir nada. Un `localStorage.setItem` reintroducido acá no
 * daría ningún error — simplemente el cartel dejaría de aparecer, en silencio.
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

function Sonda({ modal }) {
  const { visible, cerrar } = useModalCampania(modal);
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
    render(<Sonda modal={MODAL} />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("sin modal no se muestra nada", () => {
    render(<Sonda modal={null} />);

    expect(screen.getByTestId("estado")).toHaveTextContent("oculto");
  });

  it("cerrarlo lo oculta", async () => {
    render(<Sonda modal={MODAL} />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));

    screen.getByTestId("estado").click();

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("oculto"));
  });

  it("tras cerrarlo, un modal DISTINTO vuelve a mostrarse", async () => {
    // Es otro mensaje, no una repetición. Que el visitante haya cerrado el
    // cartel de una campaña no puede silenciar el estreno de otra.
    const { rerender } = render(<Sonda modal={MODAL} />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));

    screen.getByTestId("estado").click();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("oculto"));

    rerender(<Sonda modal={OTRO_MODAL} />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("NO toca localStorage: el cartel se muestra en cada carga", async () => {
    // El guard de la decisión. Volver a persistir "ya lo vio" no rompería
    // ningún test de comportamiento visible —el hook seguiría devolviendo
    // `visible` en el primer render de la sesión— pero silenciaría el cartel
    // en la recarga siguiente, sin ningún error.
    render(<Sonda modal={MODAL} />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));

    screen.getByTestId("estado").click();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("oculto"));

    expect(storage.fake.getItem).not.toHaveBeenCalled();
    expect(storage.fake.setItem).not.toHaveBeenCalled();
    expect(storage.fake.removeItem).not.toHaveBeenCalled();
  });
});
