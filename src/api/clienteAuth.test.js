import { afterEach, describe, expect, it, vi } from "vitest";
import { pedirCliente } from "./clienteAuth.js";
import * as perfilCliente from "../hooks/usePerfilCliente.js";

// Se mockea el módulo entero: `pedirCliente` solo necesita que
// `invalidarPerfil` sea una función espiable, no el hook real (que además
// haría su propio fetch al importarse).
vi.mock("../hooks/usePerfilCliente.js", () => ({
  invalidarPerfil: vi.fn(),
}));

const locationOriginal = window.location;

function instalarLocation({ pathname = "/cuenta/pedidos", search = "" } = {}) {
  const assign = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...locationOriginal, pathname, search, assign },
  });
  return assign;
}

function restaurarLocation() {
  Object.defineProperty(window, "location", { configurable: true, value: locationOriginal });
}

function respuesta(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body === undefined ? "" : JSON.stringify(body)),
  };
}

function mockFetchSecuencia(respuestas) {
  const fetchMock = vi.fn();
  respuestas.forEach((r) => fetchMock.mockResolvedValueOnce(r));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  restaurarLocation();
  vi.unstubAllGlobals();
  // `vi.restoreAllMocks()` NO alcanza: solo restaura los espías de
  // `vi.spyOn`, y `invalidarPerfil` es un `vi.fn()` que creó la factory de
  // `vi.mock` — su historial de llamadas sobrevive de un caso al otro. Sin
  // este `clearAllMocks`, el caso "con otro codigo NO redirige" ve la llamada
  // que dejó el caso anterior y falla por contagio, no por el código.
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("pedirCliente — camino feliz", () => {
  it("agrega credentials: include y devuelve el cuerpo parseado", async () => {
    const fetchMock = mockFetchSecuencia([respuesta(200, { ok: true })]);

    const body = await pedirCliente("http://api.test/api/cuenta", { method: "GET" });

    expect(body).toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "include" });
  });
});

describe("pedirCliente — 401", () => {
  it("con codigo SESION_INVALIDA invalida el perfil y redirige preservando la ruta actual", async () => {
    const assign = instalarLocation({ pathname: "/cuenta/pedidos", search: "?page=2" });
    mockFetchSecuencia([respuesta(401, { error: "sesión inválida", codigo: "SESION_INVALIDA" })]);

    await expect(pedirCliente("http://api.test/api/cuenta/ordenes")).rejects.toThrow();

    expect(perfilCliente.invalidarPerfil).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(
      "/cuenta/entrar?volverA=" + encodeURIComponent("/cuenta/pedidos?page=2"),
    );
  });

  it("con otro codigo (o sin codigo) NO redirige — es un error normal del endpoint, no una sesión caída", async () => {
    const assign = instalarLocation();
    mockFetchSecuencia([respuesta(401, { error: "Email o contraseña incorrectos." })]);

    await expect(pedirCliente("http://api.test/api/cuenta/login")).rejects.toThrow(
      "Email o contraseña incorrectos.",
    );
    expect(assign).not.toHaveBeenCalled();
    expect(perfilCliente.invalidarPerfil).not.toHaveBeenCalled();
  });
});

describe("pedirCliente — 503 CAPACIDAD", () => {
  it("lanza sin reintentar", async () => {
    const fetchMock = mockFetchSecuencia([respuesta(503, { error: "Ocupado", codigo: "CAPACIDAD" })]);

    await expect(pedirCliente("http://api.test/api/cuenta/registro")).rejects.toMatchObject({
      codigo: "CAPACIDAD",
      status: 503,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("pedirCliente — 503 VERIFICACION_NO_DISPONIBLE", () => {
  it("reintenta exactamente una vez tras 1.5s y devuelve el cuerpo si el reintento anda", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetchSecuencia([
      respuesta(503, { error: "no disponible", codigo: "VERIFICACION_NO_DISPONIBLE" }),
      respuesta(200, { id: 1 }),
    ]);

    const promesa = pedirCliente("http://api.test/api/cuenta");
    await vi.advanceTimersByTimeAsync(1500);
    const body = await promesa;

    expect(body).toEqual({ id: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("si el reintento también falla, lanza un Error (sin un segundo reintento)", async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetchSecuencia([
      respuesta(503, { error: "no disponible", codigo: "VERIFICACION_NO_DISPONIBLE" }),
      respuesta(503, { error: "sigue no disponible", codigo: "VERIFICACION_NO_DISPONIBLE" }),
    ]);

    const promesa = pedirCliente("http://api.test/api/cuenta");
    // Evita un unhandled rejection mientras se avanza el reloj: la promesa
    // recién se espera DESPUÉS del advance, que es cuando efectivamente
    // rechaza.
    promesa.catch(() => {});
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promesa).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("un 401 SESION_INVALIDA EN EL REINTENTO también redirige", async () => {
    // La sesión puede caerse entre el 503 y el reintento (vencimiento,
    // revocación por "cerrar sesión en todos lados"). Si el reintento tratara
    // ese 401 como un error común, este módulo dejaría de ser el ÚNICO lugar
    // que redirige ante SESION_INVALIDA y la pantalla mostraría "No
    // autorizado." sin ofrecer volver a entrar.
    vi.useFakeTimers();
    const assign = instalarLocation({ pathname: "/cuenta/pedidos" });
    mockFetchSecuencia([
      respuesta(503, { error: "no disponible", codigo: "VERIFICACION_NO_DISPONIBLE" }),
      respuesta(401, { error: "No autorizado.", codigo: "SESION_INVALIDA" }),
    ]);

    const promesa = pedirCliente("http://api.test/api/cuenta");
    promesa.catch(() => {});
    await vi.advanceTimersByTimeAsync(1500);

    await expect(promesa).rejects.toThrow();
    expect(perfilCliente.invalidarPerfil).toHaveBeenCalledTimes(1);
    expect(assign).toHaveBeenCalledWith(
      "/cuenta/entrar?volverA=" + encodeURIComponent("/cuenta/pedidos"),
    );
  });
});

describe("pedirCliente — errores con motivo", () => {
  it("expone `motivo` para que la pantalla ramifique sin parsear el mensaje", async () => {
    // `responderMotivo` (backend `lib/cuentaClienteReglas.js`) contesta
    // `400 { error, motivo }` con VENCIDO | USADO | INVALIDO.
    mockFetchSecuencia([respuesta(400, { error: "El link venció.", motivo: "VENCIDO" })]);

    await expect(pedirCliente("http://api.test/api/cuenta/verificar")).rejects.toMatchObject({
      status: 400,
      motivo: "VENCIDO",
    });
  });
});
