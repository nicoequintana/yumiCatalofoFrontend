import { render, waitFor } from "@testing-library/react";
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
      text: "signin_with",
      locale: "es",
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

    await vi.advanceTimersByTimeAsync(5000);

    expect(onNoDisponible).toHaveBeenCalledTimes(1);
    expect(container).toBeEmptyDOMElement();
  });
});
