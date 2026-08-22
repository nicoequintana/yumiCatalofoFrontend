import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MENSAJE_TIMEOUT } from "./http.js";
import { clearToken, fetchAutenticado, getToken, setToken } from "./authClient.js";

// En este entorno `globalThis.localStorage` es un objeto vacío sin métodos
// (el flag `--localstorage-file` de Node tapa la implementación de jsdom sin
// un path configurado), así que no se puede usar ni espiar con `vi.spyOn`.
// Se instala un fake completo sobre el global (la propiedad es configurable)
// y se restaura al terminar — mismo patrón que `useTemaAdmin.test.jsx`.
const localStorageOriginal = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function instalarStorage({ valores = {}, falla = false } = {}) {
  const datos = new Map(Object.entries(valores));
  const falso = {
    getItem: vi.fn((clave) => {
      if (falla) throw new Error("SecurityError: storage bloqueado");
      return datos.has(clave) ? datos.get(clave) : null;
    }),
    setItem: vi.fn((clave, valor) => {
      if (falla) throw new Error("SecurityError: storage bloqueado");
      datos.set(clave, valor);
    }),
    removeItem: vi.fn((clave) => {
      if (falla) throw new Error("SecurityError: storage bloqueado");
      datos.delete(clave);
    }),
    clear: vi.fn(),
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: falso,
    configurable: true,
    writable: true,
  });
  return falso;
}

function restaurarStorage() {
  if (localStorageOriginal) {
    Object.defineProperty(globalThis, "localStorage", localStorageOriginal);
  } else {
    delete globalThis.localStorage;
  }
}

const locationOriginal = window.location;

function instalarLocation({ pathname = "/catalogo/admin/ordenes", search = "?page=2" } = {}) {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...locationOriginal, pathname, search, assign },
  });
  return assign;
}

function restaurarLocation() {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: locationOriginal,
  });
}

afterEach(() => {
  restaurarStorage();
  restaurarLocation();
  vi.restoreAllMocks();
});

describe("getToken / setToken / clearToken", () => {
  it("guardan y leen el token contra localStorage", () => {
    instalarStorage();

    setToken("jwt-123");
    expect(getToken()).toBe("jwt-123");

    clearToken();
    expect(getToken()).toBeNull();
  });

  it("getToken devuelve null cuando el storage está bloqueado (no revienta el render)", () => {
    instalarStorage({ falla: true });

    expect(getToken()).toBeNull();
  });

  it("setToken es un no-op silencioso cuando el storage está bloqueado", () => {
    instalarStorage({ falla: true });

    expect(() => setToken("jwt-123")).not.toThrow();
  });

  it("clearToken es un no-op silencioso cuando el storage está bloqueado", () => {
    instalarStorage({ falla: true });

    expect(() => clearToken()).not.toThrow();
  });
});

describe("fetchAutenticado", () => {
  beforeEach(() => {
    instalarStorage({ valores: { admin_token: "jwt-123" } });
  });

  it("adjunta el header Authorization con el token guardado", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true });

    await fetchAutenticado("http://api/x");

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.headers.get("Authorization")).toBe("Bearer jwt-123");
  });

  it("adjunta una señal de timeout a la request", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 200, ok: true });

    await fetchAutenticado("http://api/x");

    const [, opciones] = global.fetch.mock.calls[0];
    expect(opciones.signal).toBeInstanceOf(AbortSignal);
  });

  it("una request colgada rechaza dentro del timeout con el mensaje legible", async () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    await expect(fetchAutenticado("http://api/x", {}, 30)).rejects.toThrow(MENSAJE_TIMEOUT);
  });

  describe("ante un 401", () => {
    it("limpia el token y redirige al login preservando el destino en ?volverA=", async () => {
      const assign = instalarLocation({
        pathname: "/catalogo/admin/ordenes",
        search: "?page=2",
      });
      global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false });

      await expect(fetchAutenticado("http://api/x")).rejects.toThrow();

      expect(localStorage.removeItem).toHaveBeenCalledWith("admin_token");
      expect(assign).toHaveBeenCalledTimes(1);
      const destino = assign.mock.calls[0][0];
      expect(destino.startsWith("/catalogo/admin/login?")).toBe(true);
      const params = new URLSearchParams(destino.split("?")[1]);
      expect(params.get("volverA")).toBe("/catalogo/admin/ordenes?page=2");
    });

    it("LANZA en vez de devolver el res, para cortar la ejecución del caller", async () => {
      // Antes devolvía el `res`: el caller parseaba el cuerpo y lanzaba su
      // propio error, que la pantalla mostraba un instante antes de que la
      // redirección recargara — un flash de error sobre un logout.
      instalarLocation();
      global.fetch = vi.fn().mockResolvedValue({ status: 401, ok: false });

      await expect(fetchAutenticado("http://api/x")).rejects.toThrow(/sesión/i);
    });
  });
});
