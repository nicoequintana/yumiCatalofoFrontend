import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../../api/products.js", () => ({
  getImagenesGeneradas: vi.fn().mockResolvedValue({ carpeta: "productos/X", imagenes: [] }),
  adoptarImagenesGeneradas: vi.fn(),
  borrarImagenesGeneradas: vi.fn(),
  generarImagenes: vi.fn(),
}));

URL.createObjectURL = () => "blob:fake";
URL.revokeObjectURL = () => {};

const { default: SolapaImagenes } = await import("./SolapaImagenes.jsx");

const valores = {
  id: 7,
  fotos: [],
  video: null,
  beneficios: [{ texto: "Se ceba solo" }],
  caracteristicas: [],
  especificaciones: [],
};

function montar(extra = {}) {
  return render(
    <SolapaImagenes
      visible
      productoId={7}
      valores={valores}
      onChangeFotos={() => {}}
      onChangeVideo={() => {}}
      onAdoptadas={() => {}}
      {...extra}
    />,
  );
}

describe("SolapaImagenes", () => {
  it("monta los tres bloques en el orden del diseño", () => {
    montar();
    const titulos = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titulos[0]).toMatch(/fotos del catálogo/i);
    expect(titulos[1]).toMatch(/generar con ia/i);
    expect(titulos[2]).toMatch(/generadas por ia/i);
  });

  it("muestra el texto que se va a imprimir antes de generar", () => {
    montar();
    expect(screen.getByText("Se ceba solo")).toBeInTheDocument();
  });

  it("en un alta nueva no muestra generación ni galería", () => {
    // Sin id no hay producto contra el cual generar ni carpeta que listar.
    montar({ productoId: undefined, valores: { ...valores, id: null } });
    expect(screen.queryByText(/generar con ia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/generadas por ia/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /fotos del catálogo/i })).toBeInTheDocument();
  });

  it("oculta el panel cuando no está visible, sin desmontarlo", () => {
    const { container } = montar({ visible: false });
    expect(container.firstChild).toHaveClass("hidden");
  });
});
