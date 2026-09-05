import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getCampaniaMock = vi.fn();
const actualizarCampaniaMock = vi.fn();

vi.mock("../api/campanias.js", () => ({
  getCampania: (...a) => getCampaniaMock(...a),
  actualizarCampania: (...a) => actualizarCampaniaMock(...a),
  getOpcionesCampania: () => Promise.resolve({ tipos: [{ valor: "ESTACIONAL" }] }),
  getContadorCampania: () => Promise.resolve({ diasFaltantes: null }),
  crearCampania: vi.fn(),
  cambiarEstadoCampania: vi.fn(),
  duplicarCampania: vi.fn(),
  eliminarCampania: vi.fn(),
  subirDoodle: vi.fn(),
  quitarDoodle: vi.fn(),
  subirArte: vi.fn(),
  quitarArte: vi.fn(),
  guardarProductosDeCampania: vi.fn(),
  guardarPromocionesDeCampania: vi.fn(),
}));
vi.mock("../api/promociones.js", () => ({ getPromociones: () => Promise.resolve([]) }));
vi.mock("react-router-dom", async (importar) => ({
  ...(await importar()),
  useParams: () => ({ id: "1" }),
  useNavigate: () => vi.fn(),
}));

const { default: useCampaniaEditor } = await import("./useCampaniaEditor.js");

const envoltorio = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

const DETALLE = {
  id: 1,
  nombre: "Primavera",
  tipo: "ESTACIONAL",
  estado: "BORRADOR",
  desde: "2026-09-10",
  hasta: "2026-09-20",
  prioridad: 0,
  modalCtaTipo: "CATALOGO",
  bannerEnHome: true,
  bannerTitulo: "Semana del Hogar",
  bannerTexto: "Hasta 30 %.",
  bannerCtaTexto: "Ver la selección",
};

beforeEach(() => {
  vi.clearAllMocks();
  getCampaniaMock.mockResolvedValue(DETALLE);
  actualizarCampaniaMock.mockResolvedValue(DETALLE);
});

describe("useCampaniaEditor — el bloque del banner", () => {
  it("precarga las cuatro columnas del detalle", async () => {
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.valores).toMatchObject({
      bannerEnHome: true,
      bannerTitulo: "Semana del Hogar",
      bannerTexto: "Hasta 30 %.",
      bannerCtaTexto: "Ver la selección",
    });
  });

  it("manda los textos vacíos como null, no como cadena vacía", async () => {
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.editar("bannerTexto", "   "));
    await act(() => result.current.guardar());

    expect(actualizarCampaniaMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ bannerEnHome: true, bannerTexto: null }),
    );
  });

  it("manda el color elegido en el payload", async () => {
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    act(() => result.current.editar("bannerColor", "OCRE"));
    await act(() => result.current.guardar());

    expect(actualizarCampaniaMock).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ bannerColor: "OCRE" }),
    );
  });
});
