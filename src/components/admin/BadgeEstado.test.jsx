import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BadgeEstado from "./BadgeEstado.jsx";

describe("BadgeEstado", () => {
  // La etiqueta viene del BACKEND (`orden.estadoEtiqueta`, o `etiqueta` en los
  // desgloses de analytics): el frontend ya no tiene su propia copia del
  // diccionario de estados. `estado` sigue siendo la clave de los ESTILOS, que
  // sí son presentación y viven acá.
  it("muestra la etiqueta que le llega del dato", () => {
    render(<BadgeEstado estado="PENDIENTE" etiqueta="Pendiente" />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  // Robustez ante un dato viejo (una respuesta cacheada sin `estadoEtiqueta`):
  // la clave cruda es fea pero legible; un badge vacío es un bug silencioso.
  it("cae a la clave cruda cuando no llega etiqueta", () => {
    render(<BadgeEstado estado="EN_PREPARACION" />);
    expect(screen.getByText("EN_PREPARACION")).toBeInTheDocument();
  });

  it("un estado desconocido usa el estilo neutro sin romper", () => {
    render(<BadgeEstado estado="ALGO_NUEVO" etiqueta="Algo nuevo" />);
    expect(screen.getByText("Algo nuevo")).toBeInTheDocument();
  });
});
