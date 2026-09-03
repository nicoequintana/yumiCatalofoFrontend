import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PrecioProducto from "./PrecioProducto.jsx";

/**
 * Guard del precio que ve el cliente.
 *
 * Lo que se afirma acá es sobre todo lo que el componente NO hace: **no calcula
 * nada**. El precio efectivo y el porcentaje llegan resueltos del backend, que
 * es la regla 1 del proyecto aplicada al dato que más plata mueve. Un cálculo
 * de este lado sería el tercer espejo manual entre repos.
 */

const SIN_PROMO = { precio: "20000", precioEfectivo: null, descuento: null };
const CON_PROMO = { precio: "20000", precioEfectivo: "17000", descuento: { porcentaje: 15 } };

describe("PrecioProducto", () => {
  it("sin promoción muestra UN solo precio", () => {
    render(<PrecioProducto producto={SIN_PROMO} />);

    expect(screen.getByText("$ 20.000")).toBeInTheDocument();
    expect(screen.queryByText(/OFF/)).not.toBeInTheDocument();
  });

  it("con promoción muestra el efectivo y TACHA el de lista", () => {
    render(<PrecioProducto producto={CON_PROMO} />);

    expect(screen.getByText("$ 17.000")).toBeInTheDocument();
    // El de lista tiene que seguir visible: sin el ancla, un 15 % de descuento
    // es solo un precio más bajo y no se lee como oferta.
    expect(screen.getByText("$ 20.000").tagName.toLowerCase()).toBe("s");
  });

  it("el precio que PAGA es el que tiene jerarquía de precio principal", () => {
    // Invertir la jerarquía haría que el cliente lea el precio viejo como el
    // vigente, que es peor que no mostrar la oferta.
    const { container } = render(<PrecioProducto producto={CON_PROMO} />);

    const principal = container.querySelector("[data-precio='efectivo']");
    expect(principal).toHaveTextContent("$ 17.000");
  });

  it("anuncia el porcentaje", () => {
    render(<PrecioProducto producto={CON_PROMO} />);

    expect(screen.getByText("15% OFF")).toBeInTheDocument();
  });

  it("un lector de pantalla entiende cuál es cuál", () => {
    // Sin esto se escuchan dos montos seguidos sin ninguna pista de qué es cada
    // uno, y el tachado no se anuncia en todos los lectores.
    render(<PrecioProducto producto={CON_PROMO} />);

    expect(screen.getByText(/precio anterior/i)).toBeInTheDocument();
  });

  it("si falta el precio efectivo NO inventa un descuento", () => {
    // Defensa contra una respuesta a medias: `descuento` sin `precioEfectivo`
    // no puede pintar un tachado sobre un precio que no existe.
    render(<PrecioProducto producto={{ precio: "20000", precioEfectivo: null, descuento: { porcentaje: 15 } }} />);

    expect(screen.getByText("$ 20.000")).toBeInTheDocument();
    expect(screen.queryByText(/OFF/)).not.toBeInTheDocument();
  });

  it("NO calcula: usa el efectivo que le dan, aunque no cierre con el porcentaje", () => {
    // Si el componente recalculara, este caso mostraría 17.000. Muestra lo que
    // vino, que es lo que el backend va a cobrar. Un cálculo de este lado sería
    // un segundo precio compitiendo con el de la orden.
    render(
      <PrecioProducto
        producto={{ precio: "20000", precioEfectivo: "12345", descuento: { porcentaje: 15 } }}
      />,
    );

    expect(screen.getByText("$ 12.345")).toBeInTheDocument();
  });

  it("acepta clases para adaptarse a la card y a la ficha", () => {
    const { container } = render(<PrecioProducto producto={SIN_PROMO} className="text-[17px]" />);

    expect(container.querySelector("[data-precio='efectivo']")).toHaveClass("text-[17px]");
  });
});
