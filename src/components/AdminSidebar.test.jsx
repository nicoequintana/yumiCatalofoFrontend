import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import AdminSidebar from "./AdminSidebar.jsx";

function renderSidebar() {
  return render(
    <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
      <AdminSidebar colapsada={false} onCerrar={() => {}} />
    </MemoryRouter>,
  );
}

describe("AdminSidebar", () => {
  /**
   * Las cinco pantallas de analítica ya no son links sueltos: viven adentro
   * del acordeón "Analítica" (mismo patrón que "Configuración"), colapsado
   * por defecto. Antes de desplegarlo, "Ventas" no es un link visible.
   */
  it("no muestra Ventas como link suelto antes de desplegar Analítica", () => {
    renderSidebar();

    expect(screen.queryByRole("link", { name: /ventas/i })).not.toBeInTheDocument();
  });

  it("el botón Analítica está en las dos navegaciones y despliega sus hijas al tocarlo", () => {
    renderSidebar();

    const botones = screen.getAllByRole("button", { name: /analítica/i });
    expect(botones).toHaveLength(2);

    for (const boton of botones) {
      fireEvent.click(boton);
    }

    const enlacesVentas = screen.getAllByRole("link", { name: /ventas/i });
    expect(enlacesVentas).toHaveLength(2);
    for (const enlace of enlacesVentas) {
      expect(enlace).toHaveAttribute("href", "/catalogo/admin/analytics/ventas");
    }
  });

  it("mantiene el resto de las entradas de navegación, sueltas y bajo Analítica", () => {
    renderSidebar();

    for (const etiqueta of [/productos/i, /órdenes/i, /logs/i]) {
      expect(screen.getAllByRole("link", { name: etiqueta })).toHaveLength(2);
    }

    for (const boton of screen.getAllByRole("button", { name: /analítica/i })) {
      fireEvent.click(boton);
    }

    for (const etiqueta of [/embudo/i, /clientes/i, /operación/i]) {
      expect(screen.getAllByRole("link", { name: etiqueta })).toHaveLength(2);
    }

    // "Métricas" (sola) y "Métricas comerciales" comparten la palabra: se
    // cuenta por el `href`, que es lo único que las distingue sin ambigüedad.
    const enlacesMetricas = screen
      .getAllByRole("link", { name: /métricas/i })
      .filter((enlace) => enlace.getAttribute("href") === "/catalogo/admin/analytics/metricas");
    expect(enlacesMetricas).toHaveLength(2);
  });

  // Los dos dropdowns de escritorio son `absolute` y centrados sobre botones
  // vecinos de la bottom nav: `w-52` (Analítica) y `w-44` (Configuración) se
  // pisan unos 60px si los dos quedan abiertos a la vez.
  it("abrir un dropdown de escritorio cierra el otro si estaba abierto", () => {
    renderSidebar();

    const [, analiticaEscritorio] = screen.getAllByRole("button", { name: /analítica/i });
    const [, configuracionEscritorio] = screen.getAllByRole("button", { name: /configuración/i });

    fireEvent.click(configuracionEscritorio);
    expect(configuracionEscritorio).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(analiticaEscritorio);
    expect(analiticaEscritorio).toHaveAttribute("aria-expanded", "true");
    expect(configuracionEscritorio).toHaveAttribute("aria-expanded", "false");
  });

  it("apunta la ruta nueva de analítica de campañas con un rótulo que no colisiona con el editor", () => {
    renderSidebar();

    for (const boton of screen.getAllByRole("button", { name: /analítica/i })) {
      fireEvent.click(boton);
    }

    // "Campañas" del editor (ITEMS_NAV) sigue existiendo aparte; esta es la
    // métrica, con rótulo propio para no repetir el mismo texto en el menú.
    const enlaces = screen.getAllByRole("link", { name: /métricas comerciales/i });
    expect(enlaces).toHaveLength(2);
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute("href", "/catalogo/admin/analytics/campanias");
    }

    const enlacesEditor = screen
      .getAllByRole("link", { name: /campañas/i })
      .filter((enlace) => enlace.getAttribute("href") === "/catalogo/admin/campanias");
    expect(enlacesEditor).toHaveLength(2);
  });
});

/**
 * Guard de no-regresión de `ITEMS_NAV`: no está exportado (no hace falta
 * fuera de este componente), así que se afirma indirectamente contando los
 * links de la bottom nav — que mapea ese mismo array 1:1, sin acordeones
 * mezclados adentro.
 *
 * Existe porque `e2e/admin-desktop-layout.spec.js` (el guard REAL del
 * breakpoint) está fuera del CI a propósito, y este archivo fija las clases
 * pero no el TAMAÑO de la barra. Sin este test, sumar un sexto ítem a
 * `ITEMS_NAV` deja la suite entera en verde y reabre el bug de "no se puede
 * cerrar sesión entre 1024 y N" descrito en el comentario del `<nav>` de
 * `AdminSidebar.jsx` — silencioso hasta que alguien lo mide en navegador.
 * **Si tocás `ITEMS_NAV`, corré `e2e/admin-desktop-layout.spec.js` antes de
 * mergear.**
 */
describe("AdminSidebar — ITEMS_NAV no crece en silencio", () => {
  it("la bottom nav tiene hoy cinco ítems sueltos (más los dos acordeones)", () => {
    const { container } = renderSidebar();
    const bottomNav = container.querySelector("nav.fixed.inset-x-0.bottom-0");

    // Los links directos de la bottom nav (no los de adentro de un dropdown,
    // que solo existen cuando el acordeón está abierto).
    const linksSueltos = within(bottomNav).getAllByRole("link");
    expect(linksSueltos).toHaveLength(5);
  });
});

/**
 * La asimetría heredada: el botón del acordeón, en el DRAWER, hardcodeaba
 * `linkInactivo` y nunca se pintaba activo estando en una hija. La bottom nav
 * sí lo hacía. Analítica nace ya simétrico en los dos lados, y Configuración
 * se corrige en el mismo cambio.
 */
describe("AdminSidebar — el botón del acordeón se pinta activo en una hija", () => {
  function renderEn(ruta) {
    return render(
      <MemoryRouter initialEntries={[ruta]}>
        <AdminSidebar colapsada={false} onCerrar={() => {}} />
      </MemoryRouter>,
    );
  }

  it("Analítica: el botón del drawer y el de la bottom nav se pintan activos", () => {
    const { container } = renderEn("/catalogo/admin/analytics/ventas");
    const aside = container.querySelector("aside");

    const [botonDrawer, botonBottomNav] = screen.getAllByRole("button", { name: /analítica/i });

    expect(aside.contains(botonDrawer)).toBe(true);
    expect(botonDrawer).toHaveClass("bg-primary", "text-on-primary");
    expect(botonBottomNav).toHaveClass("bg-primary", "text-on-primary");
  });

  it("Configuración: el botón del drawer y el de la bottom nav se pintan activos", () => {
    const { container } = renderEn("/catalogo/admin/configuracion/categorias");
    const aside = container.querySelector("aside");

    const [botonDrawer, botonBottomNav] = screen.getAllByRole("button", {
      name: /configuración/i,
    });

    expect(aside.contains(botonDrawer)).toBe(true);
    expect(botonDrawer).toHaveClass("bg-primary", "text-on-primary");
    expect(botonBottomNav).toHaveClass("bg-primary", "text-on-primary");
  });

  it("fuera de Analítica y de Configuración, ninguno de los dos botones se pinta activo", () => {
    renderEn("/catalogo/admin/productos");

    for (const boton of [
      ...screen.getAllByRole("button", { name: /analítica/i }),
      ...screen.getAllByRole("button", { name: /configuración/i }),
    ]) {
      expect(boton).not.toHaveClass("bg-primary", "text-on-primary");
    }
  });
});

/**
 * El corte entre drawer y bottom nav vivió en `min-[1360px]` entre el
 * 07/09/2026 y el 08/09/2026: con diez ítems la bottom nav medía 1326px de
 * ancho INTRÍNSECO y no tenía `flex-wrap` ni scroll, así que entre 1024
 * (donde `lg:flex` la encendía) y 1325 lo que sobraba se pintaba fuera del
 * viewport SIN generar scroll de documento — "Cerrar sesión" era
 * inalcanzable con el mouse por debajo de 1134px, y a 1024 ni el toggle de
 * tema ni el logout los devolvía `elementFromPoint`.
 *
 * La reorganización del 08/09/2026 (diez ítems → cinco más dos acordeones)
 * sacó la causa: medido en navegador, la barra vuelve a entrar entera a
 * 1024px. El corte volvió a `lg`, y estos tests afirman el contrato nuevo.
 *
 * jsdom no aplica `@media`, así que acá se fija el CONTRATO DE CLASES; la
 * medición real (entra + clickeable a 1024, 1100 y 1280) vive en
 * `e2e/admin-desktop-layout.spec.js`.
 */
describe("AdminSidebar — el corte entre drawer y bottom nav", () => {
  it("la bottom nav aparece en lg, no en min-[1360px]", () => {
    const { container } = renderSidebar();
    const bottomNav = container.querySelector("nav.fixed.inset-x-0.bottom-0");

    expect(bottomNav).not.toBeNull();
    expect(bottomNav).toHaveClass("lg:flex");
    expect(bottomNav).not.toHaveClass("min-[1360px]:flex");
  });

  it("el drawer sigue disponible por debajo de lg", () => {
    const { container } = renderSidebar();
    const aside = container.querySelector("aside");

    expect(aside).toHaveClass("lg:hidden");
    expect(aside).not.toHaveClass("min-[1360px]:hidden");
  });

  it("el overlay del drawer acompaña el mismo corte", () => {
    const { container } = renderSidebar();
    const overlay = container.querySelector("div.fixed.inset-0.z-40");

    expect(overlay).not.toBeNull();
    expect(overlay).toHaveClass("lg:hidden");
    expect(overlay).not.toHaveClass("min-[1360px]:hidden");
  });

  /**
   * Campañas y Promociones estaban filtradas del drawer porque su pantalla no
   * entra en un teléfono. Con el corte de vuelta en `lg`, el drawer y el
   * filtro `soloEscritorio` alternan en el MISMO umbral que usa
   * `SoloEscritorio` para dejar entrar a la pantalla — coincidencia de
   * número, no la misma pregunta (ver el comentario de `ITEMS_NAV` en
   * `AdminSidebar.jsx`). Se resuelven con el mismo mecanismo de siempre (flag
   * en el dato + CSS, nunca `matchMedia`): `hidden lg:flex`.
   */
  it("los módulos solo-escritorio están en el drawer, ocultos por debajo de lg", () => {
    const { container } = renderSidebar();
    const aside = container.querySelector("aside");

    for (const etiqueta of [/campañas/i, /promociones/i]) {
      const enElDrawer = screen
        .getAllByRole("link", { name: etiqueta })
        .find((enlace) => aside.contains(enlace));

      expect(enElDrawer, `${etiqueta} en el drawer`).toBeDefined();
      expect(enElDrawer).toHaveClass("hidden", "lg:flex");
    }
  });
});

/**
 * WCAG 2.2 SC 2.5.8 (Target Size, Minimum) pide 24px, pero el criterio del
 * proyecto —y el que mide `admin-mobile.spec.js`— es el de 44px de Apple/MDN.
 * Los controles del shell medían 42px de alto: dos píxeles de menos en TODAS
 * las pantallas del panel. `min-h-11` (44px) es el piso; el padding sigue
 * mandando cuando el contenido crece.
 */
describe("AdminSidebar — áreas táctiles del shell", () => {
  it("los enlaces, el acordeón y el logout del drawer declaran 44px de piso", () => {
    const { container } = renderSidebar();
    const aside = container.querySelector("aside");

    const controles = [
      ...aside.querySelectorAll("a"),
      ...aside.querySelectorAll("button"),
    ];

    expect(controles.length).toBeGreaterThan(0);
    for (const control of controles) {
      expect(control, control.textContent).toHaveClass("min-h-11");
    }
  });
});

describe("AdminSidebar — la sidebar mobile colapsada", () => {
  function renderConColapsada(colapsada) {
    return render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={colapsada} onCerrar={() => {}} />
      </MemoryRouter>,
    );
  }

  /**
   * jsdom no implementa `inert` (mismo gotcha que los CTA de la vista previa en
   * `FichaProducto`): `getByRole` sigue encontrando los enlaces de un subárbol
   * inerte. Por eso se verifica que el atributo esté aplicado; que además no sea
   * clickeable ni enfocable se verifica en navegador.
   */
  it("marca la sidebar como inerte mientras está cerrada", () => {
    const { container } = renderConColapsada(true);

    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(aside).toHaveAttribute("inert");

    // Los enlaces del menú viven adentro del subárbol inerte, no sueltos.
    const enlaceMobile = screen
      .getAllByRole("link", { name: /productos/i })
      .find((enlace) => aside.contains(enlace));
    expect(enlaceMobile).toBeDefined();
  });

  it("saca el inerte cuando la sidebar se abre", () => {
    const { container } = renderConColapsada(false);

    expect(container.querySelector("aside")).not.toHaveAttribute("inert");
  });
});

describe("AdminSidebar — drawer accesible (useDialogo + useBloquearScroll)", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  function renderDrawer(colapsada, onCerrar = () => {}) {
    return render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={colapsada} onCerrar={onCerrar} />
      </MemoryRouter>,
    );
  }

  it("Escape cierra el drawer abierto", () => {
    const onCerrar = vi.fn();
    renderDrawer(false, onCerrar);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCerrar).toHaveBeenCalledTimes(1);
  });

  it("Escape no hace nada con el drawer cerrado", () => {
    const onCerrar = vi.fn();
    renderDrawer(true, onCerrar);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onCerrar).not.toHaveBeenCalled();
  });

  it("el drawer es un diálogo modal con nombre", () => {
    const { container } = renderDrawer(false);

    expect(screen.getByRole("dialog", { name: "Menú" })).toBe(container.querySelector("aside"));
  });

  it("bloquea el scroll del body abierto y lo libera cerrado", () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={false} onCerrar={() => {}} />
      </MemoryRouter>,
    );

    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <MemoryRouter initialEntries={["/catalogo/admin/productos"]}>
        <AdminSidebar colapsada={true} onCerrar={() => {}} />
      </MemoryRouter>,
    );

    expect(document.body.style.overflow).not.toBe("hidden");
  });

  /**
   * Mitigación del drawer fantasma: abrir el drawer entre 768 y 1023px y
   * rotar a `lg` esconde el `<aside>` (`lg:hidden`) sin que nada avise al
   * estado de React, así que `useBloquearScroll` deja el body bloqueado y
   * `useDialogo` sigue atrapando el foco en enlaces invisibles. Sin
   * `matchMedia` (el plan prohíbe breakpoints en JS) no hay forma de
   * detectar el cruce; lo que sí se puede es dejar una salida visible: la
   * bottom nav de escritorio ya está en pantalla, y con `onCerrar` en sus
   * ítems cualquier toque —incluida la pestaña ACTUAL, que no navega y por
   * eso no dispara el cierre por cambio de ruta— libera el drawer.
   */
  it("un ítem de la bottom nav de escritorio cierra el drawer abierto", () => {
    const onCerrar = vi.fn();
    renderDrawer(false, onCerrar);

    // El segundo "Productos" es el de la bottom nav: `ITEMS_NAV` se mapea
    // primero en el drawer y después en la nav de escritorio.
    const [, productosEscritorio] = screen.getAllByRole("link", { name: /productos/i });
    fireEvent.click(productosEscritorio);

    expect(onCerrar).toHaveBeenCalled();
  });

  it("el botón Configuración de escritorio también cierra el drawer", () => {
    const onCerrar = vi.fn();
    renderDrawer(false, onCerrar);

    // El primer "Configuración" es el acordeón del drawer (que no debe
    // cerrarlo: despliega su propio submenú); el segundo es el de la bottom
    // nav de escritorio.
    const [, configuracionEscritorio] = screen.getAllByRole("button", { name: /configuración/i });
    fireEvent.click(configuracionEscritorio);

    expect(onCerrar).toHaveBeenCalled();
  });

  it("enfoca el primer enlace al abrir", () => {
    const { container } = renderDrawer(false);
    const aside = container.querySelector("aside");

    expect(document.activeElement).toBe(within(aside).getByRole("link", { name: /productos/i }));
  });
});
