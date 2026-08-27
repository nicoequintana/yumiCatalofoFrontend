import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const getMock = vi.fn();
const adoptarMock = vi.fn();
const borrarMock = vi.fn();

vi.mock("../../../api/products.js", () => ({
  getImagenesGeneradas: (...a) => getMock(...a),
  adoptarImagenesGeneradas: (...a) => adoptarMock(...a),
  borrarImagenesGeneradas: (...a) => borrarMock(...a),
}));

const { default: GaleriaGeneradas } = await import("./GaleriaGeneradas.jsx");

const IMAGENES = [
  { publicId: "productos/X/X-1", url: "u1", nombre: "X-1", adoptada: false },
  { publicId: "productos/X/X-2", url: "u2", nombre: "X-2", adoptada: false },
  { publicId: "productos/X/X-3", url: "u3", nombre: "X-3", adoptada: true },
];

describe("GaleriaGeneradas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({ carpeta: "productos/X", imagenes: IMAGENES });
    adoptarMock.mockResolvedValue({ agregadas: 1 });
    borrarMock.mockResolvedValue({ borradas: 2, conservadas: 1, carpetaBorrada: false });
  });

  it("con la carpeta vacía invita a generar", async () => {
    getMock.mockResolvedValue({ carpeta: "productos/X", imagenes: [] });
    render(<GaleriaGeneradas productoId={7} fotosActuales={[]} onAdoptadas={() => {}} />);
    expect(await screen.findByText(/todavía no hay imágenes generadas/i)).toBeInTheDocument();
  });

  it("marca las ya adoptadas y no las deja seleccionar", async () => {
    const usuario = userEvent.setup();
    render(<GaleriaGeneradas productoId={7} fotosActuales={[]} onAdoptadas={() => {}} />);

    const yaEnFicha = await screen.findByRole("button", { name: /X-3/ });
    expect(yaEnFicha).toBeDisabled();
    await usuario.click(yaEnFicha);
    expect(yaEnFicha).toHaveAttribute("aria-pressed", "false");
  });

  it("adopta las seleccionadas y avisa al padre", async () => {
    const onAdoptadas = vi.fn();
    const usuario = userEvent.setup();
    render(<GaleriaGeneradas productoId={7} fotosActuales={[]} onAdoptadas={onAdoptadas} />);

    await usuario.click(await screen.findByRole("button", { name: /X-1/ }));
    await usuario.click(screen.getByRole("button", { name: /agregar a la ficha/i }));

    await waitFor(() => expect(adoptarMock).toHaveBeenCalledWith(7, ["productos/X/X-1"]));
    expect(onAdoptadas).toHaveBeenCalled();
  });

  it("avisa antes de enviar cuando la selección no entra", async () => {
    // 9 fotos cargadas -> entra 1. Seleccionar 2 tiene que frenarse acá, no en
    // el backend.
    const usuario = userEvent.setup();
    const fotos = Array.from({ length: 9 }, (_, i) => ({ id: i }));
    render(<GaleriaGeneradas productoId={7} fotosActuales={fotos} onAdoptadas={() => {}} />);

    await usuario.click(await screen.findByRole("button", { name: /X-1/ }));
    await usuario.click(screen.getByRole("button", { name: /X-2/ }));

    expect(screen.getByRole("button", { name: /agregar a la ficha/i })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(/solo entra/i);
  });

  it("muestra el error del backend si la adopción falla", async () => {
    adoptarMock.mockRejectedValue(new Error("El producto ya tiene 10 fotos."));
    const usuario = userEvent.setup();
    render(<GaleriaGeneradas productoId={7} fotosActuales={[]} onAdoptadas={() => {}} />);

    await usuario.click(await screen.findByRole("button", { name: /X-1/ }));
    await usuario.click(screen.getByRole("button", { name: /agregar a la ficha/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/ya tiene 10 fotos/i);
  });

  it("al borrar informa cuántas se conservaron por estar en uso", async () => {
    const usuario = userEvent.setup();
    render(<GaleriaGeneradas productoId={7} fotosActuales={[]} onAdoptadas={() => {}} />);

    await screen.findByRole("button", { name: /X-1/ });
    await usuario.click(screen.getByRole("button", { name: /borrar generadas/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/1/);
    expect(screen.getByRole("status")).toHaveTextContent(/en uso|conserv/i);
  });

  it("un fallo de carga se distingue de una carpeta vacía", async () => {
    getMock.mockRejectedValue(new Error("No se pudo conectar"));
    render(<GaleriaGeneradas productoId={7} fotosActuales={[]} onAdoptadas={() => {}} />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/no se pudo/i);
    // La ausencia del texto de carpeta vacía es la otra mitad de "se distingue":
    // sin esta aserción, romper el guard que separa los dos estados seguiría
    // en verde.
    expect(screen.queryByText(/todavía no hay imágenes generadas/i)).not.toBeInTheDocument();
  });
});
