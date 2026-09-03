import { describe, expect, it } from "vitest";

import { ESTILOS_CAMPANIA, claveVisual, estiloDeCampania } from "./campanias.js";

describe("claveVisual — los dos ejes colapsados en uno", () => {
  it("una campaña habilitada muestra su estado temporal", () => {
    expect(claveVisual({ estado: "HABILITADA", estadoTemporal: "ACTIVA" })).toBe("ACTIVA");
    expect(claveVisual({ estado: "HABILITADA", estadoTemporal: "PROGRAMADA" })).toBe("PROGRAMADA");
    expect(claveVisual({ estado: "HABILITADA", estadoTemporal: "FINALIZADA" })).toBe("FINALIZADA");
  });

  it("el eje administrativo GANA: una deshabilitada en fecha se ve apagada", () => {
    // Mostrarla como activa porque "está en fecha" contradiría la acción que el
    // admin acaba de hacer al apagarla.
    expect(claveVisual({ estado: "DESHABILITADA", estadoTemporal: "ACTIVA" })).toBe("DESHABILITADA");
  });

  it("un borrador se ve como borrador aunque esté dentro de su período", () => {
    expect(claveVisual({ estado: "BORRADOR", estadoTemporal: "ACTIVA" })).toBe("BORRADOR");
  });

  it("un dato incompleto cae a BORRADOR y no rompe la pantalla", () => {
    expect(claveVisual(undefined)).toBe("BORRADOR");
    expect(claveVisual({})).toBe("BORRADOR");
  });
});

describe("estiloDeCampania", () => {
  it("cada estado se distingue por ícono, no solo por color", () => {
    // Un calendario que solo cambia de tono deja afuera a quien no distingue
    // esos tonos, y encima se vuelve ilegible en blanco y negro.
    const iconos = Object.values(ESTILOS_CAMPANIA).map((e) => e.icono);

    expect(new Set(iconos).size).toBe(iconos.length);
  });

  it("un estado desconocido devuelve un estilo usable, nunca undefined", () => {
    const estilo = estiloDeCampania({ estado: "PAUSADA_2024", estadoTemporal: "???" });

    expect(estilo.barra).toBeTruthy();
    expect(estilo.icono).toBeTruthy();
  });

  it("no usa hex literales: solo tokens semánticos del admin", () => {
    // Un color hardcodeado es lo único que puede romper el modo oscuro, que se
    // resuelve a nivel de custom properties.
    const clases = Object.values(ESTILOS_CAMPANIA)
      .flatMap((e) => [e.barra, e.punto])
      .join(" ");

    expect(clases).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(clases).not.toMatch(/\bdark:/);
  });
});
