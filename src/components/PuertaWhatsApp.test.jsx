import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PuertaWhatsApp from "./PuertaWhatsApp.jsx";

const getConfigContactoMock = vi.fn();

vi.mock("../api/config.js", () => ({
  getConfigContacto: (...args) => getConfigContactoMock(...args),
}));

const { reiniciarConfigContacto } = await import("../hooks/useConfigContacto.js");

function mockNumero(numero, resto = {}) {
  getConfigContactoMock.mockResolvedValue({
    whatsapp: { numero, dentroDeHorario: true, textoHorario: null, ...resto },
    email: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    direccion: null,
  });
}

beforeEach(() => {
  reiniciarConfigContacto();
});

afterEach(() => {
  vi.restoreAllMocks();
  reiniciarConfigContacto();
});

describe("PuertaWhatsApp", () => {
  it("renderiza un link a wa.me con el texto por defecto", async () => {
    mockNumero("5491122334455");

    render(<PuertaWhatsApp />);

    const link = await screen.findByRole("link", {
      name: "¿Necesitás ayuda? Escribinos por WhatsApp",
    });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5491122334455/);
  });

  it("acepta un texto propio", async () => {
    mockNumero("5491122334455");

    render(<PuertaWhatsApp texto="Escribinos si no te llegó el código" />);

    expect(
      await screen.findByRole("link", { name: "Escribinos si no te llegó el código" }),
    ).toBeInTheDocument();
  });

  it("sin número configurado no renderiza nada", async () => {
    mockNumero(null);

    render(<PuertaWhatsApp />);

    await waitFor(() => expect(getConfigContactoMock).toHaveBeenCalled());
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("extiende su área táctil a 44 de alto sin crecer de tamaño visible", async () => {
    mockNumero("5491122334455");

    render(<PuertaWhatsApp />);

    const link = await screen.findByRole("link", {
      name: "¿Necesitás ayuda? Escribinos por WhatsApp",
    });

    expect(link.className).toContain("before:h-11");
    expect(link.className).toContain("before:content-['']");
    expect(link.className).toContain("before:w-full");
  });
});
