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

  // Dominios ajenos a órdenes (campañas, promociones) no pueden pintar sus
  // estados con `ESTILOS_ESTADO`: sus claves no matchean ninguna y todo cae
  // al gris por defecto. `estilos` deja que el consumidor pase su propio mapa
  // sin que `constants/ordenes.js` tenga que aprender de un dominio ajeno.
  it("acepta un mapa de estilos propio para un dominio ajeno a órdenes", () => {
    const { container } = render(
      <BadgeEstado
        estado="ACTIVA"
        etiqueta="Activa"
        estilos={{ ACTIVA: "bg-primary text-on-primary" }}
      />,
    );
    expect(container.firstChild).toHaveClass("bg-primary", "text-on-primary");
  });

  it("sin mapa propio, sigue usando ESTILOS_ESTADO por default", () => {
    const { container } = render(<BadgeEstado estado="PENDIENTE" etiqueta="Pendiente" />);
    expect(container.firstChild).toHaveClass("bg-surface-container-high");
  });
});
