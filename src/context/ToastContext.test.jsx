import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "./ToastContext.jsx";
import { useToast } from "./useToast.js";

function ComponenteDePrueba({ mensaje, opciones }) {
  const { mostrarToast } = useToast();
  return (
    <button type="button" onClick={() => mostrarToast(mensaje, opciones)}>
      Disparar
    </button>
  );
}

function renderConProvider(mensaje = "Hola", opciones) {
  return render(
    <ToastProvider>
      <ComponenteDePrueba mensaje={mensaje} opciones={opciones} />
    </ToastProvider>,
  );
}

describe("ToastContext", () => {
  it("useToast fuera de un ToastProvider tira un error claro", () => {
    // Silencia el log de error esperado que React imprime al capturar la excepción.
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    function SinProvider() {
      useToast();
      return null;
    }
    expect(() => render(<SinProvider />)).toThrow("useToast debe usarse dentro de un ToastProvider.");
    errorSpy.mockRestore();
  });

  it("no muestra ningún toast antes de llamar a mostrarToast", () => {
    renderConProvider();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("muestra el toast con el mensaje después de llamar a mostrarToast", async () => {
    const { getByRole } = renderConProvider("Producto agregado");
    getByRole("button", { name: "Disparar" }).click();

    expect(await screen.findByText("Producto agregado")).toBeInTheDocument();
  });

  it("un segundo llamado reemplaza el mensaje del toast anterior en vez de apilarlo", async () => {
    renderConProvider("Primero");
    screen.getByRole("button", { name: "Disparar" }).click();
    expect(await screen.findByText("Primero")).toBeInTheDocument();

    const { rerender } = renderConProvider("Segundo");
    rerender(
      <ToastProvider>
        <ComponenteDePrueba mensaje="Segundo" />
      </ToastProvider>,
    );
    screen.getAllByRole("button", { name: "Disparar" })[1].click();

    await waitFor(() => {
      expect(screen.getAllByRole("status")).toHaveLength(1);
    });
  });

  it("el botón de cerrar oculta el toast", async () => {
    renderConProvider("Cerrable");
    screen.getByRole("button", { name: "Disparar" }).click();
    await screen.findByText("Cerrable");

    screen.getByRole("button", { name: "Cerrar notificación" }).click();

    await waitFor(() => {
      expect(screen.queryByText("Cerrable")).not.toBeInTheDocument();
    });
  });

  it("con foto, el toast muestra la miniatura", () => {
    function Disparador() {
      const { mostrarToast } = useToast();
      return (
        <button
          type="button"
          onClick={() => mostrarToast("Agregado al carrito", { foto: { url: "http://x/1.jpg", alt: "Lámpara" } })}
        >
          ir
        </button>
      );
    }
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ir" }));
    expect(screen.getByRole("img", { name: "Lámpara" })).toBeInTheDocument();
  });

  it("con acción, el toast muestra un link que navega", () => {
    function Disparador() {
      const { mostrarToast } = useToast();
      return (
        <button
          type="button"
          onClick={() => mostrarToast("Agregado al carrito", { accion: { texto: "Ver carrito", to: "/carrito" } })}
        >
          ir
        </button>
      );
    }
    render(
      <MemoryRouter>
        <ToastProvider>
          <Disparador />
        </ToastProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ir" }));
    const link = screen.getByRole("link", { name: "Ver carrito" });
    expect(link).toHaveAttribute("href", "/carrito");
  });

  it("sin foto ni acción, no rompe el toast simple (regresión)", () => {
    function Disparador() {
      const { mostrarToast } = useToast();
      return (
        <button type="button" onClick={() => mostrarToast("Guardado")}>
          ir
        </button>
      );
    }
    render(
      <ToastProvider>
        <Disparador />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "ir" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("en desktop queda centrado ABAJO, no abajo-a-la-derecha (ahí vive el FAB de WhatsApp)", async () => {
    // Fix round 1 (gap confirmado por el controller): `BotonWhatsapp.jsx`
    // (variante `fab`) usa `md:bottom-6 md:right-6` en escritorio. El toast
    // usaba EXACTAMENTE la misma esquina y los dos se superponían. jsdom no
    // aplica `@media`, así que esto se afirma sobre las clases (mismo criterio
    // que `tablaApilada.js`/`FiltrosCatalogo.test.jsx`), no sobre posición
    // renderizada.
    const { getByRole } = renderConProvider("Toast de prueba");
    getByRole("button", { name: "Disparar" }).click();
    const contenedor = await screen.findByRole("status");

    expect(contenedor.className).toContain("md:bottom-6");
    expect(contenedor.className).not.toContain("md:right-6");
    expect(contenedor.className).not.toContain("md:justify-end");
    // `justify-center` sin prefijo `md:` alcanza para las dos anchuras: no se
    // pisa con un `md:justify-end` que ya no existe.
    expect(contenedor.className).toContain("justify-center");
  });

  describe("tema público del toast (I1)", () => {
    // `ToastProvider` se monta en `main.jsx` FUERA del `.tema-publico` que
    // pinta `Layout` (ver `Layout.jsx`): un toast disparado en una pantalla
    // pública pintaba con la paleta y la tipografía del admin. Se lee
    // `window.location.pathname` (mismo mecanismo que ya usa `main.jsx` para
    // el flash del tema oscuro), NO `useLocation`: varios tests de este
    // archivo montan `ToastProvider` sin ningún Router, y `useLocation`
    // tiraría fuera de uno.
    afterEach(() => {
      window.history.pushState({}, "", "/");
    });

    it("envuelve el toast en tema-publico en una ruta pública (default)", async () => {
      renderConProvider("Agregado al carrito");
      screen.getByRole("button", { name: "Disparar" }).click();
      const status = await screen.findByRole("status");

      expect(status.parentElement).toHaveClass("tema-publico");
    });

    it("NO envuelve en tema-publico dentro del panel admin", async () => {
      window.history.pushState({}, "", "/catalogo/admin/ordenes");
      renderConProvider("Agregado al carrito");
      screen.getByRole("button", { name: "Disparar" }).click();
      const status = await screen.findByRole("status");

      expect(status.parentElement).not.toHaveClass("tema-publico");
    });
  });
});
