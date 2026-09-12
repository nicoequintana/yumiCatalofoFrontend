import { act, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BotonGmail from "./BotonGmail.jsx";

const SRC_GIS = "https://accounts.google.com/gsi/client";

/**
 * Simula que el script de GIS "carga" definiendo `window.google` y
 * disparando el evento `load` del <script> que el componente inyectó — sin
 * esto, `cargarScriptGis` queda esperando ese evento para siempre.
 */
function simularCargaGis() {
  const initialize = vi.fn();
  const renderButton = vi.fn();
  window.google = { accounts: { id: { initialize, renderButton } } };

  const script = document.querySelector(`script[src="${SRC_GIS}"]`);
  script?.dispatchEvent(new Event("load"));

  return { initialize, renderButton };
}

beforeEach(() => {
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-id-de-prueba");
});

afterEach(() => {
  delete window.google;
  document.querySelectorAll(`script[src="${SRC_GIS}"]`).forEach((s) => s.remove());
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("BotonGmail — sin VITE_GOOGLE_CLIENT_ID", () => {
  it("no renderiza nada", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    const { container } = render(<BotonGmail onCredential={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("avisa por onNoDisponible, igual que cuando el script no carga", () => {
    // Un build sin la variable es el modo de falla MAS probable de los dos, y
    // era el unico que no avisaba: quien envuelve al boton con un rotulo se
    // quedaba con el rotulo solo, señalando un boton que no existe.
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    const onNoDisponible = vi.fn();
    render(<BotonGmail onCredential={() => {}} onNoDisponible={onNoDisponible} />);
    expect(onNoDisponible).toHaveBeenCalledTimes(1);
  });
});

describe("BotonGmail — con Client ID", () => {
  it("inyecta el script de GIS una sola vez, initialize y renderButton", async () => {
    render(<BotonGmail onCredential={() => {}} />);

    await waitFor(() =>
      expect(document.querySelector(`script[src="${SRC_GIS}"]`)).not.toBeNull(),
    );
    const { initialize, renderButton } = simularCargaGis();

    await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
    expect(initialize.mock.calls[0][0]).toMatchObject({
      client_id: "client-id-de-prueba",
      ux_mode: "popup",
    });
    expect(renderButton).toHaveBeenCalledTimes(1);
    expect(renderButton.mock.calls[0][1]).toMatchObject({
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      logo_alignment: "center",
      text: "signin_with",
      locale: "es",
    });
  });

  describe("ancho del botón", () => {
    // Google dibuja el botón en un iframe con el `width` que se le pasa: si es
    // más ancho que el contenedor, se sale de la tarjeta. jsdom no calcula
    // layout, así que el ancho del contenedor se simula.
    const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");

    function simularAnchoContenedor(ancho) {
      Object.defineProperty(HTMLElement.prototype, "clientWidth", {
        configurable: true,
        get: () => ancho,
      });
    }

    afterEach(() => {
      if (original) Object.defineProperty(HTMLElement.prototype, "clientWidth", original);
      else delete HTMLElement.prototype.clientWidth;
    });

    async function anchoPedido() {
      render(<BotonGmail onCredential={() => {}} />);
      await waitFor(() =>
        expect(document.querySelector(`script[src="${SRC_GIS}"]`)).not.toBeNull(),
      );
      const { renderButton } = simularCargaGis();
      await waitFor(() => expect(renderButton).toHaveBeenCalledTimes(1));
      return renderButton.mock.calls[0][1].width;
    }

    it("toma el ancho del contenedor, no uno fijo", async () => {
      simularAnchoContenedor(318);
      expect(await anchoPedido()).toBe("318");
    });

    it("no pasa del máximo de 400 que acepta GIS", async () => {
      simularAnchoContenedor(544);
      expect(await anchoPedido()).toBe("400");
    });
  });

  it("el callback de GIS llama a onCredential con el credential", async () => {
    const onCredential = vi.fn();
    render(<BotonGmail onCredential={onCredential} />);

    await waitFor(() =>
      expect(document.querySelector(`script[src="${SRC_GIS}"]`)).not.toBeNull(),
    );
    const { initialize } = simularCargaGis();
    await waitFor(() => expect(initialize).toHaveBeenCalled());

    const { callback } = initialize.mock.calls[0][0];
    callback({ credential: "cred-abc" });

    expect(onCredential).toHaveBeenCalledWith("cred-abc");
  });

  it("sin window.google en 5s, renderiza null y llama onNoDisponible — nunca redirige", async () => {
    vi.useFakeTimers();
    const onNoDisponible = vi.fn();
    const { container } = render(
      <BotonGmail onCredential={() => {}} onNoDisponible={onNoDisponible} />,
    );

    // `act`: el `setState` que dispara el `setTimeout` necesita comitear
    // antes del assert (mismo patrón que CarruselCampanias.test.jsx).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(onNoDisponible).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();

    // La promesa de `cargarScriptGis` sigue pendiente (nunca se disparó
    // "load" ni "error"): sin asentarla acá, `promesaScript` queda cacheada
    // a nivel de módulo y un test agregado después de este reusaría esa
    // promesa muerta en lugar de pedir un <script> nuevo. Que hoy sea el
    // último test del archivo no es garantía de nada.
    const script = document.querySelector(`script[src="${SRC_GIS}"]`);
    await act(async () => {
      script?.dispatchEvent(new Event("error"));
    });
  });
});
