import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PuertaWhatsApp from "./PuertaWhatsApp.jsx";
import * as configApi from "../api/config.js";

vi.mock("../api/config.js");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PuertaWhatsApp", () => {
  it("renderiza un link a wa.me con el texto por defecto", async () => {
    configApi.getWhatsappConfig.mockResolvedValue({
      numero: "5491122334455",
      dentroDeHorario: true,
      textoHorario: null,
    });

    render(<PuertaWhatsApp />);

    const link = await screen.findByRole("link", {
      name: "¿Necesitás ayuda? Escribinos por WhatsApp",
    });
    expect(link.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/5491122334455/);
  });

  it("acepta un texto propio", async () => {
    configApi.getWhatsappConfig.mockResolvedValue({ numero: "5491122334455" });

    render(<PuertaWhatsApp texto="Escribinos si no te llegó el código" />);

    expect(
      await screen.findByRole("link", { name: "Escribinos si no te llegó el código" }),
    ).toBeInTheDocument();
  });

  it("sin número configurado no renderiza nada", async () => {
    configApi.getWhatsappConfig.mockResolvedValue({ numero: null });

    render(<PuertaWhatsApp />);

    await waitFor(() => expect(configApi.getWhatsappConfig).toHaveBeenCalled());
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("extiende su área táctil a 44 de alto sin crecer de tamaño visible", async () => {
    configApi.getWhatsappConfig.mockResolvedValue({ numero: "5491122334455" });

    render(<PuertaWhatsApp />);

    const link = await screen.findByRole("link", {
      name: "¿Necesitás ayuda? Escribinos por WhatsApp",
    });

    expect(link.className).toContain("before:h-11");
    expect(link.className).toContain("before:content-['']");
    expect(link.className).toContain("before:w-full");
  });
});
