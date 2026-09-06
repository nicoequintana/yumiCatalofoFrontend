import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  actualizarPromocion,
  guardarArtePromocion,
  quitarArtePromocion,
} from "./promociones.js";
import { fetchAutenticado } from "./authClient.js";
import { TIMEOUT_SUBIDA_MS } from "./http.js";

vi.mock("./authClient.js");

const BASE = "http://localhost:4000/api";

function mockRespuesta(body = {}, ok = true) {
  fetchAutenticado.mockResolvedValue({ ok, text: async () => JSON.stringify(body) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("guardarArtePromocion", () => {
  it("manda el arte como multipart con el campo 'arte'", async () => {
    mockRespuesta({ id: 3, bannerArteUrl: "https://cdn/x.jpg" });
    const archivo = new File(["x"], "a.jpg", { type: "image/jpeg" });

    await guardarArtePromocion(3, archivo);

    const [url, opciones] = fetchAutenticado.mock.calls[0];
    expect(url).toBe(`${BASE}/promociones/3/arte`);
    expect(opciones.method).toBe("PUT");
    expect(opciones.body.get("arte")).toBe(archivo);
  });

  it("usa el timeout largo de subidas, no el de 15s por defecto", async () => {
    mockRespuesta({ id: 3 });
    const archivo = new File(["x"], "a.jpg", { type: "image/jpeg" });

    await guardarArtePromocion(3, archivo);

    expect(fetchAutenticado.mock.calls[0][2]).toBe(TIMEOUT_SUBIDA_MS);
  });

  it("responde el detalle de la promoción", async () => {
    mockRespuesta({ id: 3, bannerArteUrl: "https://cdn/x.jpg" });
    const archivo = new File(["x"], "a.jpg", { type: "image/jpeg" });

    const detalle = await guardarArtePromocion(3, archivo);

    expect(detalle).toEqual({ id: 3, bannerArteUrl: "https://cdn/x.jpg" });
  });
});

describe("quitarArtePromocion", () => {
  it("hace DELETE a /:id/arte", async () => {
    mockRespuesta({ id: 3, bannerArteUrl: null });

    await quitarArtePromocion(3);

    const [url, opciones] = fetchAutenticado.mock.calls[0];
    expect(url).toBe(`${BASE}/promociones/3/arte`);
    expect(opciones.method).toBe("DELETE");
  });
});

describe("actualizarPromocion", () => {
  it("manda solo las claves de banner que el llamador incluyó, sin completar las demás", async () => {
    mockRespuesta({ id: 3, bannerEnHome: true });

    await actualizarPromocion(3, { nombre: "Verano", bannerEnHome: true });

    const [url, opciones] = fetchAutenticado.mock.calls[0];
    expect(url).toBe(`${BASE}/promociones/3`);
    expect(opciones.method).toBe("PUT");
    const body = JSON.parse(opciones.body);
    expect(body).toEqual({ nombre: "Verano", bannerEnHome: true });
    // No debe inventar bannerTitulo/bannerTexto: el backend distingue clave
    // AUSENTE ("no la toques") de `null` explícito ("borrala"), y completar acá
    // con null borraría datos que el llamador no quiso tocar.
    expect(body).not.toHaveProperty("bannerTitulo");
    expect(body).not.toHaveProperty("bannerTexto");
  });

  it("propaga el error del backend", async () => {
    mockRespuesta({ error: "Un banner activo necesita un título." }, false);

    await expect(actualizarPromocion(3, { bannerEnHome: true })).rejects.toThrow(
      "Un banner activo necesita un título.",
    );
  });
});
