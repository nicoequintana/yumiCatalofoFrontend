import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { ToastProvider } from "../context/ToastContext.jsx";
import VitrinasCampania from "./VitrinasCampania.jsx";

function Proveedores({ children }) {
  return (
    <MemoryRouter>
      <ToastProvider>{children}</ToastProvider>
    </MemoryRouter>
  );
}

function producto(extra = {}) {
  return {
    id: 1,
    nombre: "Termo Stanley",
    precio: "48000",
    stock: 5,
    fotos: [],
    etiqueta: null,
    categoria: null,
    ...extra,
  };
}

function productos(n, prefijo = "P") {
  return Array.from({ length: n }, (_, i) =>
    producto({ id: `${prefijo}${i + 1}`, nombre: `${prefijo} ${i + 1}` }),
  );
}

function vitrina(extra = {}) {
  return { campaniaId: 1, nombre: "Primavera", productos: productos(4), ...extra };
}

describe("VitrinasCampania", () => {
  it("sin vitrinas no renderiza nada", () => {
    const { container } = render(<VitrinasCampania vitrinas={[]} error={null} />, {
      wrapper: Proveedores,
    });

    expect(container).toBeEmptyDOMElement();
  });

  it("sin props tampoco renderiza nada", () => {
    const { container } = render(<VitrinasCampania />, { wrapper: Proveedores });

    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza una sección por campaña, con su título y su link a /coleccion?campania=ID", () => {
    render(
      <VitrinasCampania
        vitrinas={[vitrina(), vitrina({ campaniaId: 2, nombre: "Navidad", productos: productos(4, "N") })]}
        error={null}
      />,
      { wrapper: Proveedores },
    );

    expect(screen.getByRole("heading", { level: 2, name: "Primavera" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Navidad" })).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /ver todo/i });
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/coleccion?campania=1",
      "/coleccion?campania=2",
    ]);
  });

  it("con 7 productos dibuja solo la fila completa: 4 tarjetas", () => {
    render(<VitrinasCampania vitrinas={[vitrina({ productos: productos(7) })]} error={null} />, {
      wrapper: Proveedores,
    });

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
  });

  it("con 8 productos dibuja las dos filas: 8 tarjetas", () => {
    render(<VitrinasCampania vitrinas={[vitrina({ productos: productos(8) })]} error={null} />, {
      wrapper: Proveedores,
    });

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
  });

  it("nunca pasa de 8 tarjetas por vidriera, aunque el backend mande más", () => {
    render(<VitrinasCampania vitrinas={[vitrina({ productos: productos(11) })]} error={null} />, {
      wrapper: Proveedores,
    });

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(8);
  });

  it("cada vidriera recorta sus filas de forma independiente", () => {
    render(
      <VitrinasCampania
        vitrinas={[
          vitrina({ campaniaId: 1, nombre: "Primavera", productos: productos(7, "P") }),
          vitrina({ campaniaId: 2, nombre: "Navidad", productos: productos(8, "N") }),
        ]}
        error={null}
      />,
      { wrapper: Proveedores },
    );

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(12);
  });

  it("distingue error de vacío: un solo EstadoVacio, sin secciones de campaña", () => {
    render(<VitrinasCampania vitrinas={[]} error="Revisá tu conexión e intentá de nuevo." />, {
      wrapper: Proveedores,
    });

    expect(screen.getByText(/revisá tu conexión/i)).toBeInTheDocument();
    expect(screen.getByText("cloud_off")).toBeInTheDocument();
    expect(screen.getByText("No se pudieron cargar las campañas")).toBeInTheDocument();
    // Ninguna sección de campaña: ni links "Ver todo" ni tarjetas de producto.
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});
