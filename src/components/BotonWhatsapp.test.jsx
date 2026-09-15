import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BotonWhatsapp from "./BotonWhatsapp.jsx";
import { reiniciarConfigContacto } from "../hooks/useConfigContacto.js";

// `useWhatsapp` ya no pide `GET /config/whatsapp` por su cuenta (13/09/2026):
// consume `useConfigContacto`, que pide `GET /config/contacto` — la forma
// anidada bajo `whatsapp`. `reiniciarConfigContacto()` limpia el cache
// module-level entre tests: sin esto, el primer fetch resuelto en este mismo
// archivo quedaría cacheado para los tests siguientes.
const CONTACTO = {
  whatsapp: { numero: "5491122334455", dentroDeHorario: true, textoHorario: "Te respondemos ahora" },
  email: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  direccion: null,
};

describe("BotonWhatsapp", () => {
  beforeEach(() => {
    reiniciarConfigContacto();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(CONTACTO),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    reiniciarConfigContacto();
  });

  it("renders a wa.me link once config loads, showing the hours label", async () => {
    render(<BotonWhatsapp contexto={{ tipo: "home" }} />);

    const link = await screen.findByRole("link", { name: "Contactar por WhatsApp" });

    expect(link).toHaveAttribute("href", expect.stringContaining("https://wa.me/5491122334455"));
    expect(screen.getByText("Te respondemos ahora")).toBeInTheDocument();
  });

  // Medido en navegador el 13/09/2026 a 390px: el texto de fuera de horario
  // ocupa casi todo el ancho y tapa el contenido que pasa por detrás.
  it("la etiqueta de horario del FAB se oculta por debajo de md", async () => {
    render(<BotonWhatsapp contexto={{ tipo: "home" }} />);

    const etiqueta = await screen.findByText("Te respondemos ahora");

    expect(etiqueta).toHaveClass("hidden");
    expect(etiqueta).toHaveClass("md:inline-block");
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

/**
 * Área táctil (WCAG 2.5.8). La variante `inline` comparte fila y clases con
 * `BotonCompartir`, al que la medición del 07/09/2026 le encontró **19px de
 * alto** de área efectiva. Acá no llegó a medirse en navegador porque el
 * entorno local no tiene WhatsApp configurado y el componente devuelve `null`
 * sin número: el problema estaba igual, escondido detrás de esa guarda.
 */
describe("BotonWhatsapp — área táctil de la variante inline", () => {
  beforeEach(() => {
    reiniciarConfigContacto();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(CONTACTO),
    });
  });

  afterEach(() => {
    reiniciarConfigContacto();
  });

  it("extiende su área a 44 de alto sin crecer de tamaño visible", async () => {
    render(<BotonWhatsapp variant="inline" contexto={{ tipo: "home" }} />);

    const enlace = await screen.findByRole("link", { name: "Contactar por WhatsApp" });

    expect(enlace.className).toContain("before:h-11");
    expect(enlace.className).toContain("before:content-['']");
    expect(enlace.className).toContain("before:w-full");
  });

  // El talón de `PaginaCombo` es teal oscuro. Pasar el color por `className`
  // no alcanzaba: competía con `text-on-surface-variant` de la variante y
  // ganaba el orden del CSS generado, no el del string.
  it("con `sobreOscuro` usa el teal claro en vez de los colores de siempre", async () => {
    render(<BotonWhatsapp variant="inline" sobreOscuro contexto={{ tipo: "home" }} />);

    const enlace = await screen.findByRole("link", { name: "Contactar por WhatsApp" });

    expect(enlace).toHaveClass("text-on-primary-container", "hover:text-on-primary");
    expect(enlace).not.toHaveClass("text-on-surface-variant");
  });
});
