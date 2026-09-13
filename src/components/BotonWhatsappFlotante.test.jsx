import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BotonWhatsappFlotante from "./BotonWhatsappFlotante.jsx";
import { reiniciarConfigContacto } from "../hooks/useConfigContacto.js";

vi.mock("../api/config.js", () => ({
  getConfigContacto: vi.fn().mockResolvedValue({
    whatsapp: { numero: "5491122334455", dentroDeHorario: true, textoHorario: null },
    email: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    direccion: null,
  }),
}));

function montar(ruta) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <BotonWhatsappFlotante />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  reiniciarConfigContacto();
});

describe("BotonWhatsappFlotante", () => {
  it("se monta con contexto genérico en una ruta pública cualquiera", async () => {
    montar("/coleccion");

    expect(await screen.findByRole("link", { name: "Contactar por WhatsApp" })).toBeInTheDocument();
  });

  it("no se monta en la ficha de producto: ya tiene su propio CTA inline", () => {
    montar("/producto/7-un-producto");

    expect(screen.queryByRole("link", { name: "Contactar por WhatsApp" })).not.toBeInTheDocument();
  });

  it("no se monta en el panel de admin", () => {
    montar("/catalogo/admin/productos");

    expect(screen.queryByRole("link", { name: "Contactar por WhatsApp" })).not.toBeInTheDocument();
  });

  it("no se monta en /favoritos: esa página arma su propio mensaje con los nombres guardados", () => {
    montar("/favoritos");

    expect(screen.queryByRole("link", { name: "Contactar por WhatsApp" })).not.toBeInTheDocument();
  });
});
