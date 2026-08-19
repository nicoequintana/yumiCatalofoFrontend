import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeAll } from "vitest";
import MediaUploader from "./MediaUploader.jsx";

beforeAll(() => {
  global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
  global.URL.revokeObjectURL = vi.fn();
});

describe("MediaUploader — reordenar fotos", () => {
  function fotosDePrueba() {
    return [
      { id: 1, url: "foto1.jpg" },
      { id: 2, url: "foto2.jpg" },
      { id: 3, url: "foto3.jpg" },
    ];
  }

  it("mueve una foto hacia adelante al clickear su flecha derecha", () => {
    const onChangeFotos = vi.fn();
    render(<MediaUploader fotos={fotosDePrueba()} video={null} onChangeFotos={onChangeFotos} onChangeVideo={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Mover foto 1 hacia adelante"));

    expect(onChangeFotos).toHaveBeenCalledWith([
      { id: 2, url: "foto2.jpg" },
      { id: 1, url: "foto1.jpg" },
      { id: 3, url: "foto3.jpg" },
    ]);
  });

  it("mueve una foto hacia atrás al clickear su flecha izquierda", () => {
    const onChangeFotos = vi.fn();
    render(<MediaUploader fotos={fotosDePrueba()} video={null} onChangeFotos={onChangeFotos} onChangeVideo={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("Mover foto 2 hacia atrás"));

    expect(onChangeFotos).toHaveBeenCalledWith([
      { id: 2, url: "foto2.jpg" },
      { id: 1, url: "foto1.jpg" },
      { id: 3, url: "foto3.jpg" },
    ]);
  });

  it("marca la primera foto como Principal", () => {
    render(<MediaUploader fotos={fotosDePrueba()} video={null} onChangeFotos={vi.fn()} onChangeVideo={vi.fn()} />);
    expect(screen.getByText("Principal")).toBeInTheDocument();
  });

  it("no muestra flecha hacia atrás en la primera foto ni hacia adelante en la última", () => {
    render(<MediaUploader fotos={fotosDePrueba()} video={null} onChangeFotos={vi.fn()} onChangeVideo={vi.fn()} />);

    expect(screen.queryByLabelText("Mover foto 1 hacia atrás")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Mover foto 3 hacia adelante")).not.toBeInTheDocument();
  });
});
