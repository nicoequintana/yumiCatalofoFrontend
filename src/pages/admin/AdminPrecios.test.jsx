import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminPrecios from "./AdminPrecios.jsx";
import * as productsApi from "../../api/products.js";

vi.mock("../../api/products.js");

/**
 * El contrato central de la pantalla: **lo que se muestra en la confirmación es
 * exactamente lo que se va a escribir al aplicar.**
 *
 * Lo rompe un costo que el backend no tiene. La previsualización se arma con
 * `filas`, que ya llevan los borradores aplicados; el backend, en cambio,
 * recalcula desde el `costo`/`coeficiente` PERSISTIDOS, porque `precios-masivo`
 * solo recibe `{ids, coeficiente}`.
 *
 * La guarda es CONSERVADORA y síncrona: cualquier fila seleccionada con un
 * borrador sin escribir —o con un PATCH en vuelo— bloquea el diálogo. Tiene un
 * costo conocido y aceptado: `CeldaEditable` guarda al salir del campo, así que
 * el click en "Actualizar precios" ES ese blur y el primer click del flujo
 * normal se rechaza. Se pagó esa fricción a propósito, después de que la
 * alternativa —esperar los guardados en vuelo y encadenar escrituras— filtrara
 * un `coeficiente: ""` al backend, que lo mapea a `null` y deja el producto en
 * "Sin costo" sin un solo error.
 */

function pagina(filas) {
  return { data: filas, page: 1, pageSize: 100, total: filas.length };
}

const TERMO = {
  id: 1,
  nombre: "Termo",
  sku: "YIMA-TER-1",
  precio: "3075",
  costo: "1500",
  coeficiente: "2.05",
  fotos: [],
  cantidadFotos: 0,
  stock: 5,
  visibleEnCatalogo: true,
  destacado: false,
};

function renderPagina() {
  return render(
    <MemoryRouter>
      <AdminPrecios />
    </MemoryRouter>,
  );
}

function botonAplicar() {
  return screen.getByRole("button", { name: /actualizar precios/i });
}

/** Selecciona el Termo y le tipea un costo nuevo, sin salir del campo. */
async function tipearCostoNuevo(usuario) {
  await screen.findByText("Termo");
  await usuario.click(screen.getByLabelText("Seleccionar Termo"));

  const campoCosto = screen.getByLabelText("Costo de Termo");
  await usuario.clear(campoCosto);
  await usuario.type(campoCosto, "2000");
}

beforeEach(() => {
  // `resetAllMocks` y no `clearAllMocks`: el segundo limpia las llamadas pero
  // NO vacía la cola de `mockImplementationOnce`. Un `once` que un test no
  // llegó a consumir —porque falló antes— se lo come el test siguiente, y ahí
  // aparece un `updateCosteo` que nunca resuelve en una prueba que no lo pidió.
  vi.resetAllMocks();
  productsApi.getProducts.mockResolvedValue(pagina([TERMO]));
  productsApi.updateCosteo.mockResolvedValue({ costo: "2000", coeficiente: "2.05" });
  productsApi.aplicarPreciosMasivo.mockResolvedValue({ actualizados: 1, rechazados: [] });
});

describe("AdminPrecios — un costo sin escribir bloquea la previsualización", () => {
  it("un borrador en una fila seleccionada bloquea el diálogo y NOMBRA la fila", async () => {
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);

    // Este click ES el blur del campo: dispara el PATCH, pero cuando corre el
    // handler el valor todavía no está en el backend. Previsualizar acá
    // mostraría un precio calculado desde un costo que el servidor no tiene.
    await usuario.click(botonAplicar());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Nombrado: un "hay cambios sin guardar" a secas obliga a barrer la tabla a
    // mano para encontrarlos.
    expect(screen.getByRole("status")).toHaveTextContent(
      /Hay costos sin guardar en la selección \(Termo\)/,
    );
    expect(productsApi.aplicarPreciosMasivo).not.toHaveBeenCalled();
  });

  it("con el valor ya guardado, el diálogo abre con el número persistido", async () => {
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.tab();
    await waitFor(() => expect(productsApi.updateCosteo).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("sin guardar")).not.toBeInTheDocument());

    await usuario.click(botonAplicar());

    // 2000 × 2,05 = 4100, redondeado al peso: el mismo número que el backend va
    // a escribir, porque sale del costo que el servidor confirmó.
    expect(await screen.findByRole("dialog")).toHaveTextContent("4.100");
  });

  it("el segundo click del flujo normal abre el diálogo: la fricción es de uno solo", async () => {
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    // El primero rebota (es el blur), el segundo ya encuentra el costo escrito.
    await usuario.click(botonAplicar());
    await waitFor(() => expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1));
    await usuario.click(botonAplicar());

    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent("4.100");
    // El aviso del intento bloqueado queda TAPADO por el diálogo: dejarlo lo
    // hace leer como vigente cuando ya se resolvió.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("un costo tipeado y devuelto a su valor original no bloquea nada", async () => {
    const usuario = userEvent.setup();
    renderPagina();

    await screen.findByText("Termo");
    await usuario.click(screen.getByLabelText("Seleccionar Termo"));

    // El borrador existe pero coincide con lo persistido: se descarta sin
    // PATCH. Esa fila está sincronizada con el backend, así que tratarla como
    // pendiente sería bloquear por un cambio que nadie hizo.
    const campoCosto = screen.getByLabelText("Costo de Termo");
    await usuario.clear(campoCosto);
    await usuario.type(campoCosto, "1500");

    await usuario.click(botonAplicar());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(productsApi.updateCosteo).not.toHaveBeenCalled();
  });
});

/**
 * Un PATCH que falla conserva el borrador a propósito —perder lo tipeado por un
 * error de red sería peor que dejarlo a la vista— y ese borrador es, sin
 * ninguna maquinaria extra, lo que sigue bloqueando la previsualización:
 * mientras el backend tenga el costo viejo, el precio que se mostraría no es el
 * que se va a escribir.
 */
describe("AdminPrecios — un costeo que falló sigue bloqueando, y se destraba solo", () => {
  it("informa el fallo y CONSERVA el borrador a la vista", async () => {
    productsApi.updateCosteo.mockRejectedValue(new Error("No se pudo guardar el costeo."));
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.tab();

    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(/No se pudo guardar el costeo/),
    );
    // Perder lo tipeado por un error de red sería peor que dejarlo para
    // reintentar — y ese borrador es, sin ninguna maquinaria extra, lo que
    // sigue bloqueando la previsualización.
    expect(screen.getByLabelText("Costo de Termo")).toHaveValue("2000");
    expect(screen.getByText("sin guardar")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("el segundo intento sigue bloqueado y nombra la fila, sin un PATCH nuevo", async () => {
    productsApi.updateCosteo.mockRejectedValue(new Error("No se pudo guardar el costeo."));
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.click(botonAplicar());
    await waitFor(() => expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1));

    // Sin foco en la fila, este click no es el blur de nada: no dispara un
    // PATCH y el bloqueo tiene que sostenerse por el borrador que quedó.
    await usuario.click(botonAplicar());

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      /Hay costos sin guardar en la selección \(Termo\)/,
    );
    expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1);
  });

  it("el reintento exitoso destraba la fila", async () => {
    productsApi.updateCosteo
      .mockRejectedValueOnce(new Error("No se pudo guardar el costeo."))
      .mockResolvedValueOnce({ costo: "2500", coeficiente: "2.05" });
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.click(botonAplicar());
    await waitFor(() => expect(screen.getByRole("status")).toBeInTheDocument());

    const campoCosto = screen.getByLabelText("Costo de Termo");
    await usuario.clear(campoCosto);
    await usuario.type(campoCosto, "2500");
    await usuario.tab();
    await waitFor(() => expect(screen.queryByText("sin guardar")).not.toBeInTheDocument());

    await usuario.click(botonAplicar());

    // 2500 × 2,05 = 5125.
    expect(await screen.findByRole("dialog")).toHaveTextContent("5.125");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("deshacer el cambio destraba la fila, sin volver a pedirle nada al servidor", async () => {
    productsApi.updateCosteo.mockRejectedValueOnce(new Error("No se pudo guardar el costeo."));
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.click(botonAplicar());
    await waitFor(() => expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1));

    // Se deshace el cambio: el borrador vuelve al valor que el backend ya tiene
    // y se descarta sin PATCH. Pantalla y servidor quedan sincronizados y no
    // queda NADA para corregir, así que la fila no puede seguir bloqueando.
    const campoCosto = screen.getByLabelText("Costo de Termo");
    await usuario.clear(campoCosto);
    await usuario.type(campoCosto, "1500");
    await usuario.tab();
    // Segundo tab: se sale de la fila del todo. Si el foco quedara en una celda
    // de esta fila, el click en "Actualizar precios" sería su blur y ese
    // guardado vacío enmascararía el bloqueo — el test pasaría sin arreglar
    // nada.
    await usuario.tab();

    await usuario.click(botonAplicar());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    // Solo el PATCH que falló: deshacer no vuelve a escribir.
    expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1);
  });

  it("recargar la página lo olvida: sin borrador no hay nada que corregir", async () => {
    productsApi.getProducts.mockResolvedValue({
      data: [TERMO],
      page: 1,
      pageSize: 100,
      total: 150,
    });
    productsApi.updateCosteo.mockRejectedValue(new Error("No se pudo guardar el costeo."));
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.tab();
    // Por texto y no por `role="status"`: con más de una página, el aviso de
    // "Vista parcial" (`Advertencia`) también es un `status` y la consulta por
    // rol encontraría dos.
    await screen.findByText(/No se pudo guardar el costeo/);

    // Ir y volver recarga: los borradores se descartan y lo que queda en
    // pantalla es lo que contestó el servidor.
    await usuario.click(screen.getByRole("button", { name: "Página 2" }));
    await usuario.click(await screen.findByRole("button", { name: "Página 1" }));
    await waitFor(() => expect(screen.getByLabelText("Costo de Termo")).toHaveValue("1500"));

    await usuario.click(screen.getByLabelText("Seleccionar Termo"));
    await usuario.click(botonAplicar());

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

/**
 * Un blur, un PATCH. Lo que se tipea mientras el pedido viaja NO se escribe
 * solo: queda como borrador a la vista y lo manda el próximo blur.
 *
 * Los dos tests de acá abajo cubren los dos modos de falla opuestos de esa
 * ventana, y ninguno de los dos avisa cuando ocurre:
 *
 * - **descartar el borrador al resolver** se lleva puesto el valor tipeado, y
 *   la tabla vuelve al número viejo sin un solo error;
 * - **encadenar una segunda escritura** manda el borrador VIVO, que en medio de
 *   un retipeo puede ser la cadena vacía — y `validarCostoYCoeficiente` la mapea
 *   a `null`, así que el producto cae a "Sin costo" en el catálogo.
 */
describe("AdminPrecios — lo tipeado durante un PATCH en vuelo ni se pierde ni se escribe a medias", () => {
  it("el valor nuevo sobrevive al PATCH en vuelo y lo escribe el blur siguiente", async () => {
    let resolverPrimero;
    productsApi.updateCosteo
      .mockImplementationOnce(
        () =>
          new Promise((resolver) => {
            resolverPrimero = resolver;
          }),
      )
      .mockResolvedValueOnce({ costo: "2000", coeficiente: "3" });

    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    // Tabular al coeficiente ES el guardado del costo, y sale con el
    // coeficiente viejo.
    await usuario.tab();
    await waitFor(() => expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1));
    expect(productsApi.updateCosteo).toHaveBeenNthCalledWith(1, 1, {
      costo: "2000",
      coeficiente: "2.05",
    });

    const campoCoeficiente = screen.getByLabelText("Coeficiente de Termo");
    await usuario.clear(campoCoeficiente);
    await usuario.type(campoCoeficiente, "3");

    // Este click es el blur del coeficiente con el PATCH anterior TODAVÍA en
    // vuelo: no dispara un pedido por su cuenta, y bloquea.
    await usuario.click(botonAplicar());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await act(async () => {
      resolverPrimero({ costo: "2000", coeficiente: "2.05" });
    });

    // El borrador NO se descarta con la respuesta del primer PATCH, porque ya
    // no es el valor que ese PATCH mandó. Antes se descartaba entero y el 3 se
    // perdía sin error y sin aviso.
    expect(screen.getByLabelText("Coeficiente de Termo")).toHaveValue("3");
    expect(screen.getByText("sin guardar")).toBeInTheDocument();
    expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1);

    // Y lo escribe el blur SIGUIENTE, no una escritura encadenada. Hay que
    // volver al campo: el click anterior se llevó el foco al botón, así que un
    // `tab()` suelto no sería el blur de ninguna celda.
    await usuario.click(screen.getByLabelText("Coeficiente de Termo"));
    await usuario.tab();
    await waitFor(() => expect(productsApi.updateCosteo).toHaveBeenCalledTimes(2));
    expect(productsApi.updateCosteo).toHaveBeenNthCalledWith(2, 1, {
      costo: "2000",
      coeficiente: "3",
    });

    await usuario.click(botonAplicar());
    // 2000 × 3 = 6000.
    const dialogo = await screen.findByRole("dialog");
    expect(dialogo).toHaveTextContent("6.000");
    expect(dialogo).not.toHaveTextContent("4.100");
  });

  it("un campo vaciado para retipearlo NUNCA viaja al backend", async () => {
    let resolverPrimero;
    productsApi.updateCosteo.mockImplementationOnce(
      () =>
        new Promise((resolver) => {
          resolverPrimero = resolver;
        }),
    );

    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.tab();
    await waitFor(() => expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1));

    // Se borra el coeficiente para escribirlo de nuevo. El borrador vale ""
    // durante esta ventana; el PATCH en vuelo resuelve justo ahí.
    await usuario.clear(screen.getByLabelText("Coeficiente de Termo"));
    await act(async () => {
      resolverPrimero({ costo: "2000", coeficiente: "2.05" });
    });

    // Un `coeficiente: ""` llega al backend como `null` y deja el producto en
    // "Sin costo", sin error y sin nada en pantalla que lo delate. Ninguna
    // escritura derivada puede existir para que eso sea imposible.
    //
    // Ojo con el matiz: vaciar el campo y SALIR de él es un gesto deliberado y
    // sí tiene que escribir `null`. Lo que no puede ocurrir es que ese valor a
    // medio tipear viaje sin que nadie haya salido del campo — por eso el test
    // nunca blurea el coeficiente.
    expect(productsApi.updateCosteo).toHaveBeenCalledTimes(1);
    for (const [, cuerpo] of productsApi.updateCosteo.mock.calls) {
      expect(cuerpo.coeficiente).not.toBe("");
      expect(cuerpo.costo).not.toBe("");
    }
    expect(screen.getByText("sin guardar")).toBeInTheDocument();
  });
});

/**
 * El panel de informe decide qué rama renderizar por la verdad de
 * `informe.error`. Un `throw` que no es `Error` —un string suelto, el objeto de
 * un SDK, un `undefined`— deja ese campo en `undefined`, la rama de error se lee
 * como falsa y la pantalla anuncia un éxito que no ocurrió.
 */
describe("AdminPrecios — un rechazo sin `message` nunca se lee como un éxito", () => {
  it("al guardar el costo", async () => {
    productsApi.updateCosteo.mockRejectedValue("se cayó la red");
    const usuario = userEvent.setup();
    renderPagina();

    await tipearCostoNuevo(usuario);
    await usuario.tab();

    const aviso = await screen.findByRole("status");
    expect(aviso).not.toHaveTextContent(/undefined/);
    expect(aviso).toHaveTextContent(/No se pudo guardar el costo/);
  });

  it("al aplicar los precios, y además cierra el diálogo", async () => {
    // Rechazo NULO: `err.message` lanzaría DENTRO del catch, el rechazo
    // escaparía de un `onClick` async —que nadie atrapa— y el diálogo quedaría
    // abierto con "Confirmar" vivo y sin una sola señal en pantalla.
    productsApi.aplicarPreciosMasivo.mockRejectedValue(undefined);
    const usuario = userEvent.setup();
    renderPagina();

    await screen.findByText("Termo");
    await usuario.click(screen.getByLabelText("Seleccionar Termo"));
    // Coeficiente masivo: 1500 × 3 = 4500 ≠ 3075, así que hay un cambio real y
    // el botón "Confirmar" no queda deshabilitado.
    await usuario.type(screen.getByLabelText(/coeficiente$/i), "3");
    await usuario.click(botonAplicar());

    await screen.findByRole("dialog");
    await usuario.click(screen.getByRole("button", { name: "Confirmar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const aviso = screen.getByRole("status");
    expect(aviso).not.toHaveTextContent(/undefined/);
    expect(aviso).not.toHaveTextContent(/Se actualizaron/);
    expect(aviso).toHaveTextContent(/No se pudo guardar el costo/);
  });
});
