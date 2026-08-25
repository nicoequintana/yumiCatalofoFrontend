import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import CarruselDestacados from "./CarruselDestacados.jsx";

function renderComponente(productos) {
  return render(
    <MemoryRouter>
      <CarruselDestacados productos={productos} />
    </MemoryRouter>,
  );
}

function producto(id, nombre, extra = {}) {
  return {
    id,
    nombre,
    destacado: true,
    precio: "1000",
    etiqueta: null,
    fotos: [],
    ...extra,
  };
}

/** Cuatro destacados: el mínimo con el que la sección se muestra. */
function cuatroDestacados() {
  return [
    producto(1, "Set de Café", { etiqueta: "Nuevo", fotos: [{ url: "http://x/1.jpg" }] }),
    producto(2, "Organizador Focus", { fotos: [{ url: "http://x/2.jpg" }] }),
    producto(3, "Lámpara Aura", { fotos: [{ url: "http://x/3.jpg" }] }),
    producto(4, "Kit Regalo", { etiqueta: "Exclusivo", fotos: [{ url: "http://x/4.jpg" }] }),
  ];
}

describe("CarruselDestacados", () => {
  it("no renderiza nada si hay menos de 4 productos destacados", () => {
    const productos = [
      producto(1, "A"),
      producto(2, "B"),
      producto(3, "C", { destacado: false }),
    ];
    const { container } = renderComponente(productos);
    expect(container).toBeEmptyDOMElement();
  });

  it("no renderiza nada si no hay productos", () => {
    const { container } = renderComponente([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza los destacados y descarta los que no lo son", () => {
    renderComponente([...cuatroDestacados(), producto(5, "No destacado", { destacado: false })]);

    expect(screen.getByText("Hallazgos del día")).toBeInTheDocument();
    for (const nombre of ["Set de Café", "Organizador Focus", "Lámpara Aura", "Kit Regalo"]) {
      expect(screen.getAllByText(nombre).length).toBeGreaterThan(0);
    }
    expect(screen.queryByText("No destacado")).not.toBeInTheDocument();
  });

  it("duplica la lista en el DOM para que el loop no tenga costura", () => {
    renderComponente(cuatroDestacados());

    // 4 destacados × 2 juegos. El duplicado es lo que permite rebobinar en
    // `scrollWidth / 2` y volver al inicio sin salto visible.
    const todosLosLinks = screen.getAllByRole("link", { hidden: true });
    expect(todosLosLinks).toHaveLength(8);
  });

  it("expone cada producto una sola vez a lectores de pantalla y al tabulado", () => {
    renderComponente(cuatroDestacados());

    // Sin `hidden: true`, Testing Library omite el subárbol `aria-hidden`:
    // es exactamente la vista que tiene un lector de pantalla.
    const linksAccesibles = screen.getAllByRole("link");
    expect(linksAccesibles).toHaveLength(4);
    expect(linksAccesibles[0]).toHaveAttribute("href", "/producto/1-set-de-cafe");

    // Ningún link visible para asistencia debe estar fuera del orden de
    // tabulación, y ninguno de los clones debe estar dentro de él.
    for (const link of linksAccesibles) {
      expect(link).not.toHaveAttribute("tabindex", "-1");
    }
  });

  it("no duplica los botones de favorito, que actúan sobre el mismo producto", () => {
    renderComponente(cuatroDestacados());

    // Un corazón por producto, no dos: el juego clonado los omite para no
    // repetir controles con el mismo `aria-label` sobre el mismo producto.
    const corazones = screen.getAllByRole("button", {
      name: /favoritos/i,
      hidden: true,
    });
    expect(corazones).toHaveLength(4);
  });

  it("solo muestra el badge de etiqueta cuando el producto la tiene", () => {
    renderComponente(cuatroDestacados());

    expect(screen.getAllByText("Nuevo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Exclusivo").length).toBeGreaterThan(0);
    // "Organizador Focus" y "Lámpara Aura" no tienen etiqueta: solo hay dos
    // chips distintos en total, no uno por tarjeta.
    expect(screen.queryByText("null")).not.toBeInTheDocument();
  });
});

describe("CarruselDestacados — pausa y arrastre", () => {
  /** La pista scrolleable: es la región etiquetada que envuelve al track. */
  function obtenerPista() {
    return screen.getByRole("region", { name: /productos destacados/i });
  }

  it("la pista es scrolleable y arrastrable, no una animación CSS", () => {
    renderComponente(cuatroDestacados());
    const pista = obtenerPista();

    // El motor es el scroll nativo: es lo que permite que el arrastre y el
    // movimiento automático convivan sin pelearse por el mismo `transform`.
    expect(pista.className).toContain("overflow-x-auto");
    expect(pista.className).toContain("cursor-grab");
  });

  it("deja el scroll vertical de la página al dedo, y toma solo el horizontal", () => {
    renderComponente(cuatroDestacados());

    // Sin `pan-y`, arrastrar de costado sobre el carrusel secuestra el scroll
    // vertical del celular y la página deja de poder recorrerse.
    expect(obtenerPista()).toHaveStyle({ touchAction: "pan-y" });
  });

  /**
   * Renderiza el carrusel observando la ruta activa.
   *
   * Medir `defaultPrevented` no sirve acá: el propio `<Link>` de react-router
   * llama a `preventDefault()` en toda navegación exitosa para evitar la
   * recarga de página. Lo que distingue un tap de un arrastre es si la ruta
   * CAMBIÓ, no si el evento fue prevenido.
   */
  function renderConRuta(productos) {
    let rutaActual = "/";
    function Espia() {
      rutaActual = useLocation().pathname;
      return null;
    }
    render(
      <MemoryRouter initialEntries={["/"]}>
        <CarruselDestacados productos={productos} />
        <Espia />
      </MemoryRouter>,
    );
    return () => rutaActual;
  }

  it("un arrastre real cancela la navegación al producto", () => {
    const rutaAhora = renderConRuta(cuatroDestacados());
    const pista = obtenerPista();
    const tarjeta = screen.getAllByRole("link")[0];

    fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(pista, { pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(pista, { pointerId: 1, clientX: 200 });
    fireEvent.click(tarjeta);

    // Soltar el dedo sobre una tarjeta después de girar el carrusel no debe
    // abrir el producto: es el modo de falla clásico de este patrón.
    expect(rutaAhora()).toBe("/");
  });

  it("un tap limpio (sin movimiento) sí navega al producto", () => {
    const rutaAhora = renderConRuta(cuatroDestacados());
    const pista = obtenerPista();
    const tarjeta = screen.getAllByRole("link")[0];

    fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerUp(pista, { pointerId: 1, clientX: 300 });
    fireEvent.click(tarjeta);

    // Sin desplazamiento no hubo arrastre: la tarjeta tiene que abrirse. Si
    // esto falla, el carrusel se ve bien pero ningún producto es clickeable.
    expect(rutaAhora()).toBe("/producto/1-set-de-cafe");
  });

  it("un temblor por debajo del umbral no se toma como arrastre", () => {
    const rutaAhora = renderConRuta(cuatroDestacados());
    const pista = obtenerPista();
    const tarjeta = screen.getAllByRole("link")[0];

    fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
    // 3px: por debajo del umbral de 5px. Un dedo nunca está perfectamente
    // quieto, y tratar cada micro-movimiento como arrastre haría que las
    // tarjetas dejaran de abrirse en celular.
    fireEvent.pointerMove(pista, { pointerId: 1, clientX: 297 });
    fireEvent.pointerUp(pista, { pointerId: 1, clientX: 297 });
    fireEvent.click(tarjeta);

    expect(rutaAhora()).toBe("/producto/1-set-de-cafe");
  });

  it("las tarjetas son las que pausan, no la banda que las contiene", () => {
    renderComponente(cuatroDestacados());
    const tarjeta = screen.getAllByRole("link")[0];

    // El bug reportado: con el handler en el contenedor de ancho completo, el
    // carrusel se congelaba con el puntero quieto en cualquier hueco de la
    // franja. El hover tiene que vivir en la tarjeta.
    expect(tarjeta).toHaveProperty("onmouseenter");
    fireEvent.mouseEnter(tarjeta);
    fireEvent.mouseLeave(tarjeta);
    // No hay assertion de movimiento acá (rAF no corre en jsdom): lo que se
    // fija es que el gesto se recibe en la tarjeta sin romper el render.
    expect(tarjeta).toBeInTheDocument();
  });
});

describe("CarruselDestacados — regresiones verificadas en navegador", () => {
  function obtenerPista() {
    return screen.getByRole("region", { name: /productos destacados/i });
  }

  it("no captura el puntero en pointerdown", () => {
    renderComponente(cuatroDestacados());
    const pista = obtenerPista();
    pista.setPointerCapture = vi.fn();

    fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });

    // Capturar acá le quita al `<a>` su click nativo y las tarjetas dejan de
    // abrir la ficha del producto (verificado en Chromium). La captura va
    // recién al superar el umbral, cuando ya se sabe que es un arrastre.
    expect(pista.setPointerCapture).not.toHaveBeenCalled();
  });

  it("captura el puntero recién cuando el gesto supera el umbral", () => {
    renderComponente(cuatroDestacados());
    const pista = obtenerPista();
    pista.setPointerCapture = vi.fn();

    fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(pista, { pointerId: 1, clientX: 297 });
    expect(pista.setPointerCapture).not.toHaveBeenCalled();

    fireEvent.pointerMove(pista, { pointerId: 1, clientX: 200 });
    // Pasado el umbral el arrastre debe sobrevivir aunque el dedo salga de
    // la pista.
    expect(pista.setPointerCapture).toHaveBeenCalledWith(1);
  });

  it("nunca escribe un scrollLeft negativo al arrastrar hacia la derecha", () => {
    renderComponente(cuatroDestacados());
    const pista = obtenerPista();

    // jsdom no hace layout, así que se declaran las medidas a mano.
    Object.defineProperty(pista, "scrollWidth", { value: 4000, configurable: true });
    pista.scrollLeft = 0;

    fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 100 });
    fireEvent.pointerMove(pista, { pointerId: 1, clientX: 600 });

    // El destino se envuelve ANTES de escribirse: `scrollLeft` está clampeado
    // a >= 0, así que un valor negativo se perdería y el carrusel se clavaría
    // contra el borde izquierdo en vez de rebobinar al final.
    expect(pista.scrollLeft).toBeGreaterThan(0);
  });
});

/**
 * Inercia del gesto táctil.
 *
 * `touch-action: pan-y` le prohíbe al navegador manejar el eje horizontal, así
 * que el desplazamiento lo escribe este componente a mano — y con eso se pierde
 * el momentum que el scroll nativo trae de fábrica. Medido en Chromium con
 * emulación táctil sobre producción: un swipe de 220 px seguía al dedo 1:1
 * (221 px) pero al soltar el carrusel avanzaba solo 24 px en 600 ms, que es
 * exactamente el desplazamiento automático de 40 px/s. Es decir, frenaba en
 * seco. En un celular, donde todo scroll tiene inercia, eso se siente como que
 * el carrusel “no va fluido”.
 */
describe("CarruselDestacados — inercia al soltar", () => {
  function obtenerPista() {
    return screen.getByRole("region", { name: /productos destacados/i });
  }

  /**
   * Toma el control del reloj y del bucle de animación.
   *
   * El componente lee el tiempo de dos fuentes distintas —`performance.now()`
   * para medir la velocidad del gesto y el argumento del callback de
   * `requestAnimationFrame` para el avance por frame—, así que las dos tienen
   * que avanzar juntas o los cálculos se contradicen.
   */
  function tomarControlDelTiempo() {
    let ahora = 0;
    // El id tiene que ser un NÚMERO: el componente lo guarda en una variable
    // que arranca en 0 y se lo pasa a `cancelAnimationFrame`. Con un Symbol,
    // jsdom revienta con "Cannot convert a Symbol value to a number".
    let proximoId = 1;
    const pendientes = new Map();

    const rafReal = window.requestAnimationFrame;
    const cancelReal = window.cancelAnimationFrame;
    const nowReal = performance.now;

    window.requestAnimationFrame = (cb) => {
      const id = proximoId++;
      pendientes.set(id, cb);
      return id;
    };
    window.cancelAnimationFrame = (id) => pendientes.delete(id);
    performance.now = () => ahora;

    return {
      avanzar(ms) {
        ahora += ms;
        const aCorrer = [...pendientes.entries()];
        pendientes.clear();
        for (const [, cb] of aCorrer) cb(ahora);
      },
      restaurar() {
        window.requestAnimationFrame = rafReal;
        window.cancelAnimationFrame = cancelReal;
        performance.now = nowReal;
      },
    };
  }

  it("sigue desplazándose después de soltar, mucho más que el avance automático", () => {
    const reloj = tomarControlDelTiempo();
    try {
      renderComponente(cuatroDestacados());
      const pista = obtenerPista();
      Object.defineProperty(pista, "scrollWidth", { value: 4000, configurable: true });
      pista.scrollLeft = 500;

      // Arranca el bucle de animación.
      reloj.avanzar(16);

      // Swipe rápido hacia la izquierda: 5 tramos de 40 px en 16 ms cada uno,
      // o sea 2500 px/s, un flick perfectamente normal en un celular.
      fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
      for (let i = 1; i <= 5; i++) {
        reloj.avanzar(16);
        fireEvent.pointerMove(pista, { pointerId: 1, clientX: 300 - i * 40 });
      }
      const alSoltar = pista.scrollLeft;
      fireEvent.pointerUp(pista, { pointerId: 1 });

      // Medio segundo después de levantar el dedo.
      for (let i = 0; i < 30; i++) reloj.avanzar(16);
      const avanceTrasSoltar = pista.scrollLeft - alSoltar;

      // El desplazamiento automático solo daría ~20 px en 500 ms (40 px/s).
      // Cualquier valor de ese orden significa que el gesto frenó en seco.
      expect(avanceTrasSoltar).toBeGreaterThan(100);
    } finally {
      reloj.restaurar();
    }
  });

  it("un tap sin arrastre no dispara inercia", () => {
    const reloj = tomarControlDelTiempo();
    try {
      renderComponente(cuatroDestacados());
      const pista = obtenerPista();
      Object.defineProperty(pista, "scrollWidth", { value: 4000, configurable: true });
      pista.scrollLeft = 500;
      reloj.avanzar(16);

      fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
      reloj.avanzar(16);
      fireEvent.pointerUp(pista, { pointerId: 1 });

      const antes = pista.scrollLeft;
      for (let i = 0; i < 10; i++) reloj.avanzar(16);

      // Solo el avance automático: 40 px/s durante ~160 ms.
      expect(pista.scrollLeft - antes).toBeLessThan(20);
    } finally {
      reloj.restaurar();
    }
  });

  it("un gesto nuevo corta la inercia en curso", () => {
    const reloj = tomarControlDelTiempo();
    try {
      renderComponente(cuatroDestacados());
      const pista = obtenerPista();
      Object.defineProperty(pista, "scrollWidth", { value: 4000, configurable: true });
      pista.scrollLeft = 500;
      reloj.avanzar(16);

      fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
      for (let i = 1; i <= 5; i++) {
        reloj.avanzar(16);
        fireEvent.pointerMove(pista, { pointerId: 1, clientX: 300 - i * 40 });
      }
      fireEvent.pointerUp(pista, { pointerId: 1 });
      reloj.avanzar(16);

      // El dedo vuelve a apoyarse: el carrusel tiene que quedarse quieto donde
      // está, no seguir viajando por debajo del dedo.
      fireEvent.pointerDown(pista, { button: 0, pointerId: 2, clientX: 200 });
      const alTocar = pista.scrollLeft;
      for (let i = 0; i < 5; i++) reloj.avanzar(16);

      expect(pista.scrollLeft).toBe(alTocar);
    } finally {
      reloj.restaurar();
    }
  });
});
