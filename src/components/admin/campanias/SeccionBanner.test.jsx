import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SeccionBanner from "./SeccionBanner.jsx";

const VALORES = {
  bannerEnHome: false,
  bannerTitulo: "",
  bannerTexto: "",
  bannerCtaTexto: "",
  modalCtaTipo: "CATALOGO",
};

function montar(props = {}) {
  return render(
    <SeccionBanner
      valores={VALORES}
      editar={vi.fn()}
      opciones={{}}
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
});
