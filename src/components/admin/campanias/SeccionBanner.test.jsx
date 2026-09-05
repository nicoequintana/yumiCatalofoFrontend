import { render, screen } from "@testing-library/react";
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
      {...props}
    />,
  );
}

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
    const usuario = userEvent.setup();
    render(<SeccionBanner valores={VALORES} opciones={OPCIONES} editar={() => {}} />);

    await usuario.type(screen.getByLabelText(/Texto del banner/i), "Faltan {dias} dias");

    expect(await screen.findByText(/contador .*es del cartel/i)).toBeInTheDocument();
  });
});
