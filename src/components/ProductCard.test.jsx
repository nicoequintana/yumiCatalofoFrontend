import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import ProductCard from "./ProductCard.jsx";

function producto(extra = {}) {
  return {
    id: 1,
    nombre: "Producto de prueba",
    precio: "1000",
    stock: 10,
    fotos: [{ url: "http://x/1.jpg" }],
    ...extra,
  };
}

describe("ProductCard", () => {
  it("no dispara el drag nativo del navegador, ni en la card ni en la foto", () => {
    render(
      <MemoryRouter>
        <ProductCard producto={producto()} />
      </MemoryRouter>,
    );

    // `CarruselDestacados.jsx` reutiliza esta card y mueve la pista con
    // eventos de puntero sobre el mismo envoltorio. Sin `draggable={false}`
    // en el `<a>` y en la `<img>`, el navegador arranca su propio drag nativo
    // de enlace/imagen apenas el gesto empieza sobre la foto —la superficie
    // más grande de la tarjeta— y el arrastre por puntero se corta a la
    // mitad.
    expect(screen.getByRole("link")).toHaveAttribute("draggable", "false");
    expect(screen.getByRole("img")).toHaveAttribute("draggable", "false");
  });
});
