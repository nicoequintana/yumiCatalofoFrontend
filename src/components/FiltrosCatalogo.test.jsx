import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FiltrosCatalogo from "./FiltrosCatalogo.jsx";

const CATEGORIAS = [
  { id: 1, nombre: "Relojes" },
  { id: 2, nombre: "Bolsos" },
];

/**
 * Se usa `fireEvent` y no `userEvent`: estos tests dependen de temporizadores
 * falsos, y `userEvent` maneja los suyos propios, lo que vuelve la
 * combinación frágil. Para un input controlado, un `change` por carácter
 * modela el tipeo con la fidelidad que acá importa — cada evento es
 * exactamente una oportunidad de disparar un fetch.
 */
function tipear(campo, texto) {
  act(() => {
    for (let i = 1; i <= texto.length; i++) {
      fireEvent.change(campo, { target: { value: texto.slice(0, i) } });
    }
  });
}

function renderFiltros(props = {}) {
  const manejadores = {
    onChangeCategoria: vi.fn(),
    onChangeSearch: vi.fn(),
    onChangeMinPrecio: vi.fn(),
    onChangeMaxPrecio: vi.fn(),
  };

  const utils = render(
    <FiltrosCatalogo
      categorias={CATEGORIAS}
      categoria=""
      search=""
      minPrecio=""
      maxPrecio=""
      {...manejadores}
      {...props}
    />,
  );

  return { ...utils, ...manejadores };
}

function avanzarPastLaPausa() {
  act(() => {
    vi.advanceTimersByTime(400);
  });
}

describe("FiltrosCatalogo — precio con debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no avisa al padre en cada tecla: commitea una sola vez tras la pausa", () => {
    const { onChangeMaxPrecio } = renderFiltros();

    // Sin debounce, cada dígito disparaba su propio GET /products: seis
    // requests para escribir un precio, cinco de ellas descartadas al llegar.
    tipear(screen.getAllByLabelText("Precio máx.")[0], "150000");

    expect(onChangeMaxPrecio).not.toHaveBeenCalled();

    avanzarPastLaPausa();

    expect(onChangeMaxPrecio).toHaveBeenCalledTimes(1);
    expect(onChangeMaxPrecio).toHaveBeenCalledWith("150000");
  });

  it("muestra lo tipeado al instante aunque el commit al padre espere", () => {
    renderFiltros();

    const campo = screen.getAllByLabelText("Precio min.")[0];
    tipear(campo, "2500");

    // El input no puede sentirse trabado: el formateo local es inmediato,
    // lo único diferido es el aviso al padre.
    expect(campo).toHaveValue("2.500");
  });

  it("commitea el vaciado del campo para que el filtro se saque", () => {
    const { onChangeMinPrecio } = renderFiltros({ minPrecio: "2500" });

    act(() => {
      fireEvent.change(screen.getAllByLabelText("Precio min.")[0], { target: { value: "" } });
    });
    avanzarPastLaPausa();

    expect(onChangeMinPrecio).toHaveBeenCalledWith("");
  });

  it("no commitea nada al montar ni cuando el valor lo cambia el padre", () => {
    const onChangeMinPrecio = vi.fn();
    const { rerender } = renderFiltros({ onChangeMinPrecio });

    avanzarPastLaPausa();
    expect(onChangeMinPrecio).not.toHaveBeenCalled();

    // El padre es la fuente de verdad (el valor vive en la URL). Un valor que
    // baja por props debe adoptarse, nunca rebotar de vuelta hacia arriba
    // como si el usuario lo hubiera tipeado.
    rerender(
      <FiltrosCatalogo
        categorias={CATEGORIAS}
        categoria=""
        search=""
        minPrecio="9000"
        maxPrecio=""
        onChangeCategoria={vi.fn()}
        onChangeSearch={vi.fn()}
        onChangeMinPrecio={onChangeMinPrecio}
        onChangeMaxPrecio={vi.fn()}
      />,
    );
    avanzarPastLaPausa();

    expect(screen.getAllByLabelText("Precio min.")[0]).toHaveValue("9.000");
    expect(onChangeMinPrecio).not.toHaveBeenCalled();
  });

  it("avisa el cambio de categoría en el acto, sin esperar", () => {
    const { onChangeCategoria } = renderFiltros();

    // El `<select>` emite un cambio por selección, no por tecla: diferirlo
    // solo agregaría latencia sin ahorrar ninguna request.
    act(() => {
      fireEvent.change(screen.getAllByLabelText("Categoría")[0], { target: { value: "2" } });
    });

    expect(onChangeCategoria).toHaveBeenCalledWith("2");
  });
});
