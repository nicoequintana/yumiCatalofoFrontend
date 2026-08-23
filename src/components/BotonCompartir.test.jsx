import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BotonCompartir from "./BotonCompartir.jsx";
import * as productsApi from "../api/products.js";

vi.mock("../api/products.js");

const PRODUCTO = { id: 5, nombre: "Reloj Clásico" };

// jsdom no define ni `navigator.share` ni `navigator.clipboard`; cada test
// instala lo que necesita y lo limpia después.
function instalarClipboard(writeText) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText ? { writeText } : undefined,
  });
}

function instalarShare(share) {
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: share,
    writable: true,
  });
}

async function click() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button"));
  });
}

describe("BotonCompartir", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.registrarCompartido.mockResolvedValue(undefined);
  });

  afterEach(() => {
    delete navigator.clipboard;
    delete navigator.share;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("usa la Web Share API cuando está disponible", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    instalarShare(share);

    render(<BotonCompartir producto={PRODUCTO} />);
    await click();

    expect(share).toHaveBeenCalledWith({ title: "Reloj Clásico", url: window.location.href });
    expect(productsApi.registrarCompartido).toHaveBeenCalledWith(5);
  });

  it("sin Web Share copia el link al portapapeles y avisa", async () => {
    instalarShare(undefined);
    instalarClipboard(vi.fn().mockResolvedValue(undefined));

    render(<BotonCompartir producto={PRODUCTO} />);
    await click();

    expect(screen.getByText(/link copiado/i)).toBeInTheDocument();
  });

  it("con navigator.clipboard undefined (contexto HTTP) no explota y muestra un fallback", async () => {
    instalarShare(undefined);
    instalarClipboard(undefined);

    render(<BotonCompartir producto={PRODUCTO} />);
    await click();

    expect(screen.getByText(/no se pudo copiar/i)).toBeInTheDocument();
  });

  it("si writeText rechaza (permiso denegado) muestra el fallback en vez de una unhandled rejection", async () => {
    instalarShare(undefined);
    instalarClipboard(vi.fn().mockRejectedValue(new Error("NotAllowedError")));

    render(<BotonCompartir producto={PRODUCTO} />);
    await click();

    expect(screen.getByText(/no se pudo copiar/i)).toBeInTheDocument();
  });

  it("el aviso (copiado o fallback) revierte solo después de un momento", async () => {
    vi.useFakeTimers();
    instalarShare(undefined);
    instalarClipboard(vi.fn().mockResolvedValue(undefined));

    render(<BotonCompartir producto={PRODUCTO} />);
    await click();

    expect(screen.getByText(/link copiado/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText(/compartir/i)).toBeInTheDocument();
  });

  it("limpia el timer de feedback al desmontar (sin timers vivos)", async () => {
    vi.useFakeTimers();
    instalarShare(undefined);
    instalarClipboard(vi.fn().mockResolvedValue(undefined));

    const { unmount } = render(<BotonCompartir producto={PRODUCTO} />);
    await click();

    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
