import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Sección del editor que dispara el flujo de generación de imágenes de n8n.
 *
 * Lo que más importa acá es que los tres desenlaces se distingan en pantalla:
 * un envío que arrancó, un `already_processed` que NO generó nada, y un fallo.
 * Mostrar los tres igual es peor que no tener la feature — el admin se queda
 * esperando imágenes que nunca van a llegar.
 */

const generarImagenesMock = vi.fn();
vi.mock("../../../api/products.js", () => ({
  generarImagenes: (...args) => generarImagenesMock(...args),
}));

// jsdom no implementa createObjectURL, que el componente usa para las previews.
// Se agregan los métodos al URL existente en vez de reemplazarlo con un objeto:
// `URL` es una clase, y un spread la aplana perdiendo el constructor — que el
// resto del entorno de test sí usa ("URL is not a constructor").
URL.createObjectURL = () => "blob:fake";
URL.revokeObjectURL = () => {};

const { default: SeccionGenerarImagenes } = await import("./SeccionGenerarImagenes.jsx");

function archivo(nombre = "ref.jpg") {
  return new File(["bytes"], nombre, { type: "image/jpeg" });
}

describe("SeccionGenerarImagenes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generarImagenesMock.mockResolvedValue({ enviado: true, estado: "processing" });
  });

  /** Elegir una referencia es lo mínimo que habilita el botón. */
  async function elegirUnaReferencia(usuario) {
    await usuario.upload(screen.getByLabelText(/imágenes de referencia/i), archivo());
  }

  it("no renderiza nada en un producto sin id", () => {
    const { container } = render(<SeccionGenerarImagenes productoId={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("el botón arranca deshabilitado hasta que se elige una referencia", async () => {
    // Sin imagen de entrada el flujo no puede trabajar (gpt-image-1 en modo
    // `edit`), así que el pedido moriría con un 400 del otro lado.
    const usuario = userEvent.setup();
    render(<SeccionGenerarImagenes productoId={7} />);

    expect(screen.getByRole("button", { name: /generar imágenes/i })).toBeDisabled();

    await elegirUnaReferencia(usuario);

    expect(screen.getByRole("button", { name: /generar imágenes/i })).toBeEnabled();
  });

  it("envía las referencias elegidas", async () => {
    const usuario = userEvent.setup();
    render(<SeccionGenerarImagenes productoId={7} />);

    await elegirUnaReferencia(usuario);
    await usuario.click(screen.getByRole("button", { name: /generar imágenes/i }));

    await waitFor(() => expect(generarImagenesMock).toHaveBeenCalledTimes(1));
    expect(generarImagenesMock.mock.calls[0][0]).toBe(7);
    expect(generarImagenesMock.mock.calls[0][1]).toHaveLength(1);
  });

  it("confirma que el pedido se envió, sin prometer que las imágenes estén listas", async () => {
    const usuario = userEvent.setup();
    render(<SeccionGenerarImagenes productoId={7} />);

    await elegirUnaReferencia(usuario);
    await usuario.click(screen.getByRole("button", { name: /generar imágenes/i }));

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent(/enviado/i);
    expect(aviso).toHaveTextContent(/minutos|mail/i);
  });

  it("avisa cuando n8n NO generó nada porque ya estaba procesado", async () => {
    // El caso más engañoso del flujo: HTTP 200, pero no se generó ninguna
    // imagen. Mostrarlo igual que un envío normal deja al admin esperando algo
    // que nunca va a llegar.
    generarImagenesMock.mockResolvedValue({
      enviado: true,
      estado: "already_processed",
      carpeta: "productos/YIMA-TERMOM-8189",
    });
    const usuario = userEvent.setup();
    render(<SeccionGenerarImagenes productoId={7} />);

    await elegirUnaReferencia(usuario);
    await usuario.click(screen.getByRole("button", { name: /generar imágenes/i }));

    const aviso = await screen.findByRole("status");
    expect(aviso).toHaveTextContent(/ya tiene imágenes generadas/i);
    expect(aviso).toHaveTextContent("productos/YIMA-TERMOM-8189");
  });

  it("muestra el error del backend cuando falla", async () => {
    generarImagenesMock.mockRejectedValue(new Error("n8n rechazó el pedido (HTTP 500)."));
    const usuario = userEvent.setup();
    render(<SeccionGenerarImagenes productoId={7} />);

    await elegirUnaReferencia(usuario);
    await usuario.click(screen.getByRole("button", { name: /generar imágenes/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/n8n/i);
  });

  it("tras un error del webhook el botón sigue habilitado para reintentar", async () => {
    generarImagenesMock.mockRejectedValue(new Error("n8n no respondió a tiempo."));
    const usuario = userEvent.setup();
    render(<SeccionGenerarImagenes productoId={7} />);

    await elegirUnaReferencia(usuario);
    await usuario.click(screen.getByRole("button", { name: /generar imágenes/i }));
    await screen.findByRole("alert");

    // Solo una selección inválida bloquea el botón. Si un fallo del servicio lo
    // deshabilitara, un webhook caído dejaría al admin sin forma de reintentar
    // salvo recargando la página.
    expect(screen.getByRole("button", { name: /generar imágenes/i })).toBeEnabled();
  });

  it("no deja enviar más de 2 referencias", async () => {
    const usuario = userEvent.setup();
    render(<SeccionGenerarImagenes productoId={7} />);

    await usuario.upload(screen.getByLabelText(/imágenes de referencia/i), [
      archivo("a.jpg"),
      archivo("b.jpg"),
      archivo("c.jpg"),
    ]);

    expect(await screen.findByRole("alert")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: /generar imágenes/i })).toBeDisabled();
  });
});
