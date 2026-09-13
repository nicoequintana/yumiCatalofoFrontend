import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import ProductCard from "./ProductCard.jsx";

// Sin prefijo "use": oxlint (`rules-of-hooks`) trata como Hook a cualquier
// identificador que empiece así — mismo criterio que `BotonAgregar.test.jsx`.
const agregarMock = vi.fn();
vi.mock("../hooks/useCarrito.js", () => ({
  default: () => ({ carrito: [], agregar: agregarMock, cantidadTotal: 0 }),
}));

/** La card monta `BotonAgregar`, que necesita el `ToastProvider` (en la app lo pone `main.jsx`). */
function renderCard(p) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ProductCard producto={p} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

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
    renderCard(producto());

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
    renderCard(producto({ nombre: "Soporte Celular" }));

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
    renderCard(producto({ nombre: "Reloj Despertador Digital Cristal" }));

    const nombre = screen.getByRole("heading", { name: "Reloj Despertador Digital Cristal" });
    expect(nombre.className).toContain("line-clamp-2");
    expect(nombre.className).not.toContain("truncate");
  });

  it("pinta la etiqueta con el color que manda el backend", () => {
    renderCard(
      producto({
        etiqueta: { id: 1, nombre: "Nuevo", colorFondo: "46 125 50", colorTexto: "255 255 255" },
      }),
    );

    const chip = screen.getByText("Nuevo");
    expect(chip).toHaveStyle({ backgroundColor: "rgb(46, 125, 50)" });
    expect(chip).toHaveStyle({ color: "rgb(255, 255, 255)" });
  });

  // `colorFondo: null` significa "como siempre", no "dato faltante".
  it("sin color cae al token de siempre de la card y no emite style", () => {
    renderCard(
      producto({
        etiqueta: { id: 1, nombre: "Nuevo", colorFondo: null, colorTexto: null },
      }),
    );

    const chip = screen.getByText("Nuevo");
    expect(chip.getAttribute("style")).toBeFalsy();
    expect(chip.className).toContain("bg-secondary-container");
    expect(chip.className).toContain("text-on-secondary-container");
  });
});

describe("ProductCard — badges nuevos", () => {
  it("muestra NUEVO cuando esNuevo es true", () => {
    renderCard(producto({ esNuevo: true }));
    expect(screen.getByText("Nuevo")).toBeInTheDocument();
  });

  it("no muestra NUEVO cuando esNuevo es false o falta", () => {
    renderCard(producto());
    expect(screen.queryByText("Nuevo")).not.toBeInTheDocument();
  });

  it("apila DESTACADO y NUEVO cuando el producto es las dos cosas", () => {
    renderCard(producto({ destacado: true, esNuevo: true }));
    const destacado = screen.getByText("Destacado");
    const nuevo = screen.getByText("Nuevo");
    // Apilados = mismo contenedor, no dos chips `absolute` superpuestos en la
    // misma esquina (que es lo que pasaría si cada uno se posicionara solo).
    expect(destacado.parentElement).toBe(nuevo.parentElement);
  });

  it("muestra el % OFF cuando hay descuento", () => {
    renderCard(producto({ descuento: { porcentaje: 20 } }));
    expect(screen.getByText("20% OFF")).toBeInTheDocument();
  });

  it("el chip de últimas unidades usa superficie clara, no el rojo de error", () => {
    renderCard(producto({ stock: 2 }));
    const chip = screen.getByText("Últimos 2");
    expect(chip.className).toContain("bg-surface-container-lowest");
    expect(chip.className).toContain("text-secondary");
    expect(chip.className).not.toContain("bg-error");
  });
});

describe("ProductCard — tratamiento del mockup", () => {
  it("los cinco chips son píldoras (rounded-full)", () => {
    renderCard(
      producto({
        destacado: true,
        esNuevo: true,
        stock: 2,
        descuento: { porcentaje: 20 },
        etiqueta: { id: 1, nombre: "Exclusivo", colorFondo: null, colorTexto: null },
      }),
    );
    for (const texto of ["Destacado", "Nuevo", "20% OFF", "Exclusivo", "Últimos 2"]) {
      const chip = screen.getAllByText(texto).find((el) => el.closest("a"));
      const clases = chip.className.split(" ");
      expect(clases, texto).toContain("rounded-full");
      expect(clases, texto).not.toContain("rounded");
    }
  });

  it("el precio efectivo va en terracota (secondary), Outfit extra-bold, 19px / 24px", () => {
    renderCard(producto());
    const precio = document.querySelector('[data-precio="efectivo"]');
    const clases = precio.className.split(" ");
    expect(clases).toEqual(
      expect.arrayContaining(["font-label-lg", "font-extrabold", "text-secondary", "text-[19px]", "md:text-[24px]"]),
    );
    expect(clases).not.toContain("text-primary");
  });

  it("puntaje, precio y cuotas viajan juntos al pie del cuerpo (mt-auto en el bloque, no en el precio)", () => {
    renderCard(
      producto({ calificacion: { promedio: 4.8, cantidad: 62 }, cuotas: "3 cuotas sin interés de $ 333" }),
    );
    const bloque = screen.getByText("4,8").parentElement;
    const precio = document.querySelector('[data-precio="efectivo"]');
    expect(bloque.className.split(" ")).toContain("mt-auto");
    expect(bloque).toContainElement(precio);
    expect(bloque).toContainElement(screen.getByText("3 cuotas sin interés de $ 333"));
    expect(precio.className.split(" ")).not.toContain("mt-auto");
  });

  it("un destacado ya no lleva el anillo ni la sombra de la marca vieja: lo señala el chip", () => {
    renderCard(producto({ destacado: true }));
    const shell = screen.getByRole("link").parentElement;
    expect(shell.className).not.toContain("ring-2");
    expect(shell.className).not.toContain("shadow-[");
    expect(screen.getByText("Destacado")).toBeInTheDocument();
  });
});

describe("ProductCard — Agregar al carrito", () => {
  it("el botón Agregar es HERMANO del enlace, no su hijo", () => {
    renderCard(producto());
    const boton = screen.getByRole("button", { name: /agregar$/i });
    expect(boton.closest("a")).toBeNull();
  });

  it("clickear Agregar NO navega y suma al carrito", async () => {
    agregarMock.mockClear();
    let ruta = "/";
    function Espia() {
      ruta = useLocation().pathname;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ToastProvider>
          <ProductCard producto={producto({ id: 7 })} />
          <Espia />
        </ToastProvider>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect(agregarMock).toHaveBeenCalledWith(7, 1);
    expect(ruta).toBe("/");
  });
});

describe("ProductCard — slots reservados", () => {
  it("sin calificación no renderiza nada de puntaje", () => {
    renderCard(producto());
    expect(screen.queryByText(/\d,\d/)).not.toBeInTheDocument();
  });

  it("con calificación, la muestra", () => {
    renderCard(producto({ calificacion: { promedio: 4.8, cantidad: 62 } }));
    expect(screen.getByText("4,8")).toBeInTheDocument();
    expect(screen.getByText("(62)")).toBeInTheDocument();
  });

  it("sin cuotas no renderiza nada de cuotas", () => {
    renderCard(producto());
    expect(screen.queryByText(/cuotas/i)).not.toBeInTheDocument();
  });

  it("con cuotas, las muestra", () => {
    renderCard(producto({ cuotas: "3 cuotas sin interés de $ 333" }));
    expect(screen.getByText("3 cuotas sin interés de $ 333")).toBeInTheDocument();
  });
});
