import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BarraAnuncios from "./BarraAnuncios.jsx";
import * as anunciosApi from "../api/anuncios.js";

vi.mock("../api/anuncios.js");

/** Espejo de `VELOCIDAD_PX_S` en el componente. */
const VELOCIDAD_PX_S = 55;

const ANUNCIOS = [
  { id: 1, texto: "Encontrá productos que no sabías que necesitabas", activo: true, orden: 0 },
  { id: 2, texto: "Envíos a todo el país, coordinamos por WhatsApp", activo: true, orden: 1 },
];
const PRIMER_MENSAJE = ANUNCIOS[0].texto;

function renderBarra(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <BarraAnuncios />
    </MemoryRouter>,
  );
}

/**
 * jsdom no hace layout: todo `offsetWidth` es 0, y con eso el componente no
 * puede medir nada. Este stub le da un ancho al contenedor y otro al grupo para
 * poder ejercitar el cálculo de repeticiones, que es la invariante que sostiene
 * la cinta — sin él, los únicos casos alcanzables serían los de "no se pudo
 * medir".
 */
function stubAnchos({ contenedor, grupo }) {
  const previo = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      if (this.classList.contains("bg-surface-container-high")) return contenedor;
      if (this.classList.contains("items-center") && this.classList.contains("shrink-0")) {
        return grupo;
      }
      return 0;
    },
  });
  return () => {
    if (previo) Object.defineProperty(HTMLElement.prototype, "offsetWidth", previo);
    else delete HTMLElement.prototype.offsetWidth;
  };
}

/**
 * `matchMedia` no existe en jsdom, y el componente ya lo lee con encadenamiento
 * opcional (mismo guard que `CarruselDestacados`). Este helper lo instala para
 * poder ejercitar las DOS ramas: con y sin `prefers-reduced-motion`.
 */
function instalarMatchMedia(reduce) {
  const previo = Object.getOwnPropertyDescriptor(window, "matchMedia");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (consulta) => ({
      matches: consulta.includes("prefers-reduced-motion") ? reduce : false,
      media: consulta,
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  return () => {
    if (previo) Object.defineProperty(window, "matchMedia", previo);
    else delete window.matchMedia;
  };
}

/** `ResizeObserver` tampoco existe en jsdom y el componente lo construye sin guardas. */
function instalarResizeObserver() {
  const instancias = [];
  const previo = Object.getOwnPropertyDescriptor(window, "ResizeObserver");
  class ResizeObserverFalso {
    constructor(cb) {
      this.cb = cb;
      this.observados = [];
      this.desconectado = false;
      instancias.push(this);
    }
    observe(el) {
      this.observados.push(el);
    }
    disconnect() {
      this.desconectado = true;
    }
  }
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverFalso,
  });
  globalThis.ResizeObserver = ResizeObserverFalso;
  return {
    instancias,
    restaurar() {
      if (previo) Object.defineProperty(window, "ResizeObserver", previo);
      else delete window.ResizeObserver;
      delete globalThis.ResizeObserver;
    },
  };
}

function pista(container) {
  return container.querySelector(".flex.w-max");
}

describe("BarraAnuncios", () => {
  let observer;
  let restaurarAnchos = () => {};

  beforeEach(() => {
    vi.clearAllMocks();
    observer = instalarResizeObserver();
    anunciosApi.getAnuncios.mockResolvedValue(ANUNCIOS);
  });

  afterEach(() => {
    restaurarAnchos();
    restaurarAnchos = () => {};
    observer.restaurar();
  });

  it("muestra los anuncios que devuelve la API", async () => {
    renderBarra();

    for (const anuncio of ANUNCIOS) {
      expect((await screen.findAllByText(anuncio.texto)).length).toBeGreaterThan(0);
    }
  });

  /**
   * **La regresión que este test existe para evitar.** Duplicar el grupo alcanza
   * solo si UN grupo ya llena la barra. Con pocos anuncios la pista queda más
   * angosta que el contenedor y se ve un hueco fijo a la derecha que nunca se
   * completa — la cinta parece rota aunque se esté moviendo.
   */
  it("repite el grupo hasta que media pista cubre el ancho de la barra", async () => {
    restaurarAnchos = stubAnchos({ contenedor: 1000, grupo: 250 });
    const { container } = renderBarra();

    // ceil(1000 / 250) = 4 repeticiones → 8 grupos en total.
    await waitFor(() => expect(pista(container).children).toHaveLength(8));
  });

  it("con un grupo que ya cubre la barra, no repite de más", async () => {
    restaurarAnchos = stubAnchos({ contenedor: 300, grupo: 400 });
    const { container } = renderBarra();

    await waitFor(() => expect(pista(container).children).toHaveLength(2));
  });

  // La repetición es puramente visual: un lector de pantalla tiene que escuchar
  // cada anuncio UNA vez, no tantas como copias hicieron falta para llenar el
  // ancho.
  it("solo el primer grupo es legible; el resto va aria-hidden", async () => {
    restaurarAnchos = stubAnchos({ contenedor: 1000, grupo: 250 });
    const { container } = renderBarra();

    await waitFor(() => expect(pista(container).children).toHaveLength(8));
    const grupos = [...pista(container).children];
    expect(grupos.filter((g) => !g.hasAttribute("aria-hidden"))).toHaveLength(1);
    expect(grupos[0].textContent).toContain(PRIMER_MENSAJE);
  });

  // La duración sale de `distancia / velocidad`, no de una constante: con una
  // duración fija, agregar un anuncio aceleraría el texto. La distancia es media
  // pista, o sea `repeticiones * anchoGrupo`.
  it("la duración mantiene la velocidad constante", async () => {
    restaurarAnchos = stubAnchos({ contenedor: 1000, grupo: 250 });
    const { container } = renderBarra();

    await waitFor(() => expect(pista(container).children).toHaveLength(8));
    const esperada = (4 * 250) / VELOCIDAD_PX_S;
    expect(pista(container).style.animationDuration).toBe(`${esperada}s`);
  });

  // Sin poder medir no hay duración, y arrancar la animación sin ella dejaría la
  // pista ya desplazada por el default de 0s del navegador.
  it("no anima hasta poder medir", async () => {
    const { container } = renderBarra();

    await screen.findAllByText(PRIMER_MENSAJE);
    expect(pista(container).className).not.toContain("animate-marquee");
    expect(pista(container).style.animationDuration).toBe("");
  });

  // El contenedor cambia de ancho con la ventana, y de ahí sale cuántas
  // repeticiones hacen falta. Observar solo el grupo dejaría la cinta con un
  // hueco al agrandar la ventana.
  it("observa el contenedor además del grupo", async () => {
    restaurarAnchos = stubAnchos({ contenedor: 1000, grupo: 250 });
    renderBarra();

    await waitFor(() => expect(observer.instancias.length).toBeGreaterThan(0));
    expect(observer.instancias.at(-1).observados).toHaveLength(2);
  });

  it("con prefers-reduced-motion no repite el grupo ni anima", async () => {
    const restaurar = instalarMatchMedia(true);
    restaurarAnchos = stubAnchos({ contenedor: 1000, grupo: 250 });
    try {
      const { container } = renderBarra();

      await waitFor(() => expect(screen.getAllByText(PRIMER_MENSAJE)).toHaveLength(1));
      expect(pista(container).children).toHaveLength(1);

      // Y el desborde pasa a ser scrolleable: un mensaje más ancho que la
      // pantalla tiene que poder leerse igual.
      const contenedor = container.firstElementChild;
      expect(contenedor.className).toContain("overflow-x-auto");
      expect(contenedor.className).not.toContain("overflow-hidden");
    } finally {
      restaurar();
    }
  });

  // Una franja vacía empujando la página es peor que ninguna franja. Cubre los
  // tres casos que para el visitante son el mismo: todavía no cargó, el admin
  // los desactivó a todos, o falló la red.
  it("no renderiza nada si la API devuelve una lista vacía", async () => {
    anunciosApi.getAnuncios.mockResolvedValue([]);

    const { container } = renderBarra();

    await waitFor(() => expect(anunciosApi.getAnuncios).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  // Excepción CONSCIENTE a la regla de "distinguir falló-la-carga de no-hay-nada":
  // esa regla protege a las pantallas que venden. Un cartel de error permanente
  // arriba de todo el sitio, por una cinta decorativa, es peor que no mostrarla.
  it("un error de red no rompe la página: simplemente no hay cinta", async () => {
    anunciosApi.getAnuncios.mockRejectedValue(new Error("sin conexión"));

    const { container } = renderBarra();

    await waitFor(() => expect(anunciosApi.getAnuncios).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  // `/catalogo/admin/login` se renderiza dentro del mismo Layout que el
  // catálogo público: sin este guard, la cinta de marketing aparecería sobre la
  // pantalla de login del panel.
  it("no se renderiza en rutas de admin ni pide los anuncios", () => {
    const { container } = renderBarra("/catalogo/admin/login");

    expect(container).toBeEmptyDOMElement();
    expect(anunciosApi.getAnuncios).not.toHaveBeenCalled();
    expect(observer.instancias).toHaveLength(0);
  });

  it("desconecta el observer al desmontar", async () => {
    const { unmount } = renderBarra();

    await waitFor(() => expect(observer.instancias.length).toBeGreaterThan(0));
    unmount();

    expect(observer.instancias.at(-1).desconectado).toBe(true);
  });
});
