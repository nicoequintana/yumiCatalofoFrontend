import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SeccionAdmin from "./SeccionAdmin.jsx";

describe("SeccionAdmin", () => {
  it("expone la seccion como region accesible con su titulo", () => {
    render(
      <SeccionAdmin titulo="Órdenes estancadas">
        <p>contenido</p>
      </SeccionAdmin>,
    );

    const region = screen.getByRole("region", { name: "Órdenes estancadas" });
    expect(region).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Órdenes estancadas" })).toBeInTheDocument();
    expect(screen.getByText("contenido")).toBeInTheDocument();
  });

  it("usa un aria-label propio cuando el titulo visible difiere", () => {
    render(
      <SeccionAdmin titulo="Antigüedad promedio sin cambios" etiqueta="Antigüedad sin cambios">
        <p>contenido</p>
      </SeccionAdmin>,
    );

    expect(screen.getByRole("region", { name: "Antigüedad sin cambios" })).toBeInTheDocument();
  });

  it("renderiza la descripcion cuando se pasa", () => {
    render(
      <SeccionAdmin titulo="Órdenes por estado" descripcion="Órdenes creadas en el período.">
        <p>contenido</p>
      </SeccionAdmin>,
    );

    expect(screen.getByText("Órdenes creadas en el período.")).toBeInTheDocument();
  });

  it("omite la descripcion si no se pasa", () => {
    const { container } = render(
      <SeccionAdmin titulo="Stock bajo">
        <p>contenido</p>
      </SeccionAdmin>,
    );

    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("delimita la seccion con fondo y borde propios en ambos temas", () => {
    render(
      <SeccionAdmin titulo="Órdenes por estado">
        <p>contenido</p>
      </SeccionAdmin>,
    );

    const region = screen.getByRole("region", { name: "Órdenes por estado" });
    expect(region.className).toContain("bg-surface-container-low");
    expect(region.className).toContain("border");
    expect(region.className).toContain("border-outline-variant");
  });

  it("permite sumar clases extra sin perder las propias", () => {
    render(
      <SeccionAdmin titulo="Stock bajo" className="mt-10">
        <p>contenido</p>
      </SeccionAdmin>,
    );

    const region = screen.getByRole("region", { name: "Stock bajo" });
    expect(region.className).toContain("mt-10");
    expect(region.className).toContain("border-outline-variant");
  });

  it("acepta una accion en el encabezado", () => {
    render(
      <SeccionAdmin titulo="Ventas" accion={<button type="button">Exportar</button>}>
        <p>contenido</p>
      </SeccionAdmin>,
    );

    expect(screen.getByRole("button", { name: "Exportar" })).toBeInTheDocument();
  });
});
