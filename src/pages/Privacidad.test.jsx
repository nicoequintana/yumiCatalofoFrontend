import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const configContactoMock = vi.fn();
vi.mock("../hooks/useConfigContacto.js", () => ({ default: () => configContactoMock() }));

const { default: Privacidad } = await import("./Privacidad.jsx");

const CONTACTO_VACIO = {
  whatsapp: { numero: null, dentroDeHorario: null, textoHorario: null },
  email: null,
  instagram: null,
  facebook: null,
  tiktok: null,
  direccion: null,
};

function montar() {
  return render(
    <MemoryRouter initialEntries={["/privacidad"]}>
      <Privacidad />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  configContactoMock.mockReturnValue({ contacto: CONTACTO_VACIO, resuelto: true, error: null });
});

describe("Privacidad", () => {
  it("lleva un único h1 con el título de la política", () => {
    const { container } = montar();

    expect(screen.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeInTheDocument();
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("muestra las secciones clave de la política", () => {
    montar();

    for (const titulo of [
      /qué datos recopilamos/i,
      /para qué usamos tus datos/i,
      /con quién compartimos datos/i,
      /almacenamiento en tu navegador/i,
      /cuánto tiempo conservamos/i,
      /cómo protegemos tus datos/i,
      /tus derechos/i,
      /menores de edad/i,
      /cambios en esta política/i,
    ]) {
      expect(screen.getByRole("heading", { level: 2, name: titulo })).toBeInTheDocument();
    }
  });

  it("menciona la Ley 25.326 y la autoridad de control", () => {
    montar();

    expect(screen.getAllByText(/ley 25\.326/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/agencia de acceso a la información pública/i).length).toBeGreaterThan(0);
  });

  it("muestra la fecha de última actualización", () => {
    montar();

    expect(screen.getByText("Última actualización: 14/09/2026")).toBeInTheDocument();
  });

  it("el email de contacto sale de la configuración de contacto", () => {
    configContactoMock.mockReturnValue({
      contacto: { ...CONTACTO_VACIO, email: "privacidad@yima.com.ar" },
      resuelto: true,
      error: null,
    });

    montar();

    const enlaces = screen.getAllByRole("link", { name: "privacidad@yima.com.ar" });
    expect(enlaces.length).toBeGreaterThan(0);
    for (const enlace of enlaces) {
      expect(enlace).toHaveAttribute("href", "mailto:privacidad@yima.com.ar");
    }
  });

  it("sin email configurado no arma un mailto: y deriva a los canales del sitio", () => {
    montar();

    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.getAllByText(/canales de contacto publicados en este sitio/i).length).toBeGreaterThan(0);
  });

  it("declara título y canonical propios", async () => {
    montar();

    await waitFor(() => expect(document.title).toBe("Política de privacidad — YIMA"));
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      "href",
      "https://yima-productos.com/privacidad",
    );
  });
});
