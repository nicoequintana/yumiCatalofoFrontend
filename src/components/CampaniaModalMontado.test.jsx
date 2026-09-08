import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const registrarEventoComercialMock = vi.fn();
vi.mock("../api/campanias.js", () => ({
  registrarEventoComercial: (...args) => registrarEventoComercialMock(...args),
}));

const contextoMock = vi.fn();
vi.mock("../hooks/useContextoComercial.js", () => ({
  default: () => contextoMock(),
}));

const modalMock = vi.fn();
vi.mock("../hooks/useModalCampania.js", () => ({
  default: (...args) => modalMock(...args),
}));

vi.mock("./ModalCampania.jsx", () => ({
  default: () => <div data-testid="cartel" />,
}));

const { default: CampaniaModalMontado } = await import("./CampaniaModalMontado.jsx");

const MODAL = { campaniaId: 7, titulo: "Primavera", ctaTipo: "CAMPANIA" };

function montar(ruta = "/") {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <CampaniaModalMontado />
    </MemoryRouter>,
  );
}

describe("CampaniaModalMontado — impresión del cartel", () => {
  beforeEach(() => {
    registrarEventoComercialMock.mockClear();
    contextoMock.mockReturnValue({ modal: MODAL, claveDia: "2026-09-08" });
    modalMock.mockReturnValue({ visible: true, cerrar: vi.fn() });
  });

  it("registra la impresión cuando el cartel se muestra", () => {
    montar();

    expect(registrarEventoComercialMock).toHaveBeenCalledTimes(1);
    expect(registrarEventoComercialMock).toHaveBeenCalledWith({
      tipo: "IMPRESION_COMERCIAL",
      origen: "MODAL",
      campaniaId: 7,
    });
  });

  it("no registra nada si el cartel no se muestra", () => {
    modalMock.mockReturnValue({ visible: false, cerrar: vi.fn() });

    montar();

    expect(registrarEventoComercialMock).not.toHaveBeenCalled();
  });

  it("no registra nada en el panel", () => {
    modalMock.mockReturnValue({ visible: false, cerrar: vi.fn() });

    montar("/catalogo/admin/productos");

    // El hook recibe `null` en el panel, así que nunca hay cartel que contar.
    expect(modalMock).toHaveBeenCalledWith(null, "2026-09-08");
    expect(registrarEventoComercialMock).not.toHaveBeenCalled();
  });
});
