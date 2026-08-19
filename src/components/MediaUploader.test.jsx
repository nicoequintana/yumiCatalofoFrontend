import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import MediaUploader from "./MediaUploader.jsx";

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

function render_(fotos, props = {}) {
  const onChangeFotos = props.onChangeFotos ?? vi.fn();
  render(
    <MediaUploader
      fotos={fotos}
      video={props.video ?? null}
      onChangeFotos={onChangeFotos}
      onChangeVideo={props.onChangeVideo ?? vi.fn()}
    />,
  );
  return onChangeFotos;
}

function archivo(nombre = "f.png") {
  return new File(["x"], nombre, { type: "image/png" });
}

const CINCO = [
  { id: 1, url: "f1.jpg" },
  { id: 2, url: "f2.jpg" },
  { id: 3, url: "f3.jpg" },
  { id: 4, url: "f4.jpg" },
  { id: 5, url: "f5.jpg" },
];

describe("MediaUploader — tres zonas separadas", () => {
  it("separa portada, imagen del problema y galería", () => {
    render_(CINCO);

    expect(screen.getByText(/Foto de portada/i)).toBeInTheDocument();
    expect(screen.getByText(/¿Qué problema resuelve\?/i)).toBeInTheDocument();
    expect(screen.getByText(/Galería/i)).toBeInTheDocument();
  });

  it("la portada es la foto 0 y la imagen del problema la foto 1", () => {
    render_(CINCO);

    expect(screen.getByAltText("Foto de portada")).toHaveAttribute("src", "f1.jpg");
    expect(screen.getByAltText("Imagen de ¿Qué problema resuelve?")).toHaveAttribute("src", "f2.jpg");
  });

  it("la galería contiene solo las fotos de la 3ra en adelante", () => {
    render_(CINCO);

    expect(screen.getByAltText("Foto 3 de la galería")).toHaveAttribute("src", "f3.jpg");
    expect(screen.getByAltText("Foto 4 de la galería")).toHaveAttribute("src", "f4.jpg");
    expect(screen.queryByAltText("Foto 2 de la galería")).not.toBeInTheDocument();
  });
});

describe("MediaUploader — carga por zona", () => {
  it("la portada cargada entra en la posición 0", () => {
    const onChangeFotos = render_([]);

    fireEvent.change(screen.getByLabelText(/Subir foto de portada/i), {
      target: { files: [archivo("portada.png")] },
    });

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente).toHaveLength(1);
    expect(siguiente[0].file.name).toBe("portada.png");
  });

  it("reemplazar la portada no toca el resto de las fotos", () => {
    const onChangeFotos = render_(CINCO);

    fireEvent.change(screen.getByLabelText(/Reemplazar foto de portada/i), {
      target: { files: [archivo("nueva-portada.png")] },
    });

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente[0].file.name).toBe("nueva-portada.png");
    expect(siguiente.slice(1)).toEqual(CINCO.slice(1));
  });

  it("la imagen del problema entra en la posición 1", () => {
    const onChangeFotos = render_([{ id: 1, url: "f1.jpg" }]);

    fireEvent.change(screen.getByLabelText(/Subir imagen para ¿Qué problema resuelve\?/i), {
      target: { files: [archivo("problema.png")] },
    });

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente[0]).toEqual({ id: 1, url: "f1.jpg" });
    expect(siguiente[1].file.name).toBe("problema.png");
  });

  it("las fotos de galería se agregan al final", () => {
    const onChangeFotos = render_(CINCO.slice(0, 2));

    fireEvent.change(screen.getByLabelText(/Agregar fotos a la galería/i), {
      target: { files: [archivo("g1.png"), archivo("g2.png")] },
    });

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente).toHaveLength(4);
    expect(siguiente[2].file.name).toBe("g1.png");
    expect(siguiente[3].file.name).toBe("g2.png");
  });
});

describe("MediaUploader — el orden de las posiciones no admite huecos", () => {
  it("sin portada no se puede cargar la imagen del problema", () => {
    render_([]);
    expect(screen.getByLabelText(/Subir imagen para ¿Qué problema resuelve\?/i)).toBeDisabled();
  });

  it("sin las dos primeras no se puede cargar la galería", () => {
    render_([{ id: 1, url: "f1.jpg" }]);
    expect(screen.getByLabelText(/Agregar fotos a la galería/i)).toBeDisabled();
  });

  it("con portada e imagen del problema, la galería se habilita", () => {
    render_(CINCO.slice(0, 2));
    expect(screen.getByLabelText(/Agregar fotos a la galería/i)).not.toBeDisabled();
  });
});

describe("MediaUploader — quitar fotos", () => {
  it("quitar la portada asciende a la siguiente y lo deja ver", () => {
    const onChangeFotos = render_(CINCO);

    fireEvent.click(screen.getByLabelText("Quitar foto de portada"));

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente).toEqual(CINCO.slice(1));
  });

  it("quitar la imagen del problema corre la galería una posición", () => {
    const onChangeFotos = render_(CINCO);

    fireEvent.click(screen.getByLabelText("Quitar imagen de ¿Qué problema resuelve?"));

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente).toEqual([CINCO[0], CINCO[2], CINCO[3], CINCO[4]]);
  });

  it("quitar una foto de la galería no toca las dos primeras", () => {
    const onChangeFotos = render_(CINCO);

    fireEvent.click(screen.getByLabelText("Quitar foto 3 de la galería"));

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente).toEqual([CINCO[0], CINCO[1], CINCO[3], CINCO[4]]);
  });
});

describe("MediaUploader — reordenar dentro de la galería", () => {
  it("mueve una foto de galería hacia adelante", () => {
    const onChangeFotos = render_(CINCO);

    fireEvent.click(screen.getByLabelText("Mover foto 3 de la galería hacia adelante"));

    const [siguiente] = onChangeFotos.mock.calls[0];
    expect(siguiente).toEqual([CINCO[0], CINCO[1], CINCO[3], CINCO[2], CINCO[4]]);
  });

  it("no ofrece mover hacia atrás la primera de la galería", () => {
    render_(CINCO);
    expect(screen.queryByLabelText("Mover foto 3 de la galería hacia atrás")).not.toBeInTheDocument();
  });

  it("no ofrece mover hacia adelante la última de la galería", () => {
    render_(CINCO);
    expect(screen.queryByLabelText("Mover foto 5 de la galería hacia adelante")).not.toBeInTheDocument();
  });
});

describe("MediaUploader — límites", () => {
  it("rechaza un formato de foto no admitido", () => {
    render_([]);

    fireEvent.change(screen.getByLabelText(/Subir foto de portada/i), {
      target: { files: [new File(["x"], "doc.pdf", { type: "application/pdf" })] },
    });

    expect(screen.getByText(/Formato de foto no admitido/i)).toBeInTheDocument();
  });

  it("no deja pasar de 10 fotos en total", () => {
    const diez = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, url: `f${i + 1}.jpg` }));
    render_(diez);

    expect(screen.getByLabelText(/Agregar fotos a la galería/i)).toBeDisabled();
  });
});
