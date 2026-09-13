import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getConfigContactoMock = vi.fn();

vi.mock("../api/config.js", () => ({
  getConfigContacto: (...args) => getConfigContactoMock(...args),
}));

const { default: useConfigContacto, reiniciarConfigContacto } = await import(
  "./useConfigContacto.js"
);

const CONTACTO = {
  whatsapp: { numero: "5491122334455", dentroDeHorario: true, textoHorario: "Te respondemos ahora" },
  email: "contacto@yima.com.ar",
  instagram: "https://instagram.com/yima",
  facebook: null,
  tiktok: null,
  direccion: "Av. Ejemplo 1234, CABA",
};

/** Sonda mínima: pinta lo que el hook devuelve. */
function Sonda({ etiqueta = "a" }) {
  const { contacto, resuelto, error } = useConfigContacto();
  return (
    <span data-testid={etiqueta}>
      {contacto.email ?? "sin-email"}|{resuelto ? "resuelto" : "pendiente"}|{error ?? "sin-error"}
    </span>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reiniciarConfigContacto();
  getConfigContactoMock.mockResolvedValue(CONTACTO);
});

afterEach(() => {
  reiniciarConfigContacto();
});

describe("useConfigContacto", () => {
  it("entrega la configuración de contacto que devuelve la API", async () => {
    render(<Sonda />);

    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent("contacto@yima.com.ar|resuelto|sin-error");
    });
  });

  it("arranca en el estado vacío antes de que conteste la API", () => {
    let resolver;
    getConfigContactoMock.mockReturnValue(new Promise((r) => (resolver = r)));

    render(<Sonda />);

    expect(screen.getByTestId("a")).toHaveTextContent("sin-email|pendiente|sin-error");
    resolver(CONTACTO);
  });

  it("hace UN solo fetch aunque monten varias instancias", async () => {
    render(
      <>
        <Sonda etiqueta="a" />
        <Sonda etiqueta="b" />
        <Sonda etiqueta="c" />
      </>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("c")).toHaveTextContent("resuelto");
    });
    expect(getConfigContactoMock).toHaveBeenCalledTimes(1);
  });

  it("un segundo montaje reutiliza el valor ya cargado, sin volver a pedir", async () => {
    const primera = render(<Sonda />);
    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("resuelto"));
    primera.unmount();

    render(<Sonda />);

    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("resuelto"));
    expect(getConfigContactoMock).toHaveBeenCalledTimes(1);
  });

  it("si la API falla, degrada al estado vacío con error y resuelto=true", async () => {
    getConfigContactoMock.mockRejectedValue(new Error("backend caído"));

    render(<Sonda />);

    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent("sin-email|resuelto|");
    });
    expect(screen.getByTestId("a").textContent).not.toContain("sin-error");
  });

  it("desmontar la última instancia no rompe ni deja listeners colgados", async () => {
    const vista = render(<Sonda />);
    await waitFor(() => expect(screen.getByTestId("a")).toHaveTextContent("resuelto"));

    expect(() => vista.unmount()).not.toThrow();
  });
});
