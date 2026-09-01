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
    onLimpiarFiltros: vi.fn(),
  };

  const utils = render(
    <FiltrosCatalogo
      titulo="Todos los productos"
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

function botonFiltros() {
  return screen.getByRole("button", { name: /filtros/i });
}

function abrirPanel() {
  act(() => {
    fireEvent.click(botonFiltros());
  });
}

/**
 * El panel se mantiene MONTADO siempre (es lo que permite animar la salida
 * con CSS puro), así que "cerrado" no se verifica con `queryBy…`: jsdom no
 * implementa `inert`, y Testing Library encuentra los nodos igual. La
 * afirmación honesta es sobre el atributo — mismo criterio que ya documenta
 * CLAUDE.md para los CTA inertes de la vista previa del admin.
 */
function panelEstaCerrado() {
  return screen.getAllByLabelText("Categoría")[0].closest("[inert]") !== null;
}

function avanzarPastLaPausa() {
  act(() => {
    vi.advanceTimersByTime(400);
  });
}

describe("FiltrosCatalogo — barra sticky", () => {
  it("conserva el h1 de la página aunque no se muestre", () => {
    renderFiltros({ titulo: "Cocina" });

    // El título se sacó de la vista por pedido, pero el `<h1>` sigue en el
    // DOM como `sr-only`: es el ÚNICO de `/coleccion` desde que se eliminó el
    // que estaba arriba de la grilla. Borrarlo deja la página sin encabezado
    // de nivel 1 — se pierde la señal más fuerte de SEO sobre de qué trata y
    // el punto de entrada de la navegación por encabezados de un lector de
    // pantalla. Este test es lo que frena ese borrado.
    const encabezado = screen.getByRole("heading", { level: 1, name: "Cocina" });

    expect(encabezado).toBeInTheDocument();
    expect(encabezado).toHaveClass("sr-only");
  });

  it("ancla su top a navbar-height MÁS la variable de la cinta de ambiente", () => {
    // `navbar-height`/`navbar-height-md` ya eran un contrato de dos puntas con
    // el Navbar; la cinta de dev (`CintaAmbiente.jsx`) suma una tercera:
    // `--alto-cinta-ambiente` vale su alto real mientras existe en el DOM y
    // `0px` en producción, así que sumarla al cálculo no mueve nada en el
    // sitio publicado.
    const { container } = renderFiltros();
    const barra = container.querySelector(".sticky");

    expect(barra).toHaveClass(
      "top-[calc(var(--alto-cinta-ambiente)_+_theme(spacing.navbar-height))]",
    );
    expect(barra).toHaveClass(
      "md:top-[calc(var(--alto-cinta-ambiente)_+_theme(spacing.navbar-height-md))]",
    );
    expect(barra).not.toHaveClass("top-navbar-height");
    expect(barra).not.toHaveClass("md:top-navbar-height-md");
  });

  it("deja el buscador SIEMPRE afuera del panel", () => {
    renderFiltros();

    // Decisión de producto: buscar por nombre es la acción más frecuente del
    // catálogo y tiene que costar un solo toque. Si alguna vez se mueve
    // adentro del panel, este test es lo que lo frena.
    expect(screen.getByLabelText("Buscar")).toBeInTheDocument();
    expect(screen.getByLabelText("Buscar").closest("[inert]")).toBeNull();
  });

  it("arranca con el panel cerrado e inerte", () => {
    renderFiltros();

    expect(botonFiltros()).toHaveAttribute("aria-expanded", "false");
    expect(panelEstaCerrado()).toBe(true);
  });

  it("abre y cierra el panel con el botón", () => {
    renderFiltros();

    abrirPanel();
    expect(botonFiltros()).toHaveAttribute("aria-expanded", "true");
    expect(panelEstaCerrado()).toBe(false);

    abrirPanel();
    expect(botonFiltros()).toHaveAttribute("aria-expanded", "false");
    expect(panelEstaCerrado()).toBe(true);
  });

  it("cierra el panel con Escape", () => {
    renderFiltros();
    abrirPanel();

    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });

    expect(botonFiltros()).toHaveAttribute("aria-expanded", "false");
    expect(panelEstaCerrado()).toBe(true);
  });

  it("cierra el panel al clickear fuera", () => {
    renderFiltros();
    abrirPanel();

    act(() => {
      fireEvent.mouseDown(document.body);
    });

    expect(panelEstaCerrado()).toBe(true);
  });

  it("cuenta los filtros activos, sin contar la búsqueda libre", () => {
    // La búsqueda queda afuera del panel y se ve sola en el input: sumarla al
    // contador del botón le atribuiría al panel un filtro que no contiene.
    renderFiltros({ categoria: "2", minPrecio: "1000", search: "reloj" });

    expect(botonFiltros()).toHaveTextContent("2");
  });

  it("no muestra contador cuando no hay filtros de panel aplicados", () => {
    renderFiltros({ search: "reloj" });

    expect(botonFiltros()).not.toHaveTextContent(/\d/);
  });
});

describe("FiltrosCatalogo — precio con debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no avisa al padre en cada tecla: commitea una sola vez tras la pausa", () => {
    const { onChangeMaxPrecio } = renderFiltros();
    abrirPanel();

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
    abrirPanel();

    const campo = screen.getAllByLabelText("Precio min.")[0];
    tipear(campo, "2500");

    // El input no puede sentirse trabado: el formateo local es inmediato,
    // lo único diferido es el aviso al padre.
    expect(campo).toHaveValue("2.500");
  });

  it("commitea el vaciado del campo para que el filtro se saque", () => {
    const { onChangeMinPrecio } = renderFiltros({ minPrecio: "2500" });
    abrirPanel();

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
        titulo="Todos los productos"
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
    abrirPanel();

    // El `<select>` emite un cambio por selección, no por tecla: diferirlo
    // solo agregaría latencia sin ahorrar ninguna request.
    act(() => {
      fireEvent.change(screen.getAllByLabelText("Categoría")[0], { target: { value: "2" } });
    });

    expect(onChangeCategoria).toHaveBeenCalledWith("2");
  });

  it("Limpiar cancela un precio tipeado que todavía no se había commiteado", () => {
    // La carrera fina de este panel: los filtros se aplican EN VIVO, así que
    // "limpiar" es avisar `""` al padre. Pero si el precio venía vacío, ese
    // aviso no cambia ninguna prop y el `CampoPrecio` no se entera — su
    // temporizador pendiente seguía vivo y commiteaba el valor tipeado
    // DESPUÉS de limpiar, con el panel ya cerrado: un filtro apareciendo de
    // la nada. Se resuelve remontando los campos (cambio de `key`), que es
    // lo que cancela el temporizador en el cleanup del efecto.
    const { onChangeMinPrecio } = renderFiltros();
    abrirPanel();

    tipear(screen.getAllByLabelText("Precio min.")[0], "150000");

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));
    });
    avanzarPastLaPausa();

    expect(onChangeMinPrecio).not.toHaveBeenCalledWith("150000");
  });
});

describe("FiltrosCatalogo — acciones del panel", () => {
  it("Aplicar cierra el panel", () => {
    // Los filtros ya viajaron al padre mientras se tocaban (aplicación en
    // vivo): este botón confirma y cierra, no dispara el filtrado.
    renderFiltros();
    abrirPanel();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /aplicar/i }));
    });

    expect(botonFiltros()).toHaveAttribute("aria-expanded", "false");
    expect(panelEstaCerrado()).toBe(true);
  });

  it("Limpiar delega en UNA sola operación del padre y cierra", () => {
    // Deliberadamente NO llama a los tres `onChange…` por separado. Cada uno
    // escribe en el router, y `setSearchParams` no encola actualizaciones
    // funcionales como `useState`: las tres parten del mismo snapshot del
    // render y gana la última, así que borrar tres claves aplicaba una sola.
    // Verificado en el navegador: la URL quedaba idéntica tras "Limpiar".
    const { onLimpiarFiltros, onChangeCategoria, onChangeMinPrecio, onChangeMaxPrecio } = renderFiltros({
      categoria: "2",
      minPrecio: "1000",
      maxPrecio: "5000",
    });
    abrirPanel();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));
    });

    expect(onLimpiarFiltros).toHaveBeenCalledTimes(1);
    expect(onChangeCategoria).not.toHaveBeenCalled();
    expect(onChangeMinPrecio).not.toHaveBeenCalled();
    expect(onChangeMaxPrecio).not.toHaveBeenCalled();
    expect(panelEstaCerrado()).toBe(true);
  });

  it("Limpiar NO toca la búsqueda libre", () => {
    // El buscador vive afuera del panel y no entra en el contador del botón:
    // borrarlo desde acá haría desaparecer texto que la persona está viendo
    // en otro control, sin haberlo pedido.
    const { onChangeSearch } = renderFiltros({ search: "reloj", categoria: "2" });
    abrirPanel();

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /limpiar/i }));
    });

    expect(onChangeSearch).not.toHaveBeenCalled();
  });
});

describe("FiltrosCatalogo — chips de filtros aplicados", () => {
  function listaChips() {
    return screen.queryByRole("list", { name: /filtros aplicados/i });
  }

  it("no renderiza la barra de chips cuando no hay filtros de panel", () => {
    // La búsqueda libre no cuenta: ya se ve escrita en su propio input, y un
    // chip sería el mismo dato dos veces en la misma barra.
    renderFiltros({ search: "reloj" });

    expect(listaChips()).not.toBeInTheDocument();
  });

  it("muestra un chip por filtro, con el NOMBRE de la categoría y no su id", () => {
    renderFiltros({ categoria: "2", minPrecio: "1000", maxPrecio: "5000" });

    const chips = screen.getAllByRole("listitem");

    expect(chips).toHaveLength(3);
    expect(listaChips()).toHaveTextContent("Bolsos");
    expect(listaChips()).toHaveTextContent("Desde $ 1.000");
    expect(listaChips()).toHaveTextContent("Hasta $ 5.000");
  });

  it("una categoría que todavía no cargó no rompe el chip", () => {
    // `categorias` llega por fetch: entre el mount y su respuesta, el id de la
    // URL no resuelve a ningún nombre. El chip tiene que seguir siendo
    // removible en vez de renderizar "undefined".
    renderFiltros({ categorias: [], categoria: "99" });

    expect(listaChips()).toBeInTheDocument();
    expect(listaChips()).not.toHaveTextContent("undefined");
  });

  it("quitar un chip avisa SOLO ese filtro", () => {
    const { onChangeMinPrecio, onChangeCategoria, onChangeMaxPrecio } = renderFiltros({
      categoria: "2",
      minPrecio: "1000",
      maxPrecio: "5000",
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /quitar filtro: desde/i }));
    });

    expect(onChangeMinPrecio).toHaveBeenCalledWith("");
    expect(onChangeCategoria).not.toHaveBeenCalled();
    expect(onChangeMaxPrecio).not.toHaveBeenCalled();
  });

  it("los chips se ven con el panel cerrado", () => {
    // Son el resumen de lo que está filtrando la grilla: si sólo se vieran
    // con el panel abierto no informarían nada que el panel no muestre ya.
    renderFiltros({ categoria: "2" });

    expect(botonFiltros()).toHaveAttribute("aria-expanded", "false");
    expect(listaChips()).toBeInTheDocument();
    expect(listaChips().closest("[inert]")).toBeNull();
  });
});
