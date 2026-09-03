import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import TarjetaOrden from "./TarjetaOrden.jsx";
import { ACTIVACION_ARRASTRE } from "./dragOrdenes.js";

const ORDEN = {
  id: 42,
  estado: "PENDIENTE",
  estadoEtiqueta: "Pendiente",
  cliente: { nombre: "Ana Pérez", dni: "12345678", email: "ana@ejemplo.com" },
  total: "45000",
  cantidadItems: 2,
  resumen: [
    { nombreProducto: "Set de cuchillos", cantidad: 2 },
    { nombreProducto: "Tabla de bambú", cantidad: 1 },
  ],
  createdAt: "2026-09-01T12:00:00.000Z",
};

const onAlternarResumen = vi.fn();

/**
 * `useDraggable` necesita un `DndContext` arriba, y ese contexto tiene que
 * llevar la MISMA `activationConstraint` que la pantalla real.
 *
 * Con un `<DndContext>` pelado, el PointerSensor por defecto no tiene umbral:
 * cualquier `pointerdown` sobre la tarjeta arranca un arrastre y el click del
 * botón de resumen no llega nunca. O sea que sin esto el test mediría un
 * componente que no es el que usa la app — y de paso queda como guard: si
 * alguien saca el umbral, estos tests se caen.
 */
function ContextoDePrueba({ children }) {
  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: ACTIVACION_ARRASTRE }));
  return <DndContext sensors={sensores}>{children}</DndContext>;
}

function renderTarjeta(props = {}) {
  return render(
    <MemoryRouter>
      <ContextoDePrueba>
        <TarjetaOrden
          orden={ORDEN}
          resumenAbierto={false}
          onAlternarResumen={onAlternarResumen}
          {...props}
        />
      </ContextoDePrueba>
    </MemoryRouter>,
  );
}

/** El `<article>` de la tarjeta. No tiene rol de botón a propósito (ver abajo). */
function tarjetaDe(container) {
  return container.querySelector("[data-tarjeta-orden]");
}

beforeEach(() => {
  onAlternarResumen.mockReset();
});

describe("TarjetaOrden — lo que se ve", () => {
  it("muestra el número de orden, el cliente y el monto", () => {
    renderTarjeta();

    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument();
    expect(screen.getByText("$ 45.000")).toBeInTheDocument();
  });

  it("muestra un guion cuando la orden no trae monto", () => {
    // `total: null` significa "no se puede saber" (el backend no joineó los
    // ítems), NUNCA "$ 0". Se dibuja con el mismo guion largo que ya usan las
    // pantallas de analytics para una métrica no calculable.
    renderTarjeta({ orden: { ...ORDEN, total: null, cantidadItems: null, resumen: null } });

    // Son DOS guiones y los dos son correctos: el monto y el contador de
    // ítems. Los tres derivados del listado viajan juntos en null, porque la
    // causa es una sola (nadie joineó los ítems).
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("$ 0")).not.toBeInTheDocument();
  });

  it("enlaza al detalle de la orden", () => {
    renderTarjeta();

    expect(screen.getByRole("link", { name: /Ver la orden #42/ })).toHaveAttribute(
      "href",
      "/catalogo/admin/ordenes/42",
    );
  });
});

describe("TarjetaOrden — el arrastre", () => {
  it("la tarjeta ENTERA es el área de arrastre, sin manijón", () => {
    // Hubo una versión con manijón y se descartó: era un blanco chico para el
    // gesto más frecuente de la pantalla.
    const { container } = renderTarjeta();

    expect(screen.queryByRole("button", { name: /Arrastrar/ })).not.toBeInTheDocument();
    expect(tarjetaDe(container)).toHaveAttribute("aria-roledescription", "draggable");
  });

  it("avisa que se puede agarrar con el cursor", () => {
    const { container } = renderTarjeta();

    expect(tarjetaDe(container).className).toContain("cursor-grab");
    expect(tarjetaDe(container).className).toContain("active:cursor-grabbing");
  });

  it("es enfocable, para que el sensor de teclado tenga de dónde agarrarse", () => {
    const { container } = renderTarjeta();

    expect(tarjetaDe(container)).toHaveAttribute("tabindex", "0");
  });

  it("NO se anuncia como botón: adentro hay un enlace y un botón", () => {
    // dnd-kit pone `role="button"` en sus `attributes`. Un botón que anida
    // controles interactivos es ARIA inválido, así que ese rol se pisa; lo que
    // se conserva es el `tabIndex` y el `aria-roledescription`.
    const { container } = renderTarjeta();

    expect(tarjetaDe(container)).not.toHaveAttribute("role", "button");
  });
});

describe("TarjetaOrden — panel de resumen", () => {
  it("el disparador declara la relación de disclosure", () => {
    renderTarjeta();

    const boton = screen.getByRole("button", { name: /Ver los 2 productos de la orden #42/ });
    expect(boton).toHaveAttribute("aria-expanded", "false");
    expect(boton).toHaveAttribute("aria-controls");
    // No `role="tooltip"`: eso es para texto corto referenciado con
    // `aria-describedby`, y muchos lectores aplanan contenido estructurado ahí
    // — la lista de productos se perdería.
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("NO se abre al pasar el mouse por encima", async () => {
    // La apertura por hover se sacó: el panel tapaba las tarjetas de al lado y
    // competía con el gesto de arrastre, que empieza en el mismo lugar.
    const { container } = renderTarjeta();

    await userEvent.hover(tarjetaDe(container));

    expect(onAlternarResumen).not.toHaveBeenCalled();
  });

  it("avisa al padre al tocar el botón, en vez de manejar su propio abierto/cerrado", async () => {
    // El tablero es el que sabe cuál panel está abierto: si cada tarjeta
    // guardara su propio booleano, se podrían apilar cuatro paneles a la vez.
    renderTarjeta();

    await userEvent.click(screen.getByRole("button", { name: /Ver los 2 productos/ }));

    expect(onAlternarResumen).toHaveBeenCalledWith(42);
  });

  it("lista los productos cuando está abierto", () => {
    renderTarjeta({ resumenAbierto: true });

    expect(screen.getByText("Set de cuchillos")).toBeInTheDocument();
    expect(screen.getByText("Tabla de bambú")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ver los 2 productos/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("no monta el panel mientras está cerrado", () => {
    renderTarjeta();

    expect(screen.queryByText("Set de cuchillos")).not.toBeInTheDocument();
  });

  it("cierra con qué productos faltan cuando el resumen viene topeado", () => {
    // El backend topea el resumen en 5 líneas pero `cantidadItems` cuenta
    // todas. Sin esta leyenda, una orden de 9 productos parecería de 5.
    renderTarjeta({ resumenAbierto: true, orden: { ...ORDEN, cantidadItems: 9 } });

    expect(screen.getByText(/y 7 productos más/)).toBeInTheDocument();
  });

  it("Escape lo cierra y devuelve el foco al disparador", async () => {
    renderTarjeta({ resumenAbierto: true });
    const boton = screen.getByRole("button", { name: /Ver los 2 productos/ });
    boton.focus();

    await userEvent.keyboard("{Escape}");

    expect(onAlternarResumen).toHaveBeenCalledWith(null);
    expect(boton).toHaveFocus();
  });
});

describe("TarjetaOrden — ya no cambia de estado por su cuenta", () => {
  it("no tiene selector de estado: una orden se mueve arrastrándola", () => {
    renderTarjeta();

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});

describe("TarjetaOrden — el clon del DragOverlay", () => {
  it("sale del árbol de accesibilidad y del tabulado", () => {
    // El overlay dibuja una COPIA VISUAL de una tarjeta que sigue montada en su
    // columna. Sin marcarla, queda una segunda tarjeta enfocable con el mismo
    // contenido mientras dura el gesto: el teclado pasa dos veces por la misma
    // orden y un lector de pantalla la anuncia duplicada. Lo detectó el E2E,
    // que falló con "strict mode violation: resolved to 2 elements".
    const { container } = renderTarjeta({ decorativa: true });

    expect(tarjetaDe(container)).toHaveAttribute("aria-hidden", "true");
    expect(tarjetaDe(container)).toHaveAttribute("inert");
    expect(tarjetaDe(container)).toHaveAttribute("tabindex", "-1");
  });

  it("la tarjeta normal NO lleva esas marcas", () => {
    const { container } = renderTarjeta();

    expect(tarjetaDe(container)).not.toHaveAttribute("aria-hidden");
    expect(tarjetaDe(container)).not.toHaveAttribute("inert");
  });
});
