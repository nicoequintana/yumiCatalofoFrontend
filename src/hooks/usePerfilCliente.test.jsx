import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import usePerfilCliente, {
  _reiniciarParaTests,
  invalidarPerfil,
  refrescarPerfil,
} from "./usePerfilCliente.js";

function respuesta(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: () => Promise.resolve(body === undefined ? "" : JSON.stringify(body)),
  };
}

afterEach(() => {
  _reiniciarParaTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("usePerfilCliente — con sesión", () => {
  it("empieza no resuelto y termina con el perfil", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        respuesta(200, { id: 1, email: "a@gmail.com", nombre: "Ana", telefono: "1", dni: "111" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePerfilCliente());
    expect(result.current.resuelto).toBe(false);

    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(result.current.perfil).toEqual({
      id: 1,
      email: "a@gmail.com",
      nombre: "Ana",
      telefono: "1",
      dni: "111",
    });
    expect(result.current.error).toBeNull();
    // credentials: include, aunque este fetch NO pase por pedirCliente.
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "include" });
  });

  it("le pega a GET /api/cuenta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => usePerfilCliente());
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/api\/cuenta$/);
  });

  it("dos instancias montadas a la vez comparten UN solo fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => usePerfilCliente());
    renderHook(() => usePerfilCliente());

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // Un tick más para asegurarse de que un segundo fetch, si lo hubiera,
    // ya se habría disparado.
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("usePerfilCliente — sin sesión (401)", () => {
  it("perfil null, resuelto true, SIN error: un 401 es el estado normal de un anónimo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(respuesta(401, { error: "sin sesión", codigo: "SESION_INVALIDA" })),
    );

    const { result } = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(result.current.resuelto).toBe(true));

    expect(result.current.perfil).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

describe("usePerfilCliente — falla de red o 503", () => {
  it("perfil null, resuelto true, CON error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const { result } = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(result.current.resuelto).toBe(true));

    expect(result.current.perfil).toBeNull();
    expect(result.current.error).toBe("No pudimos verificar tu sesión.");
  });

  it("un 503 VERIFICACION_NO_DISPONIBLE deja error, no sesión ausente, con el texto del backend", async () => {
    // El cuerpo es el REAL: `errorHandler.js` emite `{error, codigo}` en todo
    // error, y `verificacionNoDisponible()` arma ese mensaje exacto —
    // terminado en ", reintentá.", que NO es el genérico de este módulo. Esa
    // diferencia es a propósito: con el texto genérico acá, el test pasaría
    // igual si la rama que hace eco del `error` del backend desapareciera.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        respuesta(503, {
          error: "No pudimos verificar tu sesión, reintentá.",
          codigo: "VERIFICACION_NO_DISPONIBLE",
        }),
      ),
    );

    const { result } = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(result.current.resuelto).toBe(true));

    expect(result.current.perfil).toBeNull();
    expect(result.current.error).toBe("No pudimos verificar tu sesión, reintentá.");
  });

  it("un 502 con cuerpo ilegible cae al mensaje genérico, no a un error vacío", async () => {
    // El 502/504 de nginx con el backend caído trae HTML: `parsearCuerpo`
    // devuelve `null` y no hay ningún `error` del que hacer eco. Es la rama
    // `?? MENSAJE_ERROR`, y necesita su propio caso: el del 503 de arriba
    // nunca la toca.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 502,
        ok: false,
        text: () => Promise.resolve("<html>502 Bad Gateway</html>"),
      }),
    );

    const { result } = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(result.current.resuelto).toBe(true));

    expect(result.current.perfil).toBeNull();
    expect(result.current.error).toBe("No pudimos verificar tu sesión.");
  });
});

describe("invalidarPerfil", () => {
  it("tras invalidarPerfil() el siguiente consumidor vuelve a hacer fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const primero = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(primero.result.current.resuelto).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      invalidarPerfil();
    });

    const segundo = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(segundo.result.current.resuelto).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deja el perfil en cero sin disparar un fetch por sí solo", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1, nombre: "Ana" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(result.current.perfil).toEqual({ id: 1, nombre: "Ana" }));

    act(() => {
      invalidarPerfil();
    });

    // El montaje vivo ve el estado en cero: el dato viejo no puede seguir
    // en pantalla después de un logout o de completar los datos.
    expect(result.current).toEqual({ perfil: null, resuelto: false, error: null });
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("refrescarPerfil", () => {
  it("dispara un fetch nuevo aunque ya haya uno resuelto", async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { id: 1 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(result.current.resuelto).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      await refrescarPerfil();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("tras un error, reintentar limpia el error y deja el perfil", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValue(respuesta(200, { id: 1, nombre: "Ana" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePerfilCliente());
    await waitFor(() => expect(result.current.error).toBe("No pudimos verificar tu sesión."));

    await act(async () => {
      await refrescarPerfil();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.perfil).toEqual({ id: 1, nombre: "Ana" });
    expect(result.current.resuelto).toBe(true);
  });
});
