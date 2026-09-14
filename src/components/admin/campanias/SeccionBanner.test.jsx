import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SeccionBanner from "./SeccionBanner.jsx";

const VALORES = {
  bannerEnHome: false,
  bannerTitulo: "",
  bannerTexto: "",
  modalCtaTipo: "CATALOGO",
};

/**
 * `ctaTextoPorDefecto` sigue llegando porque es del CARTEL, que conserva su
 * campo editable. El banner ya no lo usa: su CTA es copy fijo del componente.
 */
const OPCIONES = {
  ctaTextoPorDefecto: "Ver más",
};

function montar(props = {}) {
  return render(
    <SeccionBanner
      valores={VALORES}
      editar={vi.fn()}
      opciones={OPCIONES}
      campania={null}
      guardando={false}
      esEdicion={false}
      {...props}
    />,
  );
}

/** Un `File` con `size` forzado, sin materializar los bytes — mismo helper que `MediaUploader.test.jsx`. */
function archivoPesado(nombre, tipo, bytes) {
  const file = new File(["x"], nombre, { type: tipo });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

const MB = 1024 * 1024;

describe("SeccionBanner", () => {
  // El banner NO tiene contador de días —ese es del cartel, que conserva
  // `modalFechaObjetivo`—: el backend rechaza `{dias}` en `bannerTitulo` y
  // `bannerTexto` desde esta misma task. Invitar al admin a escribirlo acá es
  // peor que el bug original, porque induce directo al 400 que se acaba de
  // agregar.
  it("no menciona el marcador {dias} en ninguna ayuda de campo", () => {
    montar();

    expect(screen.queryByText(/\{dias\}/)).toBeNull();
  });

  it("ya no hay selector de color ni campo de texto del botón", () => {
    // 06/09/2026: el slide entero pasó a ser el enlace, así que el CTA quedó
    // como una señal de copy fijo y el molde sin arte va siempre en el color de
    // marca. Los dos campos dejaron de ser decisiones, y dejarlos en el
    // formulario haría que el admin edite algo que nadie lee: el guardado
    // pasaría igual y el cambio simplemente no aparecería en la home.
    montar();

    expect(screen.queryByLabelText(/Texto del botón del banner/i)).toBeNull();
    expect(screen.queryByText(/Color del slide/i)).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("el título y el texto del banner ya no son campos editables: el texto vive en la imagen (2026-09-14)", () => {
    // Hasta el 13/09/2026 acá se tipeaba en "Texto del banner" y "Título del
    // banner" para probar el aviso del marcador `{dias}`. Decisión de usuario
    // 2026-09-14: el admin dejó de escribir esos dos campos —solo decide si
    // se muestra y qué imagen sube—, así que los `<input>` se ocultaron
    // (`MOSTRAR_TEXTOS_BANNER = false`). `avisoMarcadorDias` y el resto de la
    // lógica siguen en el componente para cuando se reactive el campo, pero
    // no hay nada que tipear hoy.
    montar();

    expect(screen.queryByLabelText(/Título del banner/i)).toBeNull();
    expect(screen.queryByLabelText(/Texto del banner/i)).toBeNull();
  });

  it("en el alta no ofrece subir arte todavía: hace falta guardar primero", () => {
    // Mismo criterio que el Doodle de `SeccionCampania`: sube a un endpoint
    // propio que necesita un id, y una campaña sin guardar no tiene uno.
    montar({ esEdicion: false });

    expect(screen.getByText(/Guardá la campaña para subir el arte/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Subir arte del slide/i)).not.toBeInTheDocument();
  });

  it("sube el arte elegido", () => {
    const onSubirArte = vi.fn();
    montar({ esEdicion: true, onSubirArte });

    fireEvent.change(screen.getByLabelText(/Subir arte del slide/i), {
      target: { files: [new File(["x"], "arte.png", { type: "image/png" })] },
    });

    expect(onSubirArte).toHaveBeenCalledTimes(1);
    expect(onSubirArte.mock.calls[0][0].name).toBe("arte.png");
  });

  it("limpia el input después de elegir un archivo, para poder reintentar con el mismo", () => {
    montar({ esEdicion: true, onSubirArte: vi.fn() });

    const input = screen.getByLabelText(/Subir arte del slide/i);
    fireEvent.change(input, {
      target: { files: [new File(["x"], "arte.png", { type: "image/png" })] },
    });

    expect(input.value).toBe("");
  });

  it("rechaza un formato de arte no admitido, sin avisar al padre", () => {
    const onSubirArte = vi.fn();
    montar({ esEdicion: true, onSubirArte });

    fireEvent.change(screen.getByLabelText(/Subir arte del slide/i), {
      target: { files: [new File(["x"], "doc.pdf", { type: "application/pdf" })] },
    });

    expect(screen.getByText(/Formato de imagen no admitido/i)).toBeInTheDocument();
    expect(onSubirArte).not.toHaveBeenCalled();
  });

  it("rechaza un arte que supera los 15MB, sin avisar al padre", () => {
    const onSubirArte = vi.fn();
    montar({ esEdicion: true, onSubirArte });

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
      esEdicion: true,
      campania: { id: 1, nombre: "Primavera", bannerArteUrl: "https://cdn/arte.png" },
      onQuitarArte,
    });

    await usuario.click(screen.getByRole("button", { name: "Quitar" }));

    expect(onQuitarArte).toHaveBeenCalledTimes(1);
  });
});

/**
 * Área táctil de las acciones del arte del slide.
 *
 * ⚠️ **Esta pantalla se le escapó al barrido de la auditoría original**: el
 * editor de campaña es una RUTA propia (`/catalogo/admin/campanias/:id/editar`)
 * y el bloque del arte solo se renderiza en modo EDICIÓN, así que ni el
 * recorrido del listado ni la ruta de alta llegaban hasta acá.
 *
 * Medido en navegador el 07/09/2026 a 1280×800 sobre
 * `/catalogo/admin/campanias/1054/editar`, con `elementFromPoint` —el área
 * EFECTIVA, no la caja declarada—: "Reemplazar" daba 93×33 y "Quitar" 86×33.
 * El ancho ya sobraba; el que faltaba era el ALTO, contra los 44 de WCAG 2.5.8.
 *
 * jsdom no hace layout: acá se afirma sobre la CLASE declarada.
 */
describe("SeccionBanner — área táctil (44px)", () => {
  it.each([["Reemplazar"], ["Quitar"]])(
    "«%s» declara el mínimo táctil de 44px de alto",
    (nombre) => {
      montar({
        esEdicion: true,
        campania: { id: 1, nombre: "Primavera", bannerArteUrl: "https://cdn/arte.png" },
      });

      const boton = screen.getByRole("button", { name: nombre });
      expect(boton.className.split(" ")).toContain("min-h-11");
    },
  );

  it("«Subir arte» declara el mínimo táctil de 44px de alto", () => {
    montar({ esEdicion: true, campania: { id: 1, nombre: "Primavera" } });

    const boton = screen.getByRole("button", { name: "Subir arte" });
    expect(boton.className.split(" ")).toContain("min-h-11");
  });
});
