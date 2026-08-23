import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
});
