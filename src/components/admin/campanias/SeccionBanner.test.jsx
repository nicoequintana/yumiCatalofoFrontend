import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SeccionBanner from "./SeccionBanner.jsx";

const VALORES = {
  bannerEnHome: false,
  bannerTitulo: "",
  bannerTexto: "",
  bannerCtaTexto: "",
  bannerColor: "TERRACOTA",
  modalCtaTipo: "CATALOGO",
};

const OPCIONES = {
  ctaTextoPorDefecto: "Ver más",
  coloresSlide: [
    { valor: "TERRACOTA", etiqueta: "Terracota" },
    { valor: "VERDE", etiqueta: "Verde" },
    { valor: "OCRE", etiqueta: "Ocre" },
    { valor: "TINTA", etiqueta: "Tinta" },
    { valor: "ARENA", etiqueta: "Arena" },
  ],
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

/**
 * Envoltorio con estado REAL, para probar lo que hace el editor real: cada
 * `editar(campo, valor)` reescribe `valores` con `setValores` y dispara un
 * re-render con el prop nuevo — no un mock que se queda quieto. `SeccionBanner`
 * ya no tiene ningún buffer local (ver su comentario): el aviso de `{dias}`
 * depende enteramente de que este reescriba el prop, igual que en la app real.
 */
function EditorDePrueba(props = {}) {
  const [valores, setValores] = useState({ ...VALORES, ...props.valoresIniciales });
  const editar = (campo, valor) => setValores((actuales) => ({ ...actuales, [campo]: valor }));
  return <SeccionBanner valores={valores} editar={editar} opciones={OPCIONES} {...props} />;
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

  it("ofrece los colores que manda el backend, sin copia local", () => {
    // Mismo criterio que los tipos y los estados: un diccionario duplicado a mano
    // falla MUDO — se agrega un color, el backend lo acepta, el selector no lo
    // ofrece, y ningún test se pone rojo.
    render(
      <SeccionBanner
        valores={{ ...VALORES, bannerColor: "VERDE" }}
        opciones={{ coloresSlide: [
          { valor: "TERRACOTA", etiqueta: "Terracota" },
          { valor: "VERDE", etiqueta: "Verde" },
        ] }}
        editar={() => {}}
      />,
    );

    expect(screen.getByRole("radio", { name: "Terracota" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Verde" })).toBeChecked();
  });

  it("avisa el color elegido", async () => {
    const usuario = userEvent.setup();
    const editar = vi.fn();
    render(<SeccionBanner valores={VALORES} opciones={OPCIONES} editar={editar} />);

    await usuario.click(screen.getByRole("radio", { name: "Ocre" }));

    expect(editar).toHaveBeenCalledWith("bannerColor", "OCRE");
  });

  it("el marcador {dias} en el texto avisa antes de guardar", async () => {
    // El backend lo rechaza con un 400. Avisarlo acá evita que el error llegue
    // al banner de arriba de todo, que en este editor queda fuera de pantalla.
    //
    // Se monta con `EditorDePrueba`, que sí reescribe `valores` en cada
    // `editar(...)` — como hace `useCampaniaEditor` de verdad. Montar esto
    // contra un `editar` que no actualiza nada solo prueba un mock, no el
    // componente.
    //
    // ⚠️ Dos trampas encontradas al confirmar el RED de este test (verificado
    // a mano, ver el fix report):
    //
    // 1. `{` y `}` son sintaxis reservada de `userEvent.type` (teclas
    //    especiales, ej. `{enter}`): tipeados sin escapar, `{dias}` se
    //    consume como un comando y NUNCA llega al campo — el texto real
    //    queda "Faltan  dias", sin marcador. Hace falta `{{`/`}}` para
    //    tipear las llaves literales.
    // 2. El regex del brief (`/contador .*es del cartel/i`) también matchea
    //    la AYUDA ESTÁTICA de al lado del textarea ("· el contador de días es
    //    del cartel · máx. 200"), que está en pantalla SIEMPRE, con o sin
    //    aviso — así que ese assert pasaba igual aunque el aviso estuviera
    //    apagado. Se afirma sobre "no del banner", texto exclusivo del aviso
    //    dinámico.
    //
    // Se monta con `EditorDePrueba`, que sí reescribe `valores` en cada
    // `editar(...)` — como hace `useCampaniaEditor` de verdad. Montar esto
    // contra un `editar` que no actualiza nada solo prueba un mock, no el
    // componente.
    const usuario = userEvent.setup();
    render(<EditorDePrueba />);

    await usuario.type(screen.getByLabelText(/Texto del banner/i), "Faltan {{dias}} dias");

    expect(await screen.findByText(/no del banner/i)).toBeInTheDocument();
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
