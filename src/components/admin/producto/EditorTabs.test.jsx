import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditorTabs from "./EditorTabs.jsx";

describe("EditorTabs", () => {
  it("sin `paneles` muestra los tres del editor de producto, visibles también en escritorio", () => {
    render(<EditorTabs panelActivo="form" onCambiarPanel={() => {}} />);

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "editEditar",
      "photo_libraryImágenes",
      "visibilityVista previa",
    ]);
    expect(screen.getByRole("group", { name: "Panel visible" })).not.toHaveClass("lg:hidden");
  });

  // Editor de combos (spec §8.3): solo Editar / Vista previa. En `lg` las dos
  // columnas se ven juntas y no queda nada que elegir: la barra entera se va.
  it("con `paneles` propios muestra solo esos y se oculta en escritorio si queda uno solo para elegir", async () => {
    const onCambiarPanel = vi.fn();
    render(
      <EditorTabs
        panelActivo="form"
        onCambiarPanel={onCambiarPanel}
        paneles={[
          { id: "form", etiqueta: "Editar", icono: "edit" },
          { id: "preview", etiqueta: "Vista previa", icono: "visibility", soloChico: true },
        ]}
      />,
    );

    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Panel visible" })).toHaveClass("lg:hidden");

    await userEvent.click(screen.getByRole("button", { name: /Vista previa/ }));
    expect(onCambiarPanel).toHaveBeenCalledWith("preview");
  });
});
