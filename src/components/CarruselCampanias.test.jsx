import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CarruselCampanias, { claveDeSlide } from "./CarruselCampanias.jsx";

const registrarEventoComercialMock = vi.fn();
vi.mock("../api/campanias.js", () => ({
  registrarEventoComercial: (...args) => registrarEventoComercialMock(...args),
}));

/**
 * La forma que emite `aSlideCampania` desde el 06/09/2026: sin `ctaTexto` y sin
 * `color`. El slide entero es el enlace, así que lo único que decide si navega
 * es `ctaDestino`.
 */
function slide(n, extra = {}) {
  return {
    tipo: "CAMPANIA",
    campaniaId: n,
    titulo: `Campaña ${n}`,
    texto: null,
    ctaDestino: null,
    arteUrl: null,
    doodleUrl: null,
    ...extra,
  };
}

function slidePromocion(n, extra = {}) {
  // Todo slide de promoción viaja con `campaniaId: null`: es el backend el
  // que discrimina campaña de promoción por `tipo`, nunca por `campaniaId`.
  return {
    tipo: "PROMOCION",
    campaniaId: null,
    promocionId: n,
    titulo: `Promoción ${n}`,
    texto: null,
    ctaDestino: null,
    arteUrl: null,
    doodleUrl: null,
    ...extra,
  };
}

function renderCarrusel(slides) {
  return render(
    <MemoryRouter>
      <CarruselCampanias slides={slides} />
    </MemoryRouter>,
  );
}

/** Sin movimiento reducido, para que la rotación arranque en los tests. */
function conMovimiento(reduce = false) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes("reduce") ? reduce : false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  conMovimiento(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CarruselCampanias", () => {
  it("sin slides no renderiza nada", () => {
    const { container } = renderCarrusel([]);

    expect(container).toBeEmptyDOMElement();
  });

  it("con UN slide no pinta la fila de control: ni flechas ni puntos", () => {
    // Un carrusel de un elemento es un banner. Los puntos serían adorno que
    // miente y una flecha que vuelve al mismo slide es un control roto.
    renderCarrusel([slide(1)]);

    expect(screen.getByText("Campaña 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /siguiente/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /anterior/i })).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("con dos slides aparecen las flechas y los puntos", () => {
    renderCarrusel([slide(1), slide(2)]);

    expect(screen.getByRole("button", { name: /siguiente/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /anterior/i })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("la flecha siguiente avanza", async () => {
    const usuario = userEvent.setup();
    renderCarrusel([slide(1), slide(2)]);

    await usuario.click(screen.getByRole("button", { name: /siguiente/i }));

    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");
  });

  it("desde el PRIMER slide, anterior va al último", async () => {
    // Circular en las dos puntas: un control que se deshabilita en los
    // extremos obliga a mirar si todavía sirve antes de tocarlo.
    const usuario = userEvent.setup();
    renderCarrusel([slide(1), slide(2), slide(3)]);

    await usuario.click(screen.getByRole("button", { name: /anterior/i }));

    expect(screen.getAllByRole("tab")[2]).toHaveAttribute("aria-current", "true");
  });

  it("rota sola a los 5 segundos", () => {
    // Solo `Date` y timers: en este archivo no hay servidor HTTP, así que
    // faquear todo es seguro. Ver el gotcha de supertest en CLAUDE.md.
    vi.useFakeTimers();
    renderCarrusel([slide(1), slide(2)]);

    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-current", "true");
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");
  });

  it("NO rota con prefers-reduced-motion", () => {
    conMovimiento(true);
    vi.useFakeTimers();
    renderCarrusel([slide(1), slide(2)]);

    act(() => {
      vi.advanceTimersByTime(15000);
    });

    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-current", "true");
  });

  it("una flecha REINICIA el temporizador", () => {
    // Si adelantás a mano y 200 ms después el salto automático te saca de la
    // pantalla lo que fuiste a buscar, el carrusel te está peleando.
    //
    // `fireEvent.click`, NO `usuario.click` de user-event: `usuario.click`
    // sintetiza un hover ANTES del click (dispara `pointerenter` sobre la
    // `<section>`), lo que frena el carrusel por `frenado = true` y hace que
    // el test "pase" aunque alguien saque `indice` de las dependencias del
    // efecto de rotación — el clamp del temporizador nunca se ejercita
    // porque el `useEffect` ya cortó por el `if (!hayControles || frenado)`.
    // `fireEvent.click` dispara el evento pelado, sin puntero de por medio.
    vi.useFakeTimers();
    renderCarrusel([slide(1), slide(2), slide(3)]);

    act(() => {
      vi.advanceTimersByTime(4800);
    });
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");

    // Si el temporizador NO se reinició, a los 200 ms ya estaría en el tercero.
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");
  });

  it("los puntos son botones con nombre accesible", () => {
    renderCarrusel([slide(1), slide(2)]);

    expect(screen.getByRole("tab", { name: "Ir al slide 1 de 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ir al slide 2 de 2" })).toBeInTheDocument();
  });

  it("se frena al entrar el puntero y retoma al salir", () => {
    // Los cuatro handlers (`onPointerEnter/Leave`, `onFocus/Blur`) no tenían
    // ningún test: si alguien los borrara, la suite seguía verde y el
    // carrusel le pisaría al visitante el slide que está mirando o tocando.
    vi.useFakeTimers();
    renderCarrusel([slide(1), slide(2)]);
    const seccion = screen.getByRole("region", { name: "Campañas y ofertas" });

    fireEvent.pointerEnter(seccion);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Frenado: pasaron los 5 s y sigue en el primero.
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-current", "true");

    fireEvent.pointerLeave(seccion);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Al salir el puntero, retoma la rotación.
    expect(screen.getAllByRole("tab")[1]).toHaveAttribute("aria-current", "true");
  });

  it("si la lista se acorta, un índice que quedó afuera cae al primero", () => {
    // El invariante del plan: la campaña que estaba tercera puede terminar
    // entre dos cargas de la home. Sin el clamp, el carrusel se queda
    // apuntando a un slide que ya no existe y no pinta nada.
    const { rerender } = renderCarrusel([slide(1), slide(2), slide(3)]);

    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(screen.getAllByRole("tab")[2]).toHaveAttribute("aria-current", "true");

    // La campaña que ocupaba el tercer lugar terminó: la próxima carga llega
    // con dos slides nomás.
    rerender(
      <MemoryRouter>
        <CarruselCampanias slides={[slide(1), slide(2)]} />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("tab")[0]).toHaveAttribute("aria-current", "true");
  });

  it("el slide oculto queda inert; el activo no", () => {
    // jsdom y Testing Library no implementan `inert`: `getByRole` encuentra
    // igual el link dentro del subárbol inerte. Por eso esto verifica el
    // ATRIBUTO en el DOM, no que el link sea intabulable de verdad.
    //
    // El link se busca por el TÍTULO: desde el 06/09/2026 el enlace es el slide
    // entero y su nombre accesible sale de `aria-label={slide.titulo}`, no del
    // texto del CTA.
    renderCarrusel([slide(1, { ctaDestino: "/coleccion" }), slide(2, { ctaDestino: "/coleccion" })]);

    const linkActivo = screen.getByRole("link", { name: "Campaña 1" });
    // `hidden: true` porque el slide oculto lleva `aria-hidden`, que SÍ lo
    // saca del árbol de accesibilidad que consulta `getByRole` por defecto —
    // eso es independiente del gotcha de `inert` y siempre se comportó así.
    const linkOculto = screen.getByRole("link", { name: "Campaña 2", hidden: true });

    expect(linkActivo.closest("[inert]")).toBeNull();
    expect(linkOculto.closest("[inert]")).not.toBeNull();
  });

  it("cada slide con destino aporta UN solo link, nunca uno anidado", () => {
    // El CTA quedó como texto subrayado dentro del enlace grande. Si alguien lo
    // vuelve a envolver en un `<Link>`, el ancla anidada es HTML inválido y el
    // navegador cierra la primera: el slide deja de ser clickeable entero, sin
    // ningún error visible.
    renderCarrusel([slide(1, { ctaDestino: "/coleccion" }), slide(2, { ctaDestino: "/coleccion" })]);

    expect(screen.getAllByRole("link", { hidden: true })).toHaveLength(2);
  });

  it("dos slides de promoción (mismo campaniaId null) usan promocionId como key y renderizan los dos", () => {
    // Regresión: antes de usar `promocionId`, la key era
    // `campaniaId ?? tipo`, y dos slides PROMOCION comparten `campaniaId:
    // null` y `tipo: "PROMOCION"` → la misma key literal "PROMOCION" para los
    // dos. React no lanza por eso, pero deja de garantizar que reconcilie
    // cada nodo por separado; lo que sí podemos afirmar sin depender de eso
    // es que los DOS títulos llegan al DOM y hay dos tabs, uno por slide.
    renderCarrusel([slidePromocion(10), slidePromocion(20)]);

    expect(screen.getByText("Promoción 10")).toBeInTheDocument();
    expect(screen.getByText("Promoción 20", { selector: "p" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });
});

describe("impresiones del banner", () => {
  const slideCampania = {
    tipo: "CAMPANIA",
    campaniaId: 3,
    promocionId: null,
    titulo: "Primavera",
    texto: "Hasta 30%",
    ctaDestino: "/coleccion?campania=3",
    ctaTipo: "CAMPANIA",
    arteUrl: null,
    doodleUrl: null,
  };
  const slidePromocion = {
    tipo: "PROMOCION",
    campaniaId: null,
    promocionId: 3,
    titulo: "Liquidación",
    texto: "2x1",
    ctaDestino: "/coleccion?promocion=3",
    ctaTipo: "PROMOCION",
    arteUrl: null,
    doodleUrl: null,
  };

  beforeEach(() => {
    registrarEventoComercialMock.mockClear();
  });

  it("registra la impresión del slide activo al montar", () => {
    render(
      <MemoryRouter>
        <CarruselCampanias slides={[slideCampania, slidePromocion]} />
      </MemoryRouter>,
    );

    expect(registrarEventoComercialMock).toHaveBeenCalledTimes(1);
    expect(registrarEventoComercialMock).toHaveBeenCalledWith({
      tipo: "IMPRESION_COMERCIAL",
      origen: "BANNER",
      campaniaId: 3,
      promocionId: null,
    });
  });

  it("al pasar al siguiente registra el segundo", async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <CarruselCampanias slides={[slideCampania, slidePromocion]} />
      </MemoryRouter>,
    );

    await usuario.click(screen.getByRole("button", { name: "Slide siguiente" }));

    expect(registrarEventoComercialMock).toHaveBeenCalledTimes(2);
    expect(registrarEventoComercialMock).toHaveBeenLastCalledWith({
      tipo: "IMPRESION_COMERCIAL",
      origen: "BANNER",
      campaniaId: null,
      promocionId: 3,
    });
  });

  it("volver a un slide ya visto NO lo cuenta de nuevo", async () => {
    const usuario = userEvent.setup();
    render(
      <MemoryRouter>
        <CarruselCampanias slides={[slideCampania, slidePromocion]} />
      </MemoryRouter>,
    );

    await usuario.click(screen.getByRole("button", { name: "Slide siguiente" }));
    await usuario.click(screen.getByRole("button", { name: "Slide anterior" }));

    expect(registrarEventoComercialMock).toHaveBeenCalledTimes(2);
  });

  it("sin slides no registra nada", () => {
    render(
      <MemoryRouter>
        <CarruselCampanias slides={[]} />
      </MemoryRouter>,
    );

    expect(registrarEventoComercialMock).not.toHaveBeenCalled();
  });
});

describe("claveDeSlide", () => {
  it("no colisiona una campaña y una promoción con el mismo id", () => {
    expect(claveDeSlide({ tipo: "CAMPANIA", campaniaId: 3, promocionId: null })).not.toBe(
      claveDeSlide({ tipo: "PROMOCION", campaniaId: null, promocionId: 3 }),
    );
  });
});
