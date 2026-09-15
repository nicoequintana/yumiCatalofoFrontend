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
const getAdminCombosMock = vi.fn();
const guardarCombosDeCampaniaMock = vi.fn();
vi.mock("../api/combos.js", () => ({
  getAdminCombos: (...a) => getAdminCombosMock(...a),
  guardarCombosDeCampania: (...a) => guardarCombosDeCampaniaMock(...a),
}));
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
};

beforeEach(() => {
  vi.clearAllMocks();
  getCampaniaMock.mockResolvedValue(DETALLE);
  actualizarCampaniaMock.mockResolvedValue(DETALLE);
  getAdminCombosMock.mockResolvedValue([{ id: 4, nombre: "Kit Living" }]);
});

describe("useCampaniaEditor — el bloque del banner", () => {
  it("precarga las columnas del detalle que todavía se editan", async () => {
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.cargando).toBe(false));

    expect(result.current.valores).toMatchObject({
      bannerEnHome: true,
      bannerTitulo: "Semana del Hogar",
      bannerTexto: "Hasta 30 %.",
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

  it("el payload NO lleva color ni texto de botón: dejaron de editarse", async () => {
    // Son columnas inertes desde el 06/09/2026. Mandarlas escribiría un dato
    // que ninguna pantalla lee — y `editar` acepta cualquier clave, así que sin
    // este guard alcanza con que alguien vuelva a listarlas en el payload para
    // que la escritura vuelva sin que nada falle.
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(() => result.current.guardar());

    const [, payload] = actualizarCampaniaMock.mock.calls[0];
    expect(payload).not.toHaveProperty("bannerColor");
    expect(payload).not.toHaveProperty("bannerCtaTexto");
  });
});

describe("useCampaniaEditor — combos de la campaña", () => {
  it("trae todos los combos del panel para ofrecerlos", async () => {
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });

    await waitFor(() => expect(result.current.combos).toEqual([{ id: 4, nombre: "Kit Living" }]));
  });

  it("guardarCombos manda la lista completa y relee el detalle", async () => {
    guardarCombosDeCampaniaMock.mockResolvedValue({ comboIds: [4] });
    getCampaniaMock.mockResolvedValueOnce(DETALLE).mockResolvedValueOnce({ ...DETALLE, combos: [{ id: 4, nombre: "Kit Living" }] });
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(() => result.current.guardarCombos([4]));

    expect(guardarCombosDeCampaniaMock).toHaveBeenCalledWith(1, [4]);
    expect(result.current.campania.combos).toEqual([{ id: 4, nombre: "Kit Living" }]);
    expect(result.current.errorCombos).toBeNull();
  });

  it("un fallo al guardar queda en errorCombos, no en el error general", async () => {
    guardarCombosDeCampaniaMock.mockRejectedValue(new Error("Estos combos ya no existen: 9. Recargá la pantalla."));
    const { result } = renderHook(() => useCampaniaEditor(), { wrapper: envoltorio });
    await waitFor(() => expect(result.current.cargando).toBe(false));

    await act(() => result.current.guardarCombos([9]));

    expect(result.current.errorCombos).toBe("Estos combos ya no existen: 9. Recargá la pantalla.");
    expect(result.current.error).toBeNull();
  });
});
