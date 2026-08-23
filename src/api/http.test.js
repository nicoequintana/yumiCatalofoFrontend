import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MENSAJE_TIMEOUT,
  TIMEOUT_REQUEST_MS,
  TIMEOUT_SUBIDA_MS,
  fetchConTimeout,
} from "./http.js";

describe("fetchConTimeout", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resuelve con la respuesta cuando el fetch responde a tiempo", async () => {
    const respuesta = { ok: true, text: async () => "{}" };
    global.fetch = vi.fn().mockResolvedValue(respuesta);

    await expect(fetchConTimeout("http://api/x")).resolves.toBe(respuesta);
  });

  it("adjunta un AbortSignal al fetch para poder cortarlo", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await fetchConTimeout("http://api/x", { method: "POST" });

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.method).toBe("POST");
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it("un fetch que nunca resuelve rechaza dentro del timeout con un mensaje legible", async () => {
    // Fetch colgado (distinto de rechazado): la promesa jamás se asienta.
    // Sin el timeout, este await quedaría esperando para siempre — que es
    // exactamente el spinner eterno que este helper existe para evitar.
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    await expect(fetchConTimeout("http://api/x", {}, 30)).rejects.toThrow(MENSAJE_TIMEOUT);
  });

  it("convierte un AbortError del fetch real en el mismo mensaje legible", async () => {
    // El fetch real rechaza con AbortError cuando su señal se aborta; ese
    // nombre técnico no puede llegar a la pantalla como está.
    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";
    global.fetch = vi.fn().mockRejectedValue(abortError);

    await expect(fetchConTimeout("http://api/x")).rejects.toThrow(MENSAJE_TIMEOUT);
  });

  it("deja pasar sin traducir los errores que no son de timeout", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(fetchConTimeout("http://api/x")).rejects.toThrow("Failed to fetch");
  });

  it("expone un timeout de subida mayor que el de una request común", () => {
    expect(TIMEOUT_SUBIDA_MS).toBeGreaterThan(TIMEOUT_REQUEST_MS);
  });
});
