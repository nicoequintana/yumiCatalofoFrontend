import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SeccionBannerPromocion from "./SeccionBannerPromocion.jsx";

/**
 * Mismos gotchas que `SeccionBanner.test.jsx` (campañas), de donde este
 * componente se espeja:
 *
 * 1. `userEvent.type` reserva `{`/`}` para teclas especiales — hay que
 *    escaparlas (`{{dias}}`) o el marcador nunca llega al campo.
 * 2. El regex del aviso también podría matchear una ayuda estática que
 *    mencione "cartel" fuera del aviso dinámico — acá NO se puso esa ayuda
 *    estática en el texto del banner (a diferencia de campañas), así que no
 *    aplica, pero los asserts igual afirman sobre "no del banner", la frase
 *    exclusiva del aviso, para no depender de esa casualidad.
 */

function promo(overrides = {}) {
  return {
    id: 7,
    nombre: "Promo Hogar",
    bannerEnHome: false,
    bannerTitulo: "",
    bannerTexto: "",
    bannerArteUrl: null,
    ...overrides,
  };
}

function montar(props = {}) {
  return render(
    <SeccionBannerPromocion
      promocion={promo()}
      guardando={false}
      onGuardar={vi.fn()}
      {...props}
    />,
  );
}

/** Un `File` con `size` forzado, sin materializar los bytes — mismo helper que `SeccionBanner.test.jsx`. */
function archivoPesado(nombre, tipo, bytes) {
  const file = new File(["x"], nombre, { type: tipo });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

const MB = 1024 * 1024;

describe("SeccionBannerPromocion", () => {
  it("el título y el texto del banner ya no son campos editables: el texto vive en la imagen (2026-09-14)", () => {
    // Hasta el 13/09/2026 acá se tipeaba en "Título" y "Texto del banner" para
    // probar el aviso del marcador `{dias}`. Decisión de usuario 2026-09-14:
    // el admin dejó de escribir esos dos campos —solo decide si se muestra y
    // qué imagen sube—, así que se ocultaron (`MOSTRAR_TEXTOS_BANNER = false`,
    // mismo criterio que `SeccionBanner.jsx` de campañas).
    montar();

    expect(screen.queryByLabelText(/título/i)).toBeNull();
    expect(screen.queryByLabelText(/texto del banner/i)).toBeNull();
  });

  it("ya no hay selector de color ni campo de texto del botón", () => {
    // 06/09/2026: el slide entero pasó a ser el enlace, así que el CTA quedó
    // como una señal de copy fijo y el molde sin arte va siempre en el color de
    // marca. Mismo borrado que en `SeccionBanner` (campañas): dejarlos en el
    // formulario haría que el admin edite algo que ninguna pantalla lee.
    montar();

    expect(screen.queryByLabelText(/texto del botón/i)).toBeNull();
    expect(screen.queryByLabelText(/color del slide/i)).toBeNull();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("no ofrece ningún selector de destino del CTA", () => {
    // A diferencia de campañas: el destino se deriva del id de la promoción en
    // el backend (`/coleccion?promocion=<id>`), así que acá no hay nada que
    // elegir.
    montar();

    expect(screen.queryByText(/destino/i)).not.toBeInTheDocument();
  });

  it("guarda solo los tres campos que quedaron del banner", async () => {
    // El payload es un literal explícito, no un spread de `valores`: mandar
    // `bannerCtaTexto`/`bannerColor` sería escribir columnas inertes desde una
    // pantalla que ya no las edita.
    const usuario = userEvent.setup();
    const onGuardar = vi.fn();
    montar({ promocion: promo({ bannerTitulo: "Hogar" }), onGuardar });

    await usuario.click(screen.getByRole("button", { name: /guardar/i }));

    expect(onGuardar).toHaveBeenCalledWith({
      bannerEnHome: false,
      bannerTitulo: "Hogar",
      bannerTexto: null,
    });
  });

  it("sube el arte elegido", () => {
    const onSubirArte = vi.fn();
    montar({ onSubirArte });

    fireEvent.change(screen.getByLabelText(/Subir arte del slide/i), {
      target: { files: [new File(["x"], "arte.png", { type: "image/png" })] },
    });

    expect(onSubirArte).toHaveBeenCalledTimes(1);
    expect(onSubirArte.mock.calls[0][0].name).toBe("arte.png");
  });

  it("limpia el input después de elegir un archivo, para poder reintentar con el mismo", () => {
    montar({ onSubirArte: vi.fn() });

    const input = screen.getByLabelText(/Subir arte del slide/i);
    fireEvent.change(input, {
      target: { files: [new File(["x"], "arte.png", { type: "image/png" })] },
    });

    expect(input.value).toBe("");
  });

  it("rechaza un formato de arte no admitido, sin avisar al padre", () => {
    const onSubirArte = vi.fn();
    montar({ onSubirArte });

    fireEvent.change(screen.getByLabelText(/Subir arte del slide/i), {
      target: { files: [new File(["x"], "doc.pdf", { type: "application/pdf" })] },
    });

    expect(screen.getByText(/Formato de imagen no admitido/i)).toBeInTheDocument();
    expect(onSubirArte).not.toHaveBeenCalled();
  });

  it("rechaza un arte que supera los 15MB, sin avisar al padre", () => {
    const onSubirArte = vi.fn();
    montar({ onSubirArte });

    fireEvent.change(screen.getByLabelText(/Subir arte del slide/i), {
      target: { files: [archivoPesado("grande.png", "image/png", 15 * MB + 1)] },
    });

    expect(screen.getByText(/máximo 15MB/i)).toBeInTheDocument();
    expect(onSubirArte).not.toHaveBeenCalled();
  });

  it("quita el arte guardado", async () => {
    const usuario = userEvent.setup();
    const onQuitarArte = vi.fn();
    montar({
      promocion: promo({ bannerArteUrl: "https://cdn/arte.png" }),
      onQuitarArte,
    });

    await usuario.click(screen.getByRole("button", { name: "Quitar" }));

    expect(onQuitarArte).toHaveBeenCalledTimes(1);
  });

  it("el preview usa el mismo SlideCampania de la home", () => {
    // El título ya no se pinta como texto (decisión de usuario 2026-09-14):
    // lo que se puede afirmar es que el preview renderiza el molde de marca
    // de `SlideCampania` sin arte, no un renderer distinto.
    const { container } = montar({ promocion: promo({ bannerTitulo: "Hogar" }) });

    expect(screen.getByTestId("preview-banner")).not.toHaveTextContent("Hogar");
    expect(container.querySelector(".bg-primary")).not.toBeNull();
  });
});
