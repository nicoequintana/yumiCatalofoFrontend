import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminProductos from "./AdminProductos.jsx";
import * as productsApi from "../../api/products.js";
import * as categoriasApi from "../../api/categorias.js";
import { esperarTablaApilada } from "../../test/tablaApilada.js";

vi.mock("../../api/products.js");
vi.mock("../../api/categorias.js");

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

describe("AdminProductos - filtros de la tabla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // total alto: los tests de "vuelve a página 1" necesitan que la página 3
    // exista de verdad, o la corrección de página-fuera-de-rango se
    // dispararía sola y el test afirmaría otra cosa.
    productsApi.getProducts.mockResolvedValue(
      pagina([{ ...PRODUCTO }], { total: 200, pageSize: 50 }),
    );
    productsApi.getEtiquetas.mockResolvedValue({ etiquetas: ["Nuevo", "Oferta"] });
    categoriasApi.getCategorias.mockResolvedValue([
      { id: 3, nombre: "Cocina" },
      { id: 7, nombre: "Deco" },
    ]);
  });

  function renderEnPagina3() {
    return render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos?page=3"]}>
        <AdminProductos />
      </MemoryRouter>,
    );
  }

  it("click en un encabezado cicla asc → desc → default de catálogo", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    await user.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ orden: "nombre", page: 1 }),
      );
    });

    // Se re-consulta el botón en cada paso: cada reorden desmonta la tabla
    // (spinner) y la re-monta, y una referencia vieja apunta a un nodo
    // desconectado.
    await user.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ orden: "nombre-desc" }),
      );
    });

    await user.click(screen.getByRole("button", { name: "Ordenar por Nombre" }));
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ orden: "catalogo" }),
      );
    });
  });

  it("el encabezado activo declara aria-sort para lectores de pantalla", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    await user.click(screen.getByRole("button", { name: "Ordenar por Precio" }));

    await waitFor(() => {
      expect(
        screen.getByRole("columnheader", { name: /precio/i }),
      ).toHaveAttribute("aria-sort", "ascending");
    });
  });

  it("el orden por defecto es catalogo, y Más recientes se manda explícito", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    // URL limpia = orden "catalogo" hacia el backend (el default de ESTA
    // pantalla, no el del endpoint, que sigue en recientes).
    expect(productsApi.getProducts).toHaveBeenCalledWith(
      expect.objectContaining({ admin: true, orden: "catalogo" }),
    );

    await user.selectOptions(screen.getByLabelText("Ordenar por"), "recientes");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ orden: "recientes", page: 1 }),
      );
    });
  });

  it("filtrar por stock manda el filtro al backend y vuelve a página 1", async () => {
    const user = userEvent.setup();
    renderEnPagina3();
    await screen.findByText("Reloj Clásico");

    await user.selectOptions(screen.getByLabelText("Stock"), "sin");

    // El filtro recorre el catálogo entero en la base — nunca las 50 filas de
    // la página — y la página 3 del resultado anterior no tiene por qué
    // existir en el nuevo.
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ admin: true, stock: "sin", page: 1 }),
      );
    });
  });

  it("filtrar por categoría manda el id al backend", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    await user.selectOptions(await screen.findByLabelText("Categoría"), "3");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ admin: true, categoria: "3", page: 1 }),
      );
    });
  });

  it("el select de etiquetas se llena con las etiquetas EN USO, no con sugerencias", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    // "Oferta" no está en ninguna lista de sugeridas: solo puede venir del
    // endpoint de etiquetas en uso.
    await user.selectOptions(await screen.findByLabelText("Etiqueta"), "Oferta");

    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith(
        expect.objectContaining({ admin: true, etiqueta: "Oferta", page: 1 }),
      );
    });
  });

  it("cambiar un filtro limpia la selección de checkboxes", async () => {
    const user = userEvent.setup();
    renderPagina();
    await screen.findByText("Reloj Clásico");

    const checkboxFila = screen.getByRole("checkbox", {
      name: "Seleccionar Reloj Clásico",
    });
    await user.click(checkboxFila);
    expect(checkboxFila).toBeChecked();

    await user.selectOptions(screen.getByLabelText("Stock"), "bajo");

    // Las filas cambian bajo los pies: aplicar una acción masiva sobre ids
    // que ya no están en pantalla es el accidente que esta limpieza evita.
    // Se re-consulta el checkbox adentro del waitFor: refiltrar desmonta la
    // tabla (spinner) y la re-monta, así que la referencia de arriba queda
    // apuntando a un nodo desconectado que conserva su `checked` viejo.
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Seleccionar Reloj Clásico" }),
      ).not.toBeChecked(),
    );
  });
});

describe("AdminProductos - destacado", () => {
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






});

/**
 * La columna "Acciones" se eliminó: para entrar a la ficha se clickea el
 * producto, y el borrado individual vive adentro del editor.
 *
 * **El borrado en lote por checkbox NO se fue.** Es una acción distinta, con su
 * propia confirmación y su propio informe de rechazados; lo que se quitó es el
 * botón por fila. Hay un test más abajo que lo fija, porque "se sacó el
 * eliminar" es exactamente la lectura que llevaría a barrer los dos.
 */
describe("AdminProductos — el producto se abre clickeándolo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(
      pagina([
        {
          ...PRODUCTO,
          fotos: [{ id: 9, url: "https://cdn/portada.jpg", orden: 0 }],
          cantidadFotos: 1,
        },
      ]),
    );
  });

  it("el nombre es un link a la ficha", async () => {
    renderPagina();

    const link = await screen.findByRole("link", { name: "Reloj Clásico" });
    expect(link).toHaveAttribute("href", "/catalogo/admin/productos/1/editar");
  });

  it("la foto también lleva a la ficha, con nombre accesible propio", async () => {
    renderPagina();

    const link = await screen.findByRole("link", { name: "Editar Reloj Clásico" });
    expect(link).toHaveAttribute("href", "/catalogo/admin/productos/1/editar");
  });

  it("ya no hay columna Acciones ni botón de borrado por fila", async () => {
    renderPagina();

    await screen.findByText("Reloj Clásico");
    expect(screen.queryByRole("columnheader", { name: "Acciones" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Eliminar Reloj Clásico" }),
    ).not.toBeInTheDocument();
    // El link de edición existe, pero como link sobre el producto — no como el
    // ícono suelto de la columna que se fue.
    expect(screen.queryByRole("link", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("el borrado en lote por checkbox sigue existiendo", async () => {
    const user = userEvent.setup();
    renderPagina();

    await user.click(await screen.findByLabelText("Seleccionar Reloj Clásico"));

    expect(screen.getByRole("button", { name: "Eliminar seleccionados" })).toBeInTheDocument();
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
        orden: "catalogo",
        pageSize: 50,
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
        orden: "catalogo",
        pageSize: 50,
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
        orden: "catalogo",
        pageSize: 50,
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

describe("AdminProductos — tabla apilada en mobile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    productsApi.getProducts.mockResolvedValue(pagina([{ ...PRODUCTO }]));
  });

  it("la tabla está apilable: cada celda declara su columna o su tipo", async () => {
    renderPagina();

    await screen.findByText("Reloj Clásico");
    esperarTablaApilada(screen.getByRole("table"));
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
        orden: "catalogo",
        pageSize: 50,
      });
    });
    expect(screen.getByRole("searchbox", { name: /buscar productos/i })).toHaveValue("reloj");
  });

  it("navegar a la ruta sin ?search= limpia el input y NO resucita el término borrado", async () => {
    // El link "Productos" del sidebar navega a la misma ruta sin `?search=`.
    // El componente no se desmonta, así que el estado local del input
    // conservaba el término y el debounce lo volvía a escribir en la URL
    // 350 ms después: la tabla quedaba filtrada aunque el admin "salió".
    const user = userEvent.setup();

    // Réplica mínima del sidebar: un link a la ruta pelada + la URL visible
    // para poder afirmar sobre ella.
    function AppConNavegacion() {
      const navigate = useNavigate();
      const location = useLocation();
      return (
        <>
          <button type="button" onClick={() => navigate("/catalogo/admin/productos")}>
            Ir a Productos
          </button>
          <span data-testid="url-actual">{`${location.pathname}${location.search}`}</span>
          <AdminProductos />
        </>
      );
    }

    render(
      <MemoryRouter initialEntries={["/catalogo/admin/productos?search=reloj"]}>
        <AppConNavegacion />
      </MemoryRouter>,
    );

    const input = screen.getByRole("searchbox", { name: /buscar productos/i });
    expect(input).toHaveValue("reloj");

    await user.click(screen.getByRole("button", { name: "Ir a Productos" }));

    // El input adopta el valor de la URL (vacío) en vez de conservar el suyo.
    await waitFor(() => expect(input).toHaveValue(""));

    // Y pasado el debounce, la URL sigue limpia: el término NO vuelve solo.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(screen.getByTestId("url-actual")).toHaveTextContent(/^\/catalogo\/admin\/productos$/);

    // Tipear después de la navegación sigue funcionando con su debounce.
    await user.type(input, "mesa");
    await waitFor(() => {
      expect(productsApi.getProducts).toHaveBeenCalledWith({
        admin: true,
        page: 1,
        search: "mesa",
        orden: "catalogo",
        pageSize: 50,
      });
    });
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
        orden: "catalogo",
        pageSize: 50,
      });
    });
  });
});
