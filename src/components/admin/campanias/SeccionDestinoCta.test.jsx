import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../api/categorias.js", () => ({ getCategorias: () => Promise.resolve([]) }));
vi.mock("../../../api/products.js", () => ({ getProducts: () => Promise.resolve({ data: [] }) }));

const { default: SeccionDestinoCta } = await import("./SeccionDestinoCta.jsx");

const VALORES = { modalCtaTipo: "CATALOGO", modalCtaReferenciaId: "" };
const OPCIONES = {
  destinos: [
    { valor: "CAMPANIA", etiqueta: "Los productos de la campaña" },
    { valor: "CATALOGO", etiqueta: "Todo el catálogo" },
  ],
};

function montar() {
  return render(
    <SeccionDestinoCta
      valores={VALORES}
      editar={vi.fn()}
      editarDestinoCta={vi.fn()}
      opciones={OPCIONES}
      campania={{ productos: [] }}
      guardando={false}
    />,
  );
}

describe("SeccionDestinoCta", () => {
  it("es una sección con nombre propio: el destino es de la campaña, no del cartel", () => {
    montar();

    expect(screen.getByRole("region", { name: /destino del bot/i })).toBeInTheDocument();
  });

  it("hay UN solo grupo de radios en la página", () => {
    const { container } = montar();

    const nombres = new Set(
      [...container.querySelectorAll('input[type="radio"]')].map((el) => el.name),
    );
    expect(nombres).toEqual(new Set(["destino-cta"]));
  });
});
