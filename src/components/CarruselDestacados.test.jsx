import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import CarruselDestacados from "./CarruselDestacados.jsx";

// Sin prefijo "use": oxlint (`rules-of-hooks`) trata como Hook a cualquier
// identificador que empiece así — mismo criterio que `BotonAgregar.test.jsx`.
const agregarMock = vi.fn();
vi.mock("../hooks/useCarrito.js", () => ({
  default: () => ({ carrito: [], agregar: agregarMock, cantidadTotal: 0 }),
}));

function renderComponente(productos) {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <CarruselDestacados productos={productos} />
      </ToastProvider>
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
    producto(1, "Set de Café", {
      etiqueta: { id: 1, nombre: "Nuevo", colorFondo: null, colorTexto: null },
      fotos: [{ url: "http://x/1.jpg" }],
    }),
    producto(2, "Organizador Focus", { fotos: [{ url: "http://x/2.jpg" }] }),
    producto(3, "Lámpara Aura", { fotos: [{ url: "http://x/3.jpg" }] }),
    producto(4, "Kit Regalo", {
      etiqueta: { id: 2, nombre: "Exclusivo", colorFondo: null, colorTexto: null },
      fotos: [{ url: "http://x/4.jpg" }],
    }),
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

  it("no expone el corazón dos veces a asistencia, aunque el clon lo duplique en el DOM", () => {
    renderComponente(cuatroDestacados());

    // `ProductCard` es compartido y no tiene una variante "sin corazón": el
    // juego decorativo SÍ repite el botón en el DOM (uno por cada
    // `ProductCard` clonado). Lo que sigue valiendo es que a un lector de
    // pantalla o al tabulado le llegue uno solo por producto — eso lo cubre
    // el `aria-hidden`/`inert` del envoltorio del clon, no la ausencia del
    // botón.
    const corazonesAccesibles = screen.getAllByRole("button", { name: /favoritos/i });
    expect(corazonesAccesibles).toHaveLength(4);

    // Con `hidden: true` sí aparece el doble: 4 reales + 4 del juego clonado.
    const corazonesEnElDom = screen.getAllByRole("button", { name: /favoritos/i, hidden: true });
    expect(corazonesEnElDom).toHaveLength(8);
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

describe("CarruselDestacados — arrastre", () => {
  /** La pista scrolleable: es la región etiquetada que envuelve al track. */
  function obtenerPista() {
    return screen.getByRole("region", { name: /productos destacados/i });
  }

  it("la pista es scrolleable y arrastrable, no una animación CSS", () => {
    renderComponente(cuatroDestacados());
    const pista = obtenerPista();

    // El motor es el scroll nativo: es lo que permite que el arrastre, la
    // inercia y las flechas convivan sin pelearse por el mismo `transform`.
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
        <ToastProvider>
          <CarruselDestacados productos={productos} />
          <Espia />
        </ToastProvider>
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

  it("un tap limpio en Agregar dentro del carrusel suma al carrito, sin cancelarlo un drag previo", async () => {
    agregarMock.mockClear();
    renderComponente(cuatroDestacados().map((p) => ({ ...p, stock: 10 })));

    // `userEvent.click` dispara pointerdown/pointerup sobre el botón, que
    // burbujean hasta la pista: es el mismo recorrido que un tap real.
    await userEvent.click(screen.getAllByRole("button", { name: "Agregar" })[0]);

    expect(agregarMock).toHaveBeenCalledWith(1, 1);
  });

  it("un arrastre real sobre la tarjeta cancela el click de Agregar, igual que cancela la navegación", () => {
    agregarMock.mockClear();
    renderComponente(cuatroDestacados().map((p) => ({ ...p, stock: 10 })));
    const pista = obtenerPista();
    const boton = screen.getAllByRole("button", { name: "Agregar" })[0];

    fireEvent.pointerDown(pista, { button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(pista, { pointerId: 1, clientX: 200 });
    fireEvent.pointerUp(pista, { pointerId: 1, clientX: 200 });
    fireEvent.click(boton);

    // Soltar el dedo sobre "Agregar" después de girar el carrusel no puede
    // meter un producto al carrito que nadie pidió.
    expect(agregarMock).not.toHaveBeenCalled();
  });

  it("el botón Agregar del clon decorativo queda fuera de asistencia y del tabulado (inert)", () => {
    renderComponente(cuatroDestacados().map((p) => ({ ...p, stock: 10 })));

    // Sin `hidden: true`, Testing Library omite el subárbol `aria-hidden`.
    expect(screen.getAllByRole("button", { name: "Agregar" })).toHaveLength(4);

    // En el DOM están los 8. jsdom no implementa `inert` (gotcha de
    // testing.md), así que se afirma el atributo: los 4 de más viven bajo un
    // envoltorio inerte, y los 4 accesibles no.
    const enElDom = screen.getAllByRole("button", { name: "Agregar", hidden: true });
    expect(enElDom).toHaveLength(8);
    const inertes = enElDom.filter((b) => b.closest("[inert]"));
    expect(inertes).toHaveLength(4);
    for (const boton of screen.getAllByRole("button", { name: "Agregar" })) {
      expect(boton.closest("[inert]")).toBeNull();
    }
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

  it("no se mueve solo: sin gesto, el scrollLeft no cambia con el tiempo", () => {
    // Spec §3 Destacados: SIN autoplay, avanza solo con flechas o deslizando.
    const reloj = tomarControlDelTiempo();
    try {
      renderComponente(cuatroDestacados());
      const pista = obtenerPista();
      Object.defineProperty(pista, "scrollWidth", { value: 4000, configurable: true });
      pista.scrollLeft = 500;

      // Tres segundos de frames sin ningún gesto.
      for (let i = 0; i < 180; i++) reloj.avanzar(16);

      expect(pista.scrollLeft).toBe(500);
    } finally {
      reloj.restaurar();
    }
  });

  it("sigue desplazándose después de soltar un swipe rápido", () => {
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

      // Sin inercia el carrusel quedaría quieto al soltar: un avance de este
      // orden solo lo da el momentum del gesto.
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

      // Sin arrastre no hay momentum, y sin autoplay nada más lo mueve.
      expect(pista.scrollLeft).toBe(antes);
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

describe("CarruselDestacados — flechas", () => {
  function obtenerPista() {
    return screen.getByRole("region", { name: /productos destacados/i });
  }

  /** jsdom no hace layout ni implementa `scrollBy` en elementos: se declaran a mano. */
  function prepararPista({ scrollLeft = 0 } = {}) {
    const pista = obtenerPista();
    Object.defineProperty(pista, "scrollWidth", { value: 4000, configurable: true });
    pista.scrollLeft = scrollLeft;
    pista.scrollBy = vi.fn();
    for (const envoltorio of pista.querySelectorAll("[data-tarjeta-carrusel]")) {
      Object.defineProperty(envoltorio, "offsetWidth", { value: 260, configurable: true });
    }
    return pista;
  }

  it("las flechas avanzan/retroceden una tanda de tres tarjetas", async () => {
    renderComponente(cuatroDestacados());
    const pista = prepararPista({ scrollLeft: 1000 });

    await userEvent.click(screen.getByRole("button", { name: "Siguientes" }));
    expect(pista.scrollBy).toHaveBeenLastCalledWith({ left: 780, behavior: "smooth" });

    await userEvent.click(screen.getByRole("button", { name: "Anteriores" }));
    expect(pista.scrollBy).toHaveBeenLastCalledWith({ left: -780, behavior: "smooth" });
  });

  it("Anteriores desde el inicio rebobina a la mitad antes de desplazar: el loop sigue siendo infinito", async () => {
    renderComponente(cuatroDestacados());
    const pista = prepararPista({ scrollLeft: 0 });

    await userEvent.click(screen.getByRole("button", { name: "Anteriores" }));

    // `scrollLeft` está clampeado a >= 0: sin el salto previo a la segunda
    // copia (vista idéntica), la flecha no haría nada en el primer uso.
    expect(pista.scrollLeft).toBe(2000);
    expect(pista.scrollBy).toHaveBeenLastCalledWith({ left: -780, behavior: "smooth" });
  });

  it("las flechas están ocultas en mobile (mismo criterio que el mockup, `hidden md:flex`)", () => {
    renderComponente(cuatroDestacados());

    // jsdom no aplica @media: se prueba el markup del que depende el CSS.
    const contenedor = screen.getByRole("button", { name: "Siguientes" }).parentElement;
    expect(contenedor).toBe(screen.getByRole("button", { name: "Anteriores" }).parentElement);
    expect(contenedor.className.split(" ")).toEqual(expect.arrayContaining(["hidden", "md:flex"]));
  });
});
