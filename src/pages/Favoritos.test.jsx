import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Favoritos from "./Favoritos.jsx";
import * as productsApi from "../api/products.js";

vi.mock("../api/products.js");

// `useWhatsapp` pide su propia config; el botón no aporta nada a estos tests.
vi.mock("../components/BotonWhatsapp.jsx", () => ({ default: () => null }));

function renderFavoritos() {
  return render(
    <MemoryRouter>
      <Favoritos />
    </MemoryRouter>,
  );
}

describe("Favoritos — fallo de red", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un error y apaga el spinner si no se pueden cargar los productos", async () => {
    productsApi.getProductsByIds.mockRejectedValue(new Error("network down"));

    renderFavoritos();

    expect(
      await screen.findByText(/No pudimos cargar tus favoritos/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Cargando favoritos…")).not.toBeInTheDocument();
  });
});
