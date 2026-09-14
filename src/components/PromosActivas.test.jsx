import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import PromosActivas from "./PromosActivas.jsx";

/** `ProductCard` monta `BotonAgregar`, que necesita el `ToastProvider` (en la app lo pone `main.jsx`). */
function Proveedores({ children }) {
  return (
    <MemoryRouter>
      <ToastProvider>{children}</ToastProvider>
    </MemoryRouter>
  );
}

function producto(extra = {}) {
  return { id: 1, nombre: "Reloj Clásico", precio: "1000", stock: 5, fotos: [], etiqueta: null, categoria: null, ...extra };
}

function renderPromos(props) {
  return render(<PromosActivas {...props} />, { wrapper: Proveedores });
}

/** Un instante ISO `segundos` en el futuro, contra el reloj (real o falso) vigente. */
function enSegundos(segundos) {
  return new Date(Date.now() + segundos * 1000).toISOString();
}

/**
 * Solo se falsean `Date` y los intervalos (docs/reglas/testing.md): el reloj de
 * la promo depende de los dos y de nada más. Se restauran después de cada test.
 */
function falsearReloj() {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(new Date("2026-09-13T12:00:00.000Z"));
}

afterEach(() => {
  vi.useRealTimers();
});

describe("PromosActivas — sin promo destacada (fallback a ofertas)", () => {
  it("sin ofertas y sin error, no renderiza nada", () => {
    const { container } = renderPromos({ promoDestacada: null, ofertas: [], errorOfertas: null });

    expect(container).toBeEmptyDOMElement();
  });

  it("sin props tampoco renderiza nada", () => {
    // La página monta la sección en el mismo render en que los datos todavía no llegaron.
    const { container } = renderPromos({});

    expect(container).toBeEmptyDOMElement();
  });

  it("con error muestra EstadoVacio con cloud_off y el mensaje compartido", () => {
    renderPromos({ promoDestacada: null, ofertas: [], errorOfertas: "Revisá tu conexión e intentá de nuevo." });

    expect(screen.getByText("cloud_off")).toBeInTheDocument();
    expect(screen.getByText("Revisá tu conexión e intentá de nuevo.")).toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar las ofertas")).toBeInTheDocument();
  });

  it("con ofertas dibuja la grilla, sin reloj", () => {
    renderPromos({
      promoDestacada: null,
      ofertas: [producto(), producto({ id: 2, nombre: "Lámpara LED" })],
      errorOfertas: null,
    });

    expect(screen.getByRole("heading", { level: 2, name: "Ofertas de la semana" })).toBeInTheDocument();
    expect(screen.getByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.getByText("Lámpara LED")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todas las ofertas/i })).toHaveAttribute(
      "href",
      "/coleccion?conDescuento=1",
    );
    expect(screen.queryByText(/termina en/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("muestra como mucho 8 tarjetas: dos filas de la grilla de escritorio", () => {
    const ofertas = Array.from({ length: 12 }, (_, i) => producto({ id: i + 1, nombre: `Oferta ${i + 1}` }));

    renderPromos({ promoDestacada: null, ofertas, errorOfertas: null });

    expect(screen.getByText("Oferta 8")).toBeInTheDocument();
    expect(screen.queryByText("Oferta 9")).not.toBeInTheDocument();
  });

  it("el tope de la grilla es el mismo número que pide useOfertas (una sola fuente)", async () => {
    const { OFERTAS_POR_RIEL } = await import("../hooks/useOfertas.js");
    const ofertas = Array.from({ length: 12 }, (_, i) => producto({ id: i + 1, nombre: `Oferta ${i + 1}` }));

    renderPromos({ promoDestacada: null, ofertas, errorOfertas: null });

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(OFERTAS_POR_RIEL);
  });

  it("una promo destacada sin productos cae al listado de ofertas", () => {
    renderPromos({
      promoDestacada: { id: 3, nombre: "Semana del Hogar", finVigencia: enSegundos(3600), productos: [] },
      ofertas: [producto()],
      errorOfertas: null,
    });

    expect(screen.queryByText("Semana del Hogar")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ofertas de la semana" })).toBeInTheDocument();
  });

  it("una promo destacada sin productos no deja un intervalo de reloj corriendo", () => {
    falsearReloj();
    renderPromos({
      promoDestacada: { id: 3, nombre: "Semana del Hogar", finVigencia: enSegundos(3600), productos: [] },
      ofertas: [producto()],
      errorOfertas: null,
    });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("una promo destacada ya vencida al montar cae al listado de ofertas, sin reloj", () => {
    renderPromos({
      promoDestacada: { id: 3, nombre: "Semana del Hogar", finVigencia: enSegundos(-10), productos: [producto()] },
      ofertas: [producto({ id: 2, nombre: "Lámpara LED" })],
      errorOfertas: null,
    });

    expect(screen.queryByText("Semana del Hogar")).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("Lámpara LED")).toBeInTheDocument();
  });
});

describe("PromosActivas — con promo destacada vigente", () => {
  it("muestra el nombre de la promo como h2 y SUS productos, no las ofertas", () => {
    renderPromos({
      promoDestacada: { id: 3, nombre: "Semana del Hogar", finVigencia: enSegundos(3600), productos: [producto()] },
      ofertas: [producto({ id: 2, nombre: "Lámpara LED" })],
      errorOfertas: null,
    });

    expect(screen.getByRole("heading", { level: 2, name: "Semana del Hogar" })).toBeInTheDocument();
    expect(screen.getByText("Promo activa")).toBeInTheDocument();
    expect(screen.getByText("Reloj Clásico")).toBeInTheDocument();
    expect(screen.queryByText("Lámpara LED")).not.toBeInTheDocument();
  });

  it("un error de ofertas no tapa a la promo destacada", () => {
    renderPromos({
      promoDestacada: { id: 3, nombre: "Semana del Hogar", finVigencia: enSegundos(3600), productos: [producto()] },
      ofertas: [],
      errorOfertas: "Revisá tu conexión e intentá de nuevo.",
    });

    expect(screen.getByRole("heading", { name: "Semana del Hogar" })).toBeInTheDocument();
    expect(screen.queryByText("cloud_off")).not.toBeInTheDocument();
  });

  it("muestra un reloj que cuenta hacia finVigencia, sin calcular fechas de negocio", () => {
    falsearReloj();
    renderPromos({
      promoDestacada: { id: 3, nombre: "X", finVigencia: enSegundos(65), productos: [producto()] },
      ofertas: [],
      errorOfertas: null,
    });

    const reloj = screen.getByLabelText(/tiempo restante/i);
    expect(reloj).toHaveTextContent("Termina en 00:01:05");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByLabelText(/tiempo restante/i)).toHaveTextContent("Termina en 00:01:04");
  });

  it("el nombre accesible del reloj incluye los dígitos, no solo el rótulo", () => {
    falsearReloj();
    renderPromos({
      promoDestacada: { id: 3, nombre: "X", finVigencia: enSegundos(65), productos: [producto()] },
      ofertas: [],
      errorOfertas: null,
    });

    expect(
      screen.getByRole("timer", { name: /tiempo restante de la promoción.*00:01:05/i }),
    ).toBeInTheDocument();
  });

  it("con más de un día por delante muestra los días aparte de las horas", () => {
    falsearReloj();
    const segundos = 2 * 86400 + 9 * 3600 + 27 * 60 + 53;
    renderPromos({
      promoDestacada: { id: 3, nombre: "X", finVigencia: enSegundos(segundos), productos: [producto()] },
      ofertas: [],
      errorOfertas: null,
    });

    expect(screen.getByLabelText(/tiempo restante/i)).toHaveTextContent("Termina en 2d 09:27:53");
  });

  it("al llegar a 0 se detiene y la sección cae al listado de ofertas", () => {
    falsearReloj();
    renderPromos({
      promoDestacada: { id: 3, nombre: "Semana del Hogar", finVigencia: enSegundos(2), productos: [producto()] },
      ofertas: [producto({ id: 2, nombre: "Lámpara LED" })],
      errorOfertas: null,
    });
    expect(screen.getByRole("heading", { name: "Semana del Hogar" })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText("Semana del Hogar")).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("Lámpara LED")).toBeInTheDocument();
    // Sin intervalos colgados: el reloj se apagó.
    expect(vi.getTimerCount()).toBe(0);
  });

  it("una promo que llega después del montaje ya vencida no se muestra con un reloj congelado", () => {
    // Montada sin promo; pasa el tiempo; llega una promo cuyo fin ya quedó
    // atrás para el reloj del navegador (desfasaje con el servidor).
    falsearReloj();
    const { rerender } = renderPromos({ promoDestacada: null, ofertas: [producto({ id: 2, nombre: "Lámpara LED" })] });
    const finYaPasado = enSegundos(30);
    act(() => {
      vi.setSystemTime(Date.now() + 60_000);
    });

    rerender(
      <PromosActivas
        promoDestacada={{ id: 3, nombre: "Semana del Hogar", finVigencia: finYaPasado, productos: [producto()] }}
        ofertas={[producto({ id: 2, nombre: "Lámpara LED" })]}
      />,
    );

    expect(screen.queryByText("Semana del Hogar")).not.toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  it("al llegar a 0 sin ofertas, la sección desaparece", () => {
    falsearReloj();
    const { container } = renderPromos({
      promoDestacada: { id: 3, nombre: "Semana del Hogar", finVigencia: enSegundos(1), productos: [producto()] },
      ofertas: [],
      errorOfertas: null,
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(container).toBeEmptyDOMElement();
  });
});
