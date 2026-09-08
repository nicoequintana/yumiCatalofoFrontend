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

  it("el corazón NO cuelga del enlace: son hermanos", () => {
    // Un `<button>` dentro de un `<a>` es HTML inválido, y el efecto medible
    // es el nombre accesible del enlace: arrancaba con "Agregar a favoritos" y
    // repetía el nombre del producto dos veces. Son 12 cards en `/coleccion`,
    // 8 en la home y 4 en relacionados.
    render(
      <MemoryRouter>
        <ProductCard producto={producto({ nombre: "Soporte Celular" })} />
      </MemoryRouter>,
    );

    const corazon = screen.getByRole("button", { name: "Agregar a favoritos" });
    expect(corazon.closest("a")).toBeNull();

    // Y la card entera sigue siendo UN enlace al producto.
    const enlace = screen.getByRole("link");
    expect(enlace).toHaveAttribute("href", expect.stringContaining("/producto/"));
    expect(enlace).toHaveAccessibleName(expect.stringContaining("Soporte Celular"));
    expect(enlace).not.toHaveAccessibleName(expect.stringContaining("favoritos"));
  });

  it("el nombre se muestra en DOS líneas, no truncado a una", () => {
    // En la grilla de 4 columnas, "Reloj Despertador Digital Crist…" y "Reloj
    // Despertador Digital Núm…" son indistinguibles sin abrir cada uno.
    render(
      <MemoryRouter>
        <ProductCard producto={producto({ nombre: "Reloj Despertador Digital Cristal" })} />
      </MemoryRouter>,
    );

    const nombre = screen.getByRole("heading", { name: "Reloj Despertador Digital Cristal" });
    expect(nombre.className).toContain("line-clamp-2");
    expect(nombre.className).not.toContain("truncate");
  });

  it("pinta la etiqueta con el color que manda el backend", () => {
    render(
      <MemoryRouter>
        <ProductCard
          producto={producto({
            etiqueta: { id: 1, nombre: "Nuevo", colorFondo: "46 125 50", colorTexto: "255 255 255" },
          })}
        />
      </MemoryRouter>,
    );

    const chip = screen.getByText("Nuevo");
    expect(chip).toHaveStyle({ backgroundColor: "rgb(46, 125, 50)" });
    expect(chip).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });

  // `colorFondo: null` significa "como siempre", no "dato faltante".
  it("sin color cae al token de siempre de la card y no emite style", () => {
    render(
      <MemoryRouter>
        <ProductCard
          producto={producto({
            etiqueta: { id: 1, nombre: "Nuevo", colorFondo: null, colorTexto: null },
          })}
        />
      </MemoryRouter>,
    );

    const chip = screen.getByText("Nuevo");
    expect(chip.getAttribute("style")).toBeFalsy();
    expect(chip.className).toContain("bg-secondary-container");
    expect(chip.className).toContain("text-on-secondary-container");
  });
});
