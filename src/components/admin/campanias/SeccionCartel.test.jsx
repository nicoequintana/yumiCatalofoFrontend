import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../api/categorias.js", () => ({ getCategorias: () => Promise.resolve([]) }));
vi.mock("../../../api/products.js", () => ({ getProducts: () => Promise.resolve({ data: [] }) }));

const { default: SeccionCartel } = await import("./SeccionCartel.jsx");

const VALORES = {
  modalActivo: false,
  modalTitulo: "",
  modalTexto: "",
  modalFechaObjetivo: "",
  modalCtaTexto: "",
  modalCtaTipo: "CATALOGO",
  modalCtaReferenciaId: "",
};
const OPCIONES = {
  destinos: [
    { valor: "CAMPANIA", etiqueta: "Los productos de la campaña" },
    { valor: "CATALOGO", etiqueta: "Todo el catálogo" },
  ],
};

function montar() {
  return render(
    <SeccionCartel
      valores={VALORES}
      editar={vi.fn()}
      opciones={OPCIONES}
      campania={{ productos: [] }}
      diasFaltantes={null}
      guardando={false}
    />,
  );
}

describe("SeccionCartel", () => {
  it("ya NO renderiza el selector de destino: se mudó a su propia sección", () => {
    const { container } = montar();

    expect(container.querySelector('input[name="destino-cta"]')).toBeNull();
  });
});
