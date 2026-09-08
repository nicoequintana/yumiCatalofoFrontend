import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import BotonActualizar from "./BotonActualizar.jsx";

/**
 * Trae de la base lo que haya ahora mismo, sin perder el estado de la pantalla.
 *
 * **Eso último es su única razón de ser.** F5 también trae los datos nuevos: lo
 * que este botón agrega es conservar la página, el orden, el filtro y la
 * búsqueda — en una tabla de 84 productos donde estabas en la página 3 filtrando
 * por categoría, recargar cuesta reconstruir todo eso a mano.
 */
describe("BotonActualizar", () => {
  it("avisa al padre cuando se lo toca", async () => {
    const usuario = userEvent.setup();
    const onActualizar = vi.fn();
    render(<BotonActualizar onActualizar={onActualizar} />);

    await usuario.click(screen.getByRole("button", { name: /actualizar/i }));

    expect(onActualizar).toHaveBeenCalledTimes(1);
  });

  /**
   * Sin señal de que está trabajando, el botón se clickea tres veces: cada
   * click dispara otro pedido, y las respuestas llegan en cualquier orden. El
   * `disabled` es lo que lo impide; el spinner es lo que explica por qué.
   */
  it("mientras actualiza queda deshabilitado y no dispara de nuevo", async () => {
    const usuario = userEvent.setup();
    const onActualizar = vi.fn();
    render(<BotonActualizar onActualizar={onActualizar} actualizando />);

    const boton = screen.getByRole("button", { name: /actualizando/i });
    expect(boton).toBeDisabled();

    await usuario.click(boton);
    expect(onActualizar).not.toHaveBeenCalled();
  });

  /**
   * El botón es solo ícono: no tiene texto visible.
   *
   * Por eso su nombre accesible sale de `aria-label`, y eso deja de ser un
   * detalle de prolijidad para volverse lo único que lo identifica — sin él, un
   * lector de pantalla anuncia "botón" y se acabó. El `title` cubre al otro
   * lado: quien ve el ícono y no lo reconoce necesita el hover para saber qué
   * hace.
   */
  it("no muestra texto, pero se anuncia con nombre", () => {
    render(<BotonActualizar onActualizar={() => {}} />);

    const boton = screen.getByRole("button", { name: "Actualizar" });
    expect(boton).toHaveAttribute("aria-label", "Actualizar");
    expect(boton).toHaveAttribute("title", "Actualizar");

    // El nombre accesible es EXACTAMENTE la etiqueta: nada del ícono se cuela.
    //
    // No se afirma sobre `textContent`: Material Symbols funciona poniendo el
    // nombre del ícono como texto ("refresh") y dejando que la ligadura de la
    // fuente lo dibuje como glifo. Ese texto existe en el DOM a propósito. Lo
    // que tiene que quedar afuera es el nombre accesible, y de eso se ocupa el
    // `aria-hidden` del span.
    expect(boton).toHaveAccessibleName("Actualizar");
  });

  it("el estado de carga se anuncia en el nombre accesible, no solo con el spinner", () => {
    // Un lector de pantalla no ve girar nada: si el único cambio fuera visual,
    // no habría forma de saber que el pedido está en curso.
    const { rerender } = render(<BotonActualizar onActualizar={() => {}} />);
    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();

    rerender(<BotonActualizar onActualizar={() => {}} actualizando />);
    expect(screen.getByRole("button", { name: "Actualizando…" })).toBeInTheDocument();
  });

  it("acepta una etiqueta propia para pantallas donde 'actualizar' es ambiguo", () => {
    // En Costos y precios ya existe un botón "Actualizar precios", que hace otra
    // cosa (publica). Dos botones que empiezan igual en la misma pantalla se
    // confunden, y el que publica precios no es el que conviene tocar por error.
    render(<BotonActualizar onActualizar={() => {}} etiqueta="Traer cambios" />);

    expect(screen.getByRole("button", { name: "Traer cambios" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Actualizar" })).not.toBeInTheDocument();
  });
});

/**
 * Área táctil (WCAG 2.5.8). Medido en navegador el 07/09/2026 sobre
 * `/catalogo/admin/productos` con `elementFromPoint` —el área EFECTIVA, no la
 * caja declarada—: **42×42** a 390 y 43×43 a 1280, por debajo de 44×44.
 *
 * El 42 no era arbitrario: igualaba a los botones de texto de al lado. Esos
 * botones pasaron a 44 en la misma tanda, así que subir a `size-11` mantiene
 * la fila alineada Y cumple el mínimo — por eso se cambia el número en vez de
 * apilarle un `min-h-11` que dejaría el `size-[42px]` como letra muerta.
 */
describe("BotonActualizar — área táctil", () => {
  it("mide 44×44, el mínimo táctil", () => {
    render(<BotonActualizar onActualizar={() => {}} />);

    const boton = screen.getByRole("button", { name: "Actualizar" });

    expect(boton.className.split(" ")).toContain("size-11");
    expect(boton.className).not.toContain("size-[42px]");
  });
});
