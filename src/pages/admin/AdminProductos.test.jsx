import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductos from "./AdminProductos.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

describe("AdminProductos — fallos de red", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra un error en vez de quedarse cargando para siempre", async () => {
    productsApi.getProducts.mockRejectedValue(new Error("Failed to fetch"));

    render(
      <MemoryRouter>
        <AdminProductos />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/No se pudieron cargar los productos/i)).toBeInTheDocument();
    expect(screen.queryByText("Cargando productos…")).not.toBeInTheDocument();
  });
});

/**
 * Sobre de página que devuelve `GET /products`. Los tests declaran las filas y
 * el helper arma el `{ data, page, pageSize, total }` alrededor.
 */
function pagina(filas, extra = {}) {
  return { data: filas, page: 1, pageSize: 12, total: filas.length, ...extra };
}

const PRODUCTO = {
  id: 1,
  nombre: "Reloj Clásico",
  sku: "YIMA-RELOJC-1",
  etiqueta: null,
  categoria: null,
  precio: "1000",
  fotos: [],
  visibleEnCatalogo: true,
  destacado: false,
  orden: 0,
};

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminProductos />
    </MemoryRouter>,
  );
}

describe("AdminProductos - destacado y orden", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
  });

  it("muestra el switch de destacado y lo togglea via updateMerchandising", async () => {
    const user = userEvent.setup();
    productsApi.updateMerchandising.mockResolvedValue({ ...PRODUCTO, destacado: true });

    renderPagina();

    const switchDestacado = await screen.findByRole("switch", { name: "Destacar Reloj Clásico" });
    expect(switchDestacado).toHaveAttribute("aria-checked", "false");

    await user.click(switchDestacado);

    await waitFor(() => {
      expect(productsApi.updateMerchandising).toHaveBeenCalledWith(1, { destacado: true });
    });
  });

  it("guarda el nuevo orden al perder el foco del input", async () => {
    const user = userEvent.setup();
    productsApi.updateMerchandising.mockResolvedValue({ ...PRODUCTO, orden: 5 });

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.type(inputOrden, "5");
    await user.tab();

    await waitFor(() => {
      expect(productsApi.updateMerchandising).toHaveBeenCalledWith(1, { orden: 5 });
    });
  });

  it("no llama a la API si el orden no cambió al perder el foco", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.click(inputOrden);
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
  });

  it("no llama a la API y vuelve al valor persistido si el orden queda vacío al perder el foco", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
    await waitFor(() => expect(inputOrden).toHaveValue(0));
  });

  it("no llama a la API si el orden tipeado es no numérico (abc)", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.type(inputOrden, "abc");
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
  });

  it("no llama a la API si el orden tipeado tiene decimales (1.5)", async () => {
    const user = userEvent.setup();

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });
    await user.clear(inputOrden);
    await user.type(inputOrden, "1.5");
    await user.tab();

    expect(productsApi.updateMerchandising).not.toHaveBeenCalled();
  });

  it("no pisa un draft en progreso cuando el guardado anterior resuelve mientras el admin ya está tipeando el próximo valor (race)", async () => {
    const user = userEvent.setup();

    // First PATCH (orden=5) is controlled manually so it can be resolved at
    // a precise moment: AFTER the admin has already started typing the next
    // draft, but BEFORE that next draft is blurred/submitted. This is the
    // exact interleaving the bug required — resolving after the whole
    // second save completed never exercised the guard (verified: reverting
    // the fix to an unconditional clear kept that ordering green).
    let resolverLento;
    const patchLento = new Promise((resolve) => {
      resolverLento = resolve;
    });
    productsApi.updateMerchandising.mockReturnValueOnce(patchLento);

    renderPagina();

    const inputOrden = await screen.findByRole("spinbutton", { name: "Orden de Reloj Clásico" });

    // First edit: 0 -> 5, blur fires the slow PATCH (still pending).
    await user.clear(inputOrden);
    await user.type(inputOrden, "5");
    await user.tab();
    await waitFor(() => expect(productsApi.updateMerchandising).toHaveBeenCalledWith(1, { orden: 5 }));

    // Admin refocuses and starts typing a newer, NOT-YET-SUBMITTED draft
    // (still mid-edit, no blur yet).
    await user.click(inputOrden);
    await user.clear(inputOrden);
    await user.type(inputOrden, "9");
    expect(inputOrden).toHaveValue(9);

    // The slow first PATCH resolves now, while "9" is still just a local,
    // unsaved draft. Its `finally` must NOT wipe that draft back to the
    // persisted `orden` — the buggy unconditional-clear version reverts the
    // input to 5 here; the fixed version leaves "9" alone since it no
    // longer matches the value ("5") that triggered this particular save.
    resolverLento({ ...PRODUCTO, orden: 5 });
    await waitFor(() => expect(productsApi.updateMerchandising).toHaveBeenCalledTimes(1));

    expect(inputOrden).toHaveValue(9);
  });
});

describe("AdminProductos — diálogo de confirmación de borrado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
  });

  async function abrirDialogo() {
    const user = userEvent.setup();
    renderPagina();
    const disparador = await screen.findByRole("button", { name: "Eliminar Reloj Clásico" });
    await user.click(disparador);
    return { user, disparador };
  }

  it("se anuncia como diálogo modal, con el título como nombre accesible", async () => {
    await abrirDialogo();

    const dialogo = screen.getByRole("dialog");
    expect(dialogo).toHaveAttribute("aria-modal", "true");
    expect(dialogo).toHaveAccessibleName("Eliminar producto");
  });

  it("mueve el foco adentro al abrirse", async () => {
    await abrirDialogo();

    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("atrapa el tabulado adentro del diálogo", async () => {
    const { user } = await abrirDialogo();
    const dialogo = screen.getByRole("dialog");

    for (let indice = 0; indice < 5; indice += 1) {
      await user.tab();
      expect(dialogo.contains(document.activeElement)).toBe(true);
    }
  });

  it("cierra con Escape sin borrar nada, y devuelve el foco al botón que lo abrió", async () => {
    const { user, disparador } = await abrirDialogo();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(productsApi.deleteProduct).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(disparador);
  });

  it("no se deja cerrar con Escape mientras el borrado está en vuelo", async () => {
    let resolverBorrado;
    productsApi.deleteProduct.mockReturnValueOnce(
      new Promise((resolve) => {
        resolverBorrado = resolve;
      }),
    );

    const { user } = await abrirDialogo();
    await user.click(screen.getByRole("button", { name: "Eliminar", exact: true }));
    await waitFor(() => expect(productsApi.deleteProduct).toHaveBeenCalledWith(1));

    await user.keyboard("{Escape}");

    // El pedido ya salió: cerrar acá dejaría al admin sin saber si el producto
    // se borró o no.
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    resolverBorrado({});
  });
});

describe("AdminProductos - cantidad de fotos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra el total real de fotos aunque el listado traiga solo la portada", async () => {
    // El listado liviano devuelve `fotos` recortado a la portada y el total
    // aparte en `cantidadFotos`: contar `fotos.length` mostraría "1/10" para
    // un producto con cuatro fotos cargadas.
    productsApi.getProducts.mockResolvedValue(
      pagina([
        {
          ...PRODUCTO,
          fotos: [{ id: 9, url: "https://cdn/portada.jpg", orden: 0 }],
          cantidadFotos: 4,
        },
      ]),
    );

    renderPagina();

    expect(await screen.findByText("4/10")).toBeInTheDocument();
  });

  it("muestra 0/10 cuando el producto no tiene fotos", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO, fotos: [], cantidadFotos: 0 }]));

    renderPagina();

    expect(await screen.findByText("0/10")).toBeInTheDocument();
  });
});

describe("AdminProductos — buscador", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([PRODUCTO]));
  });

  it("carga sin término de búsqueda al entrar", async () => {
    renderPagina();

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        page: 1,
        search: "",
      });
    });
  });

  it("manda lo tipeado al backend después del debounce, una sola vez", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    const input = screen.getByRole("searchbox", { name: /buscar productos/i });
    await user.type(input, "reloj");

    // El debounce es lo que evita un request por tecla: cinco letras tienen
    // que producir UNA búsqueda, no cinco.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        page: 1,
        search: "reloj",
      });
    });

    const busquedas = productsApi.getProducts.mock.calls.filter(
      ([args]) => args.search === "reloj",
    );
    expect(busquedas).toHaveLength(1);
  });

  it("busca también por SKU", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    await user.type(
      screen.getByRole("searchbox", { name: /buscar productos/i }),
      "YIMA-RELOJC-1",
    );

    // El campo es uno solo: el término viaja igual sea nombre, SKU o
    // categoría, y el backend decide con cuál coincide.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        page: 1,
        search: "YIMA-RELOJC-1",
      });
    });
  });

  it("dice que la búsqueda no encontró nada, no que no haya productos", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    productsApi.getProducts.mockResolvedValue(pagina([]));
    await user.type(
      screen.getByRole("searchbox", { name: /buscar productos/i }),
      "inexistente",
    );

    // "Todavía no hay productos" sería falso acá: los productos están, la
    // búsqueda no los alcanza. El mensaje equivocado manda al admin a cargar
    // algo que ya tiene cargado.
    expect(await screen.findByText("Sin resultados")).toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay productos")).not.toBeInTheDocument();
  });

  it("mantiene el mensaje de catálogo vacío cuando no hay búsqueda activa", async () => {
    productsApi.getProducts.mockResolvedValue(pagina([]));
    renderPagina();

    expect(await screen.findByText("Todavía no hay productos")).toBeInTheDocument();
    expect(screen.queryByText("Sin resultados")).not.toBeInTheDocument();
  });
});

describe("AdminProductos — la búsqueda vive en la URL", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([PRODUCTO]));
  });

  it("aplica el término que ya viene en la URL y lo muestra en el input", async () => {
    render(
      <MemoryRouter initialEntries={["/catalogo/admin?search=reloj"]}>
        <AdminProductos />
      </MemoryRouter>,
    );

    // Sin esto, recargar un listado filtrado mostraría una caja de búsqueda
    // vacía sobre una tabla filtrada, que se lee como un bug.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        page: 1,
        search: "reloj",
      });
    });
    expect(screen.getByRole("searchbox", { name: /buscar productos/i })).toHaveValue("reloj");
  });

  it("una búsqueda nueva vuelve a la página 1", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/catalogo/admin?page=3"]}>
        <AdminProductos />
      </MemoryRouter>,
    );
    await screen.findByText("Reloj Clásico");

    await user.type(
      screen.getByRole("searchbox", { name: /buscar productos/i }),
      "reloj",
    );

    // La página 3 del listado completo puede no existir en el resultado
    // filtrado; quedarse ahí mostraría una tabla vacía como si la búsqueda
    // no encontrara nada.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        page: 1,
        search: "reloj",
      });
    });
  });
});
