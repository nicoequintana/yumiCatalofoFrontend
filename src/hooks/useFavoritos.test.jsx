import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../api/products.js", () => ({
  registrarFavorito: vi.fn(),
}));

import { registrarFavorito } from "../api/products.js";
import useFavoritos from "./useFavoritos.js";

describe("useFavoritos — toggleFavorito y registrarFavorito", () => {
  beforeEach(() => {
    // This environment's `localStorage` global is unreliable (Node's
    // `--localstorage-file` flag shadows jsdom's implementation without a
    // configured path), so state is reset through the hook's own API
    // instead of a direct `localStorage.clear()` — `useFavoritos.js` already
    // tolerates a broken localStorage internally (see its try/catch), which
    // is exactly what lets this work as a reset mechanism here.
    const { result } = renderHook(() => useFavoritos());
    act(() => {
      result.current.establecerFavoritos([]);
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispara registrarFavorito al AGREGAR un favorito", () => {
    const { result } = renderHook(() => useFavoritos());

    act(() => {
      result.current.toggleFavorito(7);
    });

    expect(result.current.esFavorito(7)).toBe(true);
    expect(registrarFavorito).toHaveBeenCalledTimes(1);
    expect(registrarFavorito).toHaveBeenCalledWith(7);
  });

  it("NO dispara registrarFavorito al QUITAR un favorito", () => {
    const { result } = renderHook(() => useFavoritos());

    act(() => {
      result.current.toggleFavorito(7); // agrega
    });
    vi.clearAllMocks();

    act(() => {
      result.current.toggleFavorito(7); // quita
    });

    expect(result.current.esFavorito(7)).toBe(false);
    expect(registrarFavorito).not.toHaveBeenCalled();
  });

  it("actualiza el estado local incluso si registrarFavorito rechaza (no bloquea el toggle)", () => {
    registrarFavorito.mockRejectedValueOnce(new Error("network error"));

    const { result } = renderHook(() => useFavoritos());

    expect(() => {
      act(() => {
        result.current.toggleFavorito(9);
      });
    }).not.toThrow();

    expect(result.current.esFavorito(9)).toBe(true);
  });

  it("mantiene sincronizados varios mounts del hook (module-level listeners) sin duplicar llamadas", () => {
    const a = renderHook(() => useFavoritos());
    const b = renderHook(() => useFavoritos());

    act(() => {
      a.result.current.toggleFavorito(3);
    });

    expect(a.result.current.esFavorito(3)).toBe(true);
    expect(b.result.current.esFavorito(3)).toBe(true);
    expect(registrarFavorito).toHaveBeenCalledTimes(1);
    expect(registrarFavorito).toHaveBeenCalledWith(3);
  });
});
