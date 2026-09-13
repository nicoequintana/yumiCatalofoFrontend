import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConfigContactoMock = vi.fn();

vi.mock("../api/config.js", () => ({
  getConfigContacto: (...args) => getConfigContactoMock(...args),
}));

const { default: useWhatsapp } = await import("./useWhatsapp.js");
const { reiniciarConfigContacto } = await import("./useConfigContacto.js");

function mockConfig(whatsapp) {
  getConfigContactoMock.mockResolvedValue({
    whatsapp,
    email: null,
    instagram: null,
    facebook: null,
    tiktok: null,
    direccion: null,
  });
}

const WHATSAPP_BASE = {
  numero: "5491122334455",
  dentroDeHorario: true,
  textoHorario: "Te respondemos ahora",
};

describe("useWhatsapp", () => {
  beforeEach(() => {
    vi.stubGlobal("location", { ...window.location, href: "http://localhost/producto/7" });
    reiniciarConfigContacto();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    reiniciarConfigContacto();
  });

  it("builds a generic wa.me URL for home context", async () => {
    mockConfig(WHATSAPP_BASE);

    const { result } = renderHook(() => useWhatsapp({ tipo: "home" }));

    await waitFor(() => expect(result.current.url).not.toBeNull());

    expect(result.current.url).toContain("https://wa.me/5491122334455?text=");
    expect(result.current.textoHorario).toBe("Te respondemos ahora");
    expect(result.current.dentroDeHorario).toBe(true);
  });

  it("includes the encoded product name and current URL for producto context", async () => {
    mockConfig(WHATSAPP_BASE);

    const producto = { nombre: "Reloj & Cadena \"Especial\"" };
    const { result } = renderHook(() => useWhatsapp({ tipo: "producto", producto }));

    await waitFor(() => expect(result.current.url).not.toBeNull());

    const decoded = decodeURIComponent(result.current.url.split("?text=")[1]);
    expect(decoded).toContain(producto.nombre);
    expect(decoded).toContain("http://localhost/producto/7");
    // No raw '&' or '"' leaking unencoded into the query string.
    expect(result.current.url.split("?text=")[1]).not.toContain("&C");
  });

  it("concatenates favorite product names for favoritos context", async () => {
    mockConfig(WHATSAPP_BASE);

    const productos = [{ nombre: "Producto Uno" }, { nombre: "Producto Dos" }];
    const { result } = renderHook(() => useWhatsapp({ tipo: "favoritos", productos }));

    await waitFor(() => expect(result.current.url).not.toBeNull());

    const decoded = decodeURIComponent(result.current.url.split("?text=")[1]);
    expect(decoded).toContain("Producto Uno");
    expect(decoded).toContain("Producto Dos");
  });

  it("truncates a long favorites list and appends a 'y X más' suffix", async () => {
    mockConfig(WHATSAPP_BASE);

    const productos = Array.from({ length: 8 }, (_, i) => ({ nombre: `Producto ${i + 1}` }));
    const { result } = renderHook(() => useWhatsapp({ tipo: "favoritos", productos }));

    await waitFor(() => expect(result.current.url).not.toBeNull());

    const decoded = decodeURIComponent(result.current.url.split("?text=")[1]);
    expect(decoded).toContain("y 3 más");
    expect(decoded).not.toContain("Producto 8");
  });

  it("does not build a url when the config fetch fails", async () => {
    getConfigContactoMock.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useWhatsapp({ tipo: "home" }));

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.url).toBeNull();
  });
});
