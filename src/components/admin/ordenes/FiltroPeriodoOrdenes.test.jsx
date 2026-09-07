import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FiltroPeriodoOrdenes from "./FiltroPeriodoOrdenes.jsx";

function montar(props = {}) {
  const onCambiar = vi.fn();
  render(
    <>
      {/* El rótulo visible vive en la pantalla, no en el componente: el nombre
          accesible del grupo sale de ahí. */}
      <span id="rotulo-periodo">Período</span>
      <FiltroPeriodoOrdenes
        idRotulo="rotulo-periodo"
        dias={props.dias ?? ""}
        desde={props.desde ?? ""}
        hasta={props.hasta ?? ""}
        onCambiar={onCambiar}
      />
    </>,
  );
  return onCambiar;
}

describe("FiltroPeriodoOrdenes — los presets", () => {
  it("son botones con aria-pressed dentro de un group, NUNCA un tablist", () => {
    // Mismo criterio que `SelectorPeriodo`: un tablist de verdad obliga a
    // roving tabindex, flechas y una relación tabpanel que estos cuatro
    // botones no justifican. Acá el "panel" es la tabla de abajo.
    montar();

    const grupo = screen.getByRole("group", { name: "Período" });
    expect(grupo).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    for (const etiqueta of ["Hoy", "7 días", "30 días", "Todo"]) {
      expect(screen.getByRole("button", { name: etiqueta })).toHaveAttribute("aria-pressed");
    }
  });

  it("sin ningún filtro, el preset activo es Todo", () => {
    montar();

    expect(screen.getByRole("button", { name: "Todo" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Hoy" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Hoy manda dias=1 y limpia el rango libre", async () => {
    const onCambiar = montar({ desde: "2026-01-01", hasta: "2026-01-31" });

    await userEvent.click(screen.getByRole("button", { name: "Hoy" }));

    expect(onCambiar).toHaveBeenCalledWith({ dias: "1", desde: null, hasta: null });
  });

  it("7 días y 30 días mandan su propio valor", async () => {
    const onCambiar = montar();

    await userEvent.click(screen.getByRole("button", { name: "7 días" }));
    await userEvent.click(screen.getByRole("button", { name: "30 días" }));

    expect(onCambiar).toHaveBeenNthCalledWith(1, { dias: "7", desde: null, hasta: null });
    expect(onCambiar).toHaveBeenNthCalledWith(2, { dias: "30", desde: null, hasta: null });
  });

  it("Todo borra los TRES parámetros", async () => {
    const onCambiar = montar({ dias: "7" });

    await userEvent.click(screen.getByRole("button", { name: "Todo" }));

    expect(onCambiar).toHaveBeenCalledWith({ dias: null, desde: null, hasta: null });
  });

  it("el preset de la URL es el que aparece presionado", () => {
    montar({ dias: "30" });

    expect(screen.getByRole("button", { name: "30 días" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Todo" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("FiltroPeriodoOrdenes — el rango libre", () => {
  it("escribir una fecha BORRA dias", async () => {
    // Coherente con el backend, donde las fechas explícitas le ganan al
    // preset: dejar `dias` puesto mostraría un chip activo que no es el que
    // manda sobre lo que se ve.
    const onCambiar = montar({ dias: "7" });

    await userEvent.type(screen.getByLabelText("Desde"), "2026-01-15");

    expect(onCambiar).toHaveBeenLastCalledWith({ desde: "2026-01-15", dias: null });
  });

  it("vaciar una fecha la borra de la URL en vez de mandarla vacía", async () => {
    const onCambiar = montar({ desde: "2026-01-15" });

    await userEvent.clear(screen.getByLabelText("Desde"));

    expect(onCambiar).toHaveBeenLastCalledWith({ desde: null, dias: null });
  });

  it("con un rango libre activo NINGÚN preset queda presionado, tampoco Todo", () => {
    montar({ desde: "2026-01-01" });

    for (const etiqueta of ["Hoy", "7 días", "30 días", "Todo"]) {
      expect(screen.getByRole("button", { name: etiqueta })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });

  it("los dos inputs son de tipo date y reflejan el valor recibido", () => {
    montar({ desde: "2026-01-01", hasta: "2026-01-31" });

    const desde = screen.getByLabelText("Desde");
    const hasta = screen.getByLabelText("Hasta");
    expect(desde).toHaveAttribute("type", "date");
    expect(hasta).toHaveAttribute("type", "date");
    expect(desde).toHaveValue("2026-01-01");
    expect(hasta).toHaveValue("2026-01-31");
  });
});

describe("FiltroPeriodoOrdenes — los topes de los inputs", () => {
  it("ninguna de las dos fechas puede ser futura", () => {
    // ⚠️ Sin `max`, un `hasta` mal tipeado (2030) hace que el backend corra
    // el `desde` y muestre una ventana entera EN EL FUTURO: cero órdenes y un
    // aviso que nombra fechas que todavía no pasaron.
    montar();

    const hoy = screen.getByLabelText("Desde").getAttribute("max");
    expect(hoy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("max", hoy);
  });
});

describe("FiltroPeriodoOrdenes — el nombre accesible del grupo", () => {
  it("sale del rótulo VISIBLE, sin aria-label propio", () => {
    // Con los dos puestos, `aria-labelledby` gana y el `aria-label` queda
    // muerto — un nombre escrito que nadie oye. Mismo criterio que el grupo
    // de chips de Estado, treinta líneas más arriba en la pantalla.
    montar();

    const grupo = screen.getByRole("group", { name: "Período" });
    expect(grupo).toHaveAttribute("aria-labelledby", "rotulo-periodo");
    expect(grupo).not.toHaveAttribute("aria-label");
  });
});
