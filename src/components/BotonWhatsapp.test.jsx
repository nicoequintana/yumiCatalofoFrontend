import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BotonWhatsapp from "./BotonWhatsapp.jsx";

const CONFIG = { numero: "5491122334455", dentroDeHorario: true, textoHorario: "Te respondemos ahora" };

describe("BotonWhatsapp", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(CONFIG),
    });
  });

  afterEach(() => {
    // No global RTL auto-cleanup configured in this project's vitest setup
    // (test.globals is off) — clean up explicitly so each test's render
    // doesn't leak into the next one's DOM/query scope.
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a wa.me link once config loads, showing the hours label", async () => {
    render(<BotonWhatsapp contexto={{ tipo: "home" }} />);

    const link = await screen.findByRole("link", { name: "Contactar por WhatsApp" });

    expect(link).toHaveAttribute("href", expect.stringContaining("https://wa.me/5491122334455"));
    expect(screen.getByText("Te respondemos ahora")).toBeInTheDocument();
  });

  it("fires a fire-and-forget CLICK_WHATSAPP event on click without blocking or throwing, even if the POST fails", async () => {
    const user = userEvent.setup();

    render(<BotonWhatsapp contexto={{ tipo: "producto", producto: { nombre: "Reloj" } }} productId={7} />);

    const link = await screen.findByRole("link", { name: "Contactar por WhatsApp" });

    // Config GET already resolved above; make the next fetch (the event POST) fail.
    global.fetch = vi.fn().mockRejectedValue(new Error("network error"));

    await expect(user.click(link)).resolves.not.toThrow();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/eventos"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ tipo: "CLICK_WHATSAPP", productId: 7 }),
        }),
      );
    });
  });
});
