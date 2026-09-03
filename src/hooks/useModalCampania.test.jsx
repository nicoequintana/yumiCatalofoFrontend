import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import useModalCampania, { CLAVE_STORAGE } from "./useModalCampania.js";

/**
 * Guard de la regla "máximo una vez por día por visitante".
 *
 * El día lo decide el BACKEND (`claveDia`), no el reloj del navegador. Es la
 * misma disciplina que el resto del módulo: el sistema tiene una sola
 * definición de "día", y alguien con la máquina mal puesta no puede ver el
 * cartel dos veces ni dejar de verlo.
 */

/** Fake completo de localStorage. `globalThis.localStorage` es un objeto vacío
 *  sin métodos (Node arranca con `--localstorage-file` sin path y tapa la
 *  implementación de jsdom), así que no se puede espiar: hay que reemplazarlo. */
function instalarStorage(inicial = {}) {
  const datos = { ...inicial };
  const fake = {
    getItem: (k) => (k in datos ? datos[k] : null),
    setItem: (k, v) => {
      datos[k] = String(v);
    },
    removeItem: (k) => {
      delete datos[k];
    },
    clear: () => {
      for (const k of Object.keys(datos)) delete datos[k];
    },
  };
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true });
  return {
    datos,
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
const HOY = "2026-09-15";

beforeEach(() => {
  storage = instalarStorage();
});

afterEach(() => {
  storage.restaurar();
});

describe("useModalCampania", () => {
  it("se muestra la primera vez del día", async () => {
    render(<Sonda modal={MODAL} claveDia={HOY} />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("NO se muestra si ya se vio hoy", () => {
    storage.restaurar();
    storage = instalarStorage({
      [CLAVE_STORAGE]: JSON.stringify({ campaniaId: 7, clave: HOY }),
    });

    render(<Sonda modal={MODAL} claveDia={HOY} />);

    expect(screen.getByTestId("estado")).toHaveTextContent("oculto");
  });

  it("vuelve a mostrarse al día siguiente", async () => {
    storage.restaurar();
    storage = instalarStorage({
      [CLAVE_STORAGE]: JSON.stringify({ campaniaId: 7, clave: "2026-09-14" }),
    });

    render(<Sonda modal={MODAL} claveDia={HOY} />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("una campaña DISTINTA se muestra aunque ya se haya visto otra hoy", async () => {
    // Es otro mensaje, no una repetición. Silenciarlo por el registro de una
    // campaña ajena haría que estrenar una campaña el mismo día que terminó
    // otra pasara desapercibido.
    storage.restaurar();
    storage = instalarStorage({
      [CLAVE_STORAGE]: JSON.stringify({ campaniaId: 3, clave: HOY }),
    });

    render(<Sonda modal={MODAL} claveDia={HOY} />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("cerrarlo lo registra y no vuelve en la misma sesión", async () => {
    render(<Sonda modal={MODAL} claveDia={HOY} />);
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));

    screen.getByTestId("estado").click();

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("oculto"));
    expect(JSON.parse(storage.datos[CLAVE_STORAGE])).toEqual({ campaniaId: 7, clave: HOY });
  });

  it("SIN claveDia no se muestra: el día lo decide el backend", () => {
    // Mientras el contexto no llegó —o falló— no hay forma de saber si ya se
    // mostró hoy. Mostrarlo igual significaría repetirlo en cada recarga.
    render(<Sonda modal={MODAL} claveDia={null} />);

    expect(screen.getByTestId("estado")).toHaveTextContent("oculto");
  });

  it("sin modal no se muestra nada", () => {
    render(<Sonda modal={null} claveDia={HOY} />);

    expect(screen.getByTestId("estado")).toHaveTextContent("oculto");
  });

  it("un registro corrupto se trata como 'nunca se vio', no rompe", async () => {
    storage.restaurar();
    storage = instalarStorage({ [CLAVE_STORAGE]: "{no es json" });

    render(<Sonda modal={MODAL} claveDia={HOY} />);

    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
  });

  it("un localStorage bloqueado no rompe la página", async () => {
    // Modo privado, o política del navegador. El modal es decoración: que no se
    // pueda registrar no puede tumbar el catálogo.
    storage.restaurar();
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("bloqueado");
        },
        setItem: () => {
          throw new Error("bloqueado");
        },
      },
      configurable: true,
    });

    expect(() => render(<Sonda modal={MODAL} claveDia={HOY} />)).not.toThrow();
    await waitFor(() => expect(screen.getByTestId("estado")).toHaveTextContent("visible"));
    expect(() => screen.getByTestId("estado").click()).not.toThrow();
  });
});
