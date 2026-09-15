import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../../context/ToastContext.jsx";
import AdminComboForm from "./AdminComboForm.jsx";

const comboEditorMock = vi.fn();
vi.mock("../../hooks/useComboEditor.js", () => ({ default: (...a) => comboEditorMock(...a) }));
// La vista previa "Página" monta `BotonWhatsapp`, que lee la config de contacto.
vi.mock("../../api/config.js", () => ({
  getConfigContacto: () => Promise.resolve({ whatsapp: { numero: null } }),
}));

const OPCIONES = { minUnidades: 2, maxUnidades: 10, porcentajeMin: 5, porcentajeMax: 50, largoMaxNombre: 120, largoMaxFrase: 140, vigencias: ["SIEMPRE", "CAMPANIA"] };
const COTIZACION = {
  precioSeparado: "20000", precioCombo: "17000", ahorro: "3000", unidades: 2, alcanza: 4,
  disponible: true, quedanPocos: false, precioSueltoHoy: "20000", avisoMasCaro: false,
};

function estado(extra = {}) {
  return {
    combo: null,
    cargando: false,
    cambios: {
      nombre: "Kit Living", frase: "Frase.", porcentaje: 15, vigencia: "SIEMPRE", activo: false, heroUrl: null,
      items: [{ productId: 1, nombre: "Lámpara", sku: "LAM-01", precio: "10000", stock: 9, foto: null, cantidad: 2 }],
    },
    setCambios: vi.fn(),
    sucio: false,
    agregarProducto: vi.fn(),
    quitarProducto: vi.fn(),
    cambiarCantidad: vi.fn(),
    cotizacion: COTIZACION,
    busqueda: "",
    setBusqueda: vi.fn(),
    resultados: [],
    buscando: false,
    guardando: false,
    error: null,
    guardar: vi.fn(),
    eliminar: vi.fn(),
    subirHero: vi.fn(),
    quitarHero: vi.fn(),
    opciones: OPCIONES,
    ...extra,
  };
}

function arbol(ruta) {
  return (
    <MemoryRouter initialEntries={[ruta]}>
      <ToastProvider>
        <Routes>
          <Route path="/catalogo/admin/combos" element={<p>pantalla: listado de combos</p>} />
          <Route path="/catalogo/admin/combos/nuevo" element={<AdminComboForm />} />
          <Route path="/catalogo/admin/combos/:id" element={<AdminComboForm />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>
  );
}

function renderizar(ruta = "/catalogo/admin/combos/nuevo") {
  return render(arbol(ruta));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminComboForm — encabezado", () => {
  it("en el alta: eyebrow, título 'Nuevo combo', sin Eliminar", () => {
    comboEditorMock.mockReturnValue(estado());
    renderizar();

    expect(screen.getByText("Panel de administración")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Nuevo combo" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
    expect(screen.queryByText("Cambios sin guardar")).toBeNull();
  });

  it("en edición dice 'Editar combo' y muestra 'Cambios sin guardar' con el `sucio` del hook", () => {
    comboEditorMock.mockReturnValue(estado({ sucio: true, combo: { id: 3, ruta: "/combos/3-kit", campanias: [] } }));
    renderizar("/catalogo/admin/combos/3");

    expect(screen.getByRole("heading", { level: 1, name: "Editar combo" })).toBeInTheDocument();
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
  });

  it("Cancelar vuelve al listado", async () => {
    comboEditorMock.mockReturnValue(estado());
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(await screen.findByText("pantalla: listado de combos")).toBeInTheDocument();
  });

  it("Cancelar con cambios sin guardar pide confirmación y se queda si la persona dice que no", async () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    comboEditorMock.mockReturnValue(estado({ sucio: true }));
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(confirmar).toHaveBeenCalled();
    expect(screen.queryByText("pantalla: listado de combos")).toBeNull();
    confirmar.mockRestore();
  });

  it("mientras carga el detalle no muestra el formulario", () => {
    comboEditorMock.mockReturnValue(estado({ cargando: true }));
    renderizar("/catalogo/admin/combos/3");

    expect(screen.getByText("Cargando combo…")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Datos del combo" })).toBeNull();
  });

  it("si falló la carga del detalle lo dice, en vez de mostrar un formulario vacío", () => {
    comboEditorMock.mockReturnValue(estado({ combo: null, error: "Sin conexión." }));
    renderizar("/catalogo/admin/combos/3");

    expect(screen.getByText("No se pudo cargar el combo")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Datos del combo" })).toBeNull();
  });
});

describe("AdminComboForm — datos y productos", () => {
  it("muestra el contador de unidades con el máximo de las opciones y el resumen de la cotización", () => {
    comboEditorMock.mockReturnValue(estado());
    renderizar();

    expect(screen.getByText("2 de 10 unidades")).toBeInTheDocument();
    const descuento = screen.getByRole("region", { name: "Descuento" });
    expect(within(descuento).getByText("$ 20.000")).toBeInTheDocument();
    expect(within(descuento).getByText("$ 17.000")).toBeInTheDocument();
    expect(within(descuento).getByText("Con el stock actual alcanza para 4 combos.")).toBeInTheDocument();
    expect(comboEditorMock).toHaveBeenCalledWith(null);
  });

  it("la frase muestra la ayuda de las 2 líneas y el contador contra el largo máximo", () => {
    comboEditorMock.mockReturnValue(estado());
    renderizar();

    expect(screen.getByText("En la card se ven 2 líneas. En la página se ve completa.")).toBeInTheDocument();
    expect(screen.getByText("6 / 140")).toBeInTheDocument();
  });

  it("escribir el nombre actualiza los cambios del hook", async () => {
    const setCambios = vi.fn();
    comboEditorMock.mockReturnValue(estado({ setCambios }));
    renderizar();

    await userEvent.type(screen.getByLabelText("Nombre"), "!");

    const actualizador = setCambios.mock.calls[0][0];
    expect(actualizador(estado().cambios).nombre).toBe("Kit Living!");
  });

  it("el buscador escribe la búsqueda y elegir un resultado lo agrega al combo", async () => {
    const setBusqueda = vi.fn();
    const agregarProducto = vi.fn();
    const MESA = { id: 2, nombre: "Mesa", sku: "MES-01", precio: "25000", stock: 4, fotos: [] };
    comboEditorMock.mockReturnValue(estado({ setBusqueda, agregarProducto, busqueda: "me", resultados: [MESA] }));
    renderizar();

    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar producto por nombre o SKU" }), "s");
    expect(setBusqueda).toHaveBeenCalledWith("mes");

    await userEvent.click(screen.getByRole("button", { name: "Agregar Mesa" }));
    expect(agregarProducto).toHaveBeenCalledWith(MESA);
  });

  it("el stepper cambia la cantidad y quitar saca el producto", async () => {
    const cambiarCantidad = vi.fn();
    const quitarProducto = vi.fn();
    comboEditorMock.mockReturnValue(estado({ cambiarCantidad, quitarProducto }));
    renderizar();

    const fila = screen.getByText("Lámpara").closest("li");
    await userEvent.click(within(fila).getByRole("button", { name: "Aumentar cantidad de Lámpara" }));
    expect(cambiarCantidad).toHaveBeenCalledWith(1, 3);
    await userEvent.click(within(fila).getByRole("button", { name: "Quitar Lámpara" }));
    expect(quitarProducto).toHaveBeenCalledWith(1);
  });

  it("cada fila muestra su miniatura, SKU, precio de lista, stock y la pill de promo que resolvió el backend", () => {
    comboEditorMock.mockReturnValue(
      estado({
        cambios: { ...estado().cambios, items: [{ ...estado().cambios.items[0], foto: "https://x/lampara.jpg" }] },
        cotizacion: { ...COTIZACION, items: [{ productId: 1, descuento: { porcentaje: 20, promocionId: 7, promocionNombre: "Hot Sale" } }] },
      }),
    );
    renderizar();

    const fila = screen.getByText("Lámpara").closest("li");
    expect(within(fila).getByText("LAM-01")).toBeInTheDocument();
    expect(within(fila).getByText("Lista $ 10.000")).toBeInTheDocument();
    expect(within(fila).getByText("Stock 9")).toBeInTheDocument();
    expect(within(fila).getByText("Promo -20% vigente")).toBeInTheDocument();
    expect(fila.querySelector("img")).toHaveAttribute("src", "https://x/lampara.jpg");
  });

  it("sin descuento vigente en el producto no hay pill de promo", () => {
    comboEditorMock.mockReturnValue(estado({ cotizacion: { ...COTIZACION, items: [{ productId: 1, descuento: null }] } }));
    renderizar();

    expect(screen.queryByText(/Promo -/)).toBeNull();
  });

  it("con el combo guardado muestra la URL pública que devolvió el backend", () => {
    comboEditorMock.mockReturnValue(estado({ combo: { id: 3, ruta: "/combos/3-kit-living", campanias: [] } }));
    renderizar("/catalogo/admin/combos/3");

    expect(screen.getByText("/combos/3-kit-living")).toBeInTheDocument();
    expect(comboEditorMock).toHaveBeenCalledWith(3);
  });
});

describe("AdminComboForm — descuento, imagen y vigencia", () => {
  it("con avisoMasCaro muestra 'Comprando por separado sale más barato' con los dos números", () => {
    comboEditorMock.mockReturnValue(estado({ cotizacion: { ...COTIZACION, precioSueltoHoy: "15000", avisoMasCaro: true } }));
    renderizar();

    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("Comprando por separado sale más barato");
    expect(aviso).toHaveTextContent("$ 17.000");
    expect(aviso).toHaveTextContent("$ 15.000");
  });

  it("nombra el producto que limita el alcance, tal cual lo manda cotizar", () => {
    comboEditorMock.mockReturnValue(estado({ cotizacion: { ...COTIZACION, limitante: { productId: 1, nombre: "Lámpara" } } }));
    renderizar();

    expect(screen.getByText("Lo limita Lámpara.")).toBeInTheDocument();
  });

  it("en el alta la imagen principal está deshabilitada hasta guardar", () => {
    comboEditorMock.mockReturnValue(estado());
    renderizar();

    expect(screen.getByLabelText("Archivo de la imagen principal")).toBeDisabled();
    expect(screen.getByText("Guardá el combo para cargar la imagen principal.")).toBeInTheDocument();
  });

  it("en edición con hero: elegir un archivo lo sube (Reemplazar) y Quitar lo saca", async () => {
    const subirHero = vi.fn();
    const quitarHero = vi.fn();
    comboEditorMock.mockReturnValue(
      estado({
        combo: { id: 3, ruta: "/combos/3-kit", campanias: [] },
        cambios: { ...estado().cambios, heroUrl: "https://x/hero.jpg" },
        subirHero,
        quitarHero,
      }),
    );
    renderizar("/catalogo/admin/combos/3");

    expect(screen.getByText("Reemplazar")).toBeInTheDocument();
    const archivo = new File(["x"], "hero.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Archivo de la imagen principal"), archivo);
    expect(subirHero).toHaveBeenCalledWith(archivo);

    await userEvent.click(screen.getByRole("button", { name: "Quitar" }));
    expect(quitarHero).toHaveBeenCalled();
  });

  it("vigencia CAMPANIA sin campañas asociadas muestra la advertencia", () => {
    comboEditorMock.mockReturnValue(
      estado({ combo: { id: 3, ruta: "/combos/3-kit", campanias: [] }, cambios: { ...estado().cambios, vigencia: "CAMPANIA" } }),
    );
    renderizar("/catalogo/admin/combos/3");

    expect(screen.getByText("Este combo no está asociado a ninguna campaña: no se va a ver en la tienda.")).toBeInTheDocument();
  });

  it("vigencia CAMPANIA con campañas las lista con las etiquetas de estado que resolvió el backend", () => {
    comboEditorMock.mockReturnValue(
      estado({
        combo: {
          id: 3,
          ruta: "/combos/3-kit",
          campanias: [{ id: 4, nombre: "Navidad", estado: "HABILITADA", etiquetaEstado: "Habilitada", etiquetaTemporal: "Programada", activa: false }],
        },
        cambios: { ...estado().cambios, vigencia: "CAMPANIA" },
      }),
    );
    renderizar("/catalogo/admin/combos/3");

    const fila = screen.getByText("Navidad").closest("li");
    expect(within(fila).getByText("Habilitada · Programada")).toBeInTheDocument();
    expect(screen.queryByText(/HABILITADA/)).toBeNull();
  });

  it("la vigencia se elige con el teclado: flecha pasa a la otra opción", async () => {
    const setCambios = vi.fn();
    comboEditorMock.mockReturnValue(estado({ setCambios }));
    renderizar();

    const siempre = screen.getByRole("radio", { name: /Siempre vigente/ });
    expect(siempre).toBeChecked();
    siempre.focus();
    await userEvent.keyboard("{ArrowDown}");

    expect(setCambios).toHaveBeenCalled();
    expect(setCambios.mock.calls.at(-1)[0](estado().cambios).vigencia).toBe("CAMPANIA");
  });

  it("elegir 'Programado desde campañas' y prender 'Combo activo' actualizan los cambios", async () => {
    const setCambios = vi.fn();
    comboEditorMock.mockReturnValue(estado({ setCambios }));
    renderizar();

    await userEvent.click(screen.getByRole("radio", { name: /Programado desde campañas/ }));
    expect(setCambios.mock.calls[0][0](estado().cambios).vigencia).toBe("CAMPANIA");

    await userEvent.click(screen.getByRole("switch", { name: /Combo activo/ }));
    expect(setCambios.mock.calls[1][0](estado().cambios).activo).toBe(true);
  });
});

describe("AdminComboForm — vista previa y acciones", () => {
  it("alterna la vista previa entre Card y Página con los datos de la cotización", async () => {
    comboEditorMock.mockReturnValue(estado({ cotizacion: { ...COTIZACION, disponible: false, alcanza: 0 } }));
    renderizar();

    const previa = screen.getByRole("complementary", { name: "Vista previa" });
    // Card: el chip sale de `cotizacion.disponible`, no de un cálculo propio.
    expect(within(previa).getByText("Agotado")).toBeInTheDocument();

    await userEvent.click(within(previa).getByRole("button", { name: "Página" }));
    expect(within(previa).getByRole("button", { name: "Página" })).toHaveAttribute("aria-pressed", "true");
    expect(within(previa).getByRole("heading", { level: 1, name: "Kit Living" })).toBeInTheDocument();
  });

  it("la vista previa va con la paleta pública y es inerte: no agrega al carrito ni navega", () => {
    comboEditorMock.mockReturnValue(estado());
    renderizar();

    const previa = screen.getByRole("complementary", { name: "Vista previa" });
    const marco = previa.querySelector(".paleta-clara");
    expect(marco).not.toBeNull();
    // jsdom no implementa `inert`: se verifica el atributo (ver AdminSidebar.test.jsx).
    expect(marco).toHaveAttribute("inert");
  });

  it("sin cotización no inventa números: explica cuándo aparece la vista previa", () => {
    comboEditorMock.mockReturnValue(estado({ cotizacion: null }));
    renderizar();

    const previa = screen.getByRole("complementary", { name: "Vista previa" });
    expect(within(previa).getByText(/al menos 2 unidades/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Descuento" }).textContent).not.toMatch(/\$/);
  });

  it("debajo de lg alterna Editar / Vista previa", async () => {
    comboEditorMock.mockReturnValue(estado());
    renderizar();

    const grupo = screen.getByRole("group", { name: "Panel visible" });
    expect(within(grupo).getAllByRole("button")).toHaveLength(2);
    await userEvent.click(within(grupo).getByRole("button", { name: /Vista previa/ }));
    expect(within(grupo).getByRole("button", { name: /Vista previa/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("Guardar en el alta guarda y lleva a la URL del combo creado", async () => {
    const guardar = vi.fn().mockResolvedValue({ id: 9 });
    comboEditorMock.mockReturnValue(estado({ guardar }));
    renderizar();

    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    expect(guardar).toHaveBeenCalled();
    expect(comboEditorMock).toHaveBeenLastCalledWith(9);
  });

  it("Eliminar pide confirmación, elimina y vuelve al listado", async () => {
    const eliminar = vi.fn().mockResolvedValue({ ok: true });
    comboEditorMock.mockReturnValue(estado({ combo: { id: 3, ruta: "/combos/3-kit", campanias: [] }, eliminar }));
    renderizar("/catalogo/admin/combos/3");

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(eliminar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));

    expect(eliminar).toHaveBeenCalled();
    expect(await screen.findByText("pantalla: listado de combos")).toBeInTheDocument();
  });

  it("si eliminar falla (403) el diálogo queda abierto y muestra el mensaje del backend", async () => {
    const MENSAJE = "No tenés permiso para eliminar.";
    const combo = { id: 3, ruta: "/combos/3-kit", campanias: [] };
    const eliminar = vi.fn(async () => {
      // Lo que hace el hook real ante el 403: deja el mensaje en `error` y devuelve null.
      comboEditorMock.mockReturnValue(estado({ combo, eliminar, error: MENSAJE }));
      return null;
    });
    comboEditorMock.mockReturnValue(estado({ combo, eliminar }));
    const { rerender } = renderizar("/catalogo/admin/combos/3");

    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, eliminar" }));
    rerender(arbol("/catalogo/admin/combos/3"));

    const dialogo = screen.getByRole("dialog", { name: "Eliminar combo" });
    expect(within(dialogo).getByRole("alert")).toHaveTextContent(MENSAJE);
    expect(screen.queryByText("pantalla: listado de combos")).toBeNull();
  });

  it("muestra el error del backend", () => {
    comboEditorMock.mockReturnValue(estado({ error: "Para activar el combo primero cargá la imagen principal." }));
    renderizar();

    expect(screen.getByRole("alert")).toHaveTextContent("Para activar el combo primero cargá la imagen principal.");
  });
});
